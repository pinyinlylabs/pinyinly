import {
  nextReviewForOtherSkillMistake,
  skillsToReReviewForHanziGlossMistake,
  skillsToReReviewForHanziPinyinMistake,
} from "@/data/mistakes";
import type {
  HanziGlossMistakeType,
  HanziPinyinMistakeType,
} from "@/data/model";
import { MistakeKind } from "@/data/model";
import type { SupportedSchema } from "@/data/rizzleSchema";
import { rPinyinInitialGroupId, v7 as schema } from "@/data/rizzleSchema";
import type {
  ClientStateNotFoundResponse,
  Cookie,
  MutateHandler,
  PullOkResponse,
  PullRequest,
  PushRequest,
  PushResponse,
  ReplicacheMutation,
  RizzleDrizzleMutators,
  VersionNotSupportedResponse,
} from "@/util/rizzle";
import {
  makeDrizzleMutationHandler,
  pushRequestSchema,
  replicacheMutationSchema,
} from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import { startSpan } from "@sentry/core";
import makeDebug from "debug";
import { and, eq, gt, inArray, sql } from "drizzle-orm";
import chunk from "lodash/chunk";
import mapValues from "lodash/mapValues";
import pickBy from "lodash/pickBy";
import type { z } from "zod/v4";
import * as s from "../../schema";
import type { Drizzle } from "../db";
import {
  assertMinimumIsolationLevel,
  json_build_object,
  json_object_agg,
  pgBatchUpdate,
  withRepeatableReadTransaction,
  xmin,
} from "../db";
import { updateSkillState } from "../queries";

const loggerName = import.meta.filename.split(`/`).at(-1);
invariant(loggerName != null);
const debug = makeDebug(loggerName);

const mutators: RizzleDrizzleMutators<SupportedSchema, Drizzle> = {
  async rateSkill(db, userId, { id, skill, rating, durationMs, now }) {
    await db
      .insert(s.skillRating)
      .values([{ id, userId, skill, rating, durationMs, createdAt: now }]);

    await updateSkillState(db, skill, userId);
  },
  async saveHanziGlossMistake(
    db,
    userId,
    { id, gloss, hanziOrHanziWord, now },
  ) {
    await db
      .insert(s.hanziGlossMistake)
      .values([{ id, userId, gloss, hanziOrHanziWord, createdAt: now }]);

    // Apply mistake effect to in-scope skills.
    const mistake: HanziGlossMistakeType = {
      kind: MistakeKind.HanziGloss,
      gloss,
      hanziOrHanziWord,
    };
    const skillsToReview = await skillsToReReviewForHanziGlossMistake(mistake);

    // Find any existing skills for the user that should be reviewed again.
    const skillStates = await db.query.skillState.findMany({
      where: (t) =>
        and(eq(t.userId, userId), inArray(t.skill, [...skillsToReview])),
    });

    await pgBatchUpdate(db, {
      whereColumn: s.skillState.id,
      setColumn: s.skillState.srs,
      updates: skillStates.map((skillState) => [
        skillState.id,
        nextReviewForOtherSkillMistake(skillState.srs, now),
      ]),
    });
  },
  async saveHanziPinyinMistake(
    db,
    userId,
    { id, pinyin, hanziOrHanziWord, now },
  ) {
    await db
      .insert(s.hanziPinyinMistake)
      .values([{ id, userId, pinyin, hanziOrHanziWord, createdAt: now }]);

    // Apply mistake effect to in-scope skills.
    const mistake: HanziPinyinMistakeType = {
      kind: MistakeKind.HanziPinyin,
      pinyin,
      hanziOrHanziWord,
    };
    const skillsToReview = await skillsToReReviewForHanziPinyinMistake(mistake);

    // Find any existing skills for the user that should be reviewed again.
    const skillStates = await db.query.skillState.findMany({
      where: (t) =>
        and(eq(t.userId, userId), inArray(t.skill, [...skillsToReview])),
    });

    await pgBatchUpdate(db, {
      whereColumn: s.skillState.id,
      setColumn: s.skillState.srs,
      updates: skillStates.map((skillState) => [
        skillState.id,
        nextReviewForOtherSkillMistake(skillState.srs, now),
      ]),
    });
  },
  async setPinyinInitialAssociation(db, userId, { initial, name, now }) {
    const updatedAt = now;
    const createdAt = now;
    await db
      .insert(s.pinyinInitialAssociation)
      .values([{ userId, initial, name, updatedAt, createdAt }])
      .onConflictDoUpdate({
        target: [
          s.pinyinInitialAssociation.userId,
          s.pinyinInitialAssociation.initial,
        ],
        set: { name, updatedAt },
      });
  },
  async setPinyinFinalAssociation(db, userId, { final, name, now }) {
    const updatedAt = now;
    const createdAt = now;
    await db
      .insert(s.pinyinFinalAssociation)
      .values([{ userId, final, name, updatedAt, createdAt }])
      .onConflictDoUpdate({
        target: [
          s.pinyinFinalAssociation.userId,
          s.pinyinFinalAssociation.final,
        ],
        set: { name, updatedAt },
      });
  },
  async setPinyinInitialGroupTheme(db, userId, { groupId, themeId, now }) {
    const updatedAt = now;
    const createdAt = now;
    await db
      .insert(s.pinyinInitialGroupTheme)
      .values([{ userId, groupId, themeId, updatedAt, createdAt }])
      .onConflictDoUpdate({
        target: [
          s.pinyinInitialGroupTheme.userId,
          s.pinyinInitialGroupTheme.groupId,
        ],
        set: { themeId, updatedAt },
      });
  },
};

const mutate = makeDrizzleMutationHandler(schema, mutators);

export async function push(
  db: Drizzle,
  userId: string,
  pushRequest: PushRequest,
): Promise<PushResponse> {
  if (pushRequest.pushVersion !== 1) {
    return {
      error: `VersionNotSupported`,
      versionType: `push`,
    } satisfies VersionNotSupportedResponse;
  }

  // Required as per https://doc.replicache.dev/concepts/db-isolation-level
  await assertMinimumIsolationLevel(db, `repeatable read`);

  const mutationRecords: (typeof s.replicacheMutation.$inferInsert)[] = [];

  for (const mutation of pushRequest.mutations) {
    let success;
    let notSkipped;
    try {
      notSkipped = await processMutation(
        db,
        userId,
        pushRequest.clientGroupId,
        pushRequest.schemaVersion,
        mutation,
        false,
        mutate,
      );
      success = true;
    } catch {
      notSkipped = await processMutation(
        db,
        userId,
        pushRequest.clientGroupId,
        pushRequest.schemaVersion,
        mutation,
        true,
        mutate,
      );
      success = false;
    }

    // Save the mutations as a backup in case they need to be replayed later or
    // transferred to another database (e.g. local <-> production).
    //
    // This also needs to be done _last_ so that foreign keys to other tables
    // exist (e.g. client).
    if (notSkipped) {
      mutationRecords.push({
        clientId: mutation.clientId,
        mutationId: mutation.id,
        mutation,
        success,
        processedAt: new Date(),
      });
    }
  }

  if (mutationRecords.length > 0) {
    await db.insert(s.replicacheMutation).values(mutationRecords);
  }
}

type CvrEntity = z.infer<typeof s.cvrEntity>;
type CvrEntities = z.infer<typeof s.cvrEntitiesSchema>;
type CvrEntityDiff = {
  puts: string[];
  dels: string[];
};
type CvrEntitiesDiff = { [K in keyof CvrEntities]?: CvrEntityDiff };

function computeCvrEntitiesDiff(
  prev: CvrEntities,
  all: CvrEntities,
  opLimit = 1000,
): {
  nextEntitiesDiff: CvrEntitiesDiff;
  nextCvrEntities: CvrEntities;
  partial: boolean;
} {
  const next: CvrEntities = {};
  const nextEntitiesDiff: CvrEntitiesDiff = {};
  const entityNames = [
    ...new Set([...Object.keys(prev), ...Object.keys(all)]),
  ] as (keyof CvrEntities)[];

  let opCount = 0;
  // Enforce a finite number of operations to avoid unbounded server work and
  // subsequent request timeouts.
  for (const entityName of entityNames) {
    const prevEntries: CvrEntity = prev[entityName] ?? {};
    const nextEntries = (next[entityName] = { ...prevEntries } as CvrEntity);
    const allEntries = all[entityName] ?? {};
    const puts = [];
    const dels = [];

    for (const [id, value] of Object.entries(allEntries)) {
      if (prevEntries[id] !== allEntries[id]) {
        opCount++;
        if (opCount <= opLimit) {
          nextEntries[id] = value;
          puts.push(id);
        }
      }
    }

    for (const id of Object.keys(prevEntries)) {
      if (allEntries[id] === undefined) {
        opCount++;
        if (opCount <= opLimit) {
          const parts = prevEntries[id]?.match(/^(.+?):(.+)$/);
          invariant(parts != null);
          const [, _xmin, key] = parts;
          invariant(key != null);
          dels.push(key);
          nextEntries[id] = undefined;
        }
      }
    }

    nextEntitiesDiff[entityName] = { puts, dels };
  }
  return {
    nextEntitiesDiff,
    nextCvrEntities: next,
    partial: opCount > opLimit,
  };
}

function diffLastMutationIds(
  prev: Record<string, number>,
  next: Record<string, number>,
) {
  return pickBy(next, (v, k) => prev[k] !== v);
}

function isCvrDiffEmpty(diff: CvrEntitiesDiff) {
  return Object.values(diff).every(
    (e) => e.puts.length === 0 && e.dels.length === 0,
  );
}

function isCvrLastMutationIdsDiffEmpty(diff: Record<string, number>) {
  return Object.keys(diff).length === 0;
}

export async function pull(
  db: Drizzle,
  userId: string,
  pullRequest: PullRequest,
): Promise<
  PullOkResponse | VersionNotSupportedResponse | ClientStateNotFoundResponse
> {
  // Required as per https://doc.replicache.dev/concepts/db-isolation-level
  await assertMinimumIsolationLevel(db, `repeatable read`);

  const { clientGroupId, cookie } = pullRequest;

  // 1: Fetch prevCVR
  const prevCvr =
    cookie == null
      ? null
      : await db.query.replicacheCvr.findFirst({
          where: (p, { eq }) => eq(p.id, cookie.cvrId),
        });

  // 2: Init baseCVR
  // n/a

  // 3: begin transaction
  const txResult = await withRepeatableReadTransaction(db, async (db) => {
    // 4-5: getClientGroup(body.clientGroupID), verify user
    const prevClientGroup = await getClientGroup(db, {
      userId,
      clientGroupId,
      schemaVersion: pullRequest.schemaVersion,
    });
    debug(`%o`, { prevClientGroup });

    // 6: Read all domain data, just ids and versions
    // n/a

    // 7: Read all clients in CG
    const clients = await db.query.replicacheClient.findMany({
      where: (t) => eq(t.clientGroupId, clientGroupId),
    });

    // 8: Build nextCVR
    const allCvrEntities = await computeCvrEntities(db, userId, schema);

    const {
      nextEntitiesDiff: entitiesDiff,
      nextCvrEntities,
      partial,
    } = computeCvrEntitiesDiff(prevCvr?.entities ?? {}, allCvrEntities);

    const nextCvrLastMutationIds = Object.fromEntries(
      clients.map((c) => [c.id, c.lastMutationId]),
    );
    debug(`%o`, { nextCvrEntities, nextCvrLastMutationIds });

    // 9: calculate diffs
    const lastMutationIdsDiff = diffLastMutationIds(
      prevCvr?.lastMutationIds ?? {},
      nextCvrLastMutationIds,
    );
    debug(`%o`, { entitiesDiff, lastMutationIdsDiff });

    // 10: If diff is empty, return no-op PR
    if (
      prevCvr &&
      isCvrDiffEmpty(entitiesDiff) &&
      isCvrLastMutationIdsDiffEmpty(lastMutationIdsDiff)
    ) {
      return null;
    }

    // 11: get entities
    const [
      pinyinFinalAssociations,
      pinyinInitialAssociations,
      pinyinInitialGroupThemes,
      skillStates,
      skillRatings,
      hanziGlossMistakes,
      hanziPinyinMistakes,
    ] = await Promise.all([
      db.query.pinyinFinalAssociation.findMany({
        where: (t) =>
          inArray(t.id, entitiesDiff.pinyinFinalAssociation?.puts ?? []),
      }),
      db.query.pinyinInitialAssociation.findMany({
        where: (t) =>
          inArray(t.id, entitiesDiff.pinyinInitialAssociation?.puts ?? []),
      }),
      db.query.pinyinInitialGroupTheme.findMany({
        where: (t) =>
          inArray(t.id, entitiesDiff.pinyinInitialGroupTheme?.puts ?? []),
      }),
      db.query.skillState.findMany({
        where: (t) => inArray(t.id, entitiesDiff.skillState?.puts ?? []),
      }),
      db.query.skillRating.findMany({
        where: (t) => inArray(t.id, entitiesDiff.skillRating?.puts ?? []),
      }),
      db.query.hanziGlossMistake.findMany({
        where: (t) => inArray(t.id, entitiesDiff.hanziGlossMistake?.puts ?? []),
      }),
      db.query.hanziPinyinMistake.findMany({
        where: (t) =>
          inArray(t.id, entitiesDiff.hanziPinyinMistake?.puts ?? []),
      }),
    ]);
    debug(`%o`, { skillStates, skillRatings });

    // 12: changed clients
    // n/a (done above)

    // 13: newCVRVersion
    const prevCvrVersion = pullRequest.cookie?.order ?? 0;
    const nextCvrVersion =
      Math.max(prevCvrVersion, prevClientGroup.cvrVersion) + 1;

    // 14: Write ClientGroupRecord
    const nextClientGroup = {
      ...prevClientGroup,
      cvrVersion: nextCvrVersion,
    };
    debug(`%o`, { nextClientGroup });
    await putClientGroup(db, nextClientGroup);

    return {
      entityPatches: {
        pinyinInitialAssociation: {
          dels: entitiesDiff.pinyinInitialAssociation?.dels ?? [],
          puts: pinyinInitialAssociations,
        },
        pinyinFinalAssociation: {
          dels: entitiesDiff.pinyinFinalAssociation?.dels ?? [],
          puts: pinyinFinalAssociations,
        },
        pinyinInitialGroupTheme: {
          dels: entitiesDiff.pinyinInitialGroupTheme?.dels ?? [],
          puts: pinyinInitialGroupThemes,
        },
        skillState: {
          dels: entitiesDiff.skillState?.dels ?? [],
          puts: skillStates,
        },
        skillRating: {
          dels: entitiesDiff.skillRating?.dels ?? [],
          puts: skillRatings,
        },
        hanziGlossMistake: {
          dels: entitiesDiff.hanziGlossMistake?.dels ?? [],
          puts: hanziGlossMistakes,
        },
        hanziPinyinMistake: {
          dels: entitiesDiff.hanziPinyinMistake?.dels ?? [],
          puts: hanziPinyinMistakes,
        },
      },
      nextCvr: {
        lastMutationIds: nextCvrLastMutationIds,
        entities: nextCvrEntities,
      },
      lastMutationIdChanges: lastMutationIdsDiff,
      nextCvrVersion,
      partial,
    };
  });

  // 10: If diff is empty, return no-op PR
  if (txResult === null) {
    return {
      cookie: pullRequest.cookie,
      lastMutationIdChanges: {},
      patch: [],
      partial: false,
    };
  }

  const {
    entityPatches,
    nextCvr,
    nextCvrVersion,
    lastMutationIdChanges,
    partial,
  } = txResult;

  // 16-17: store cvr
  const [cvr] = await db
    .insert(s.replicacheCvr)
    .values([
      {
        lastMutationIds: nextCvr.lastMutationIds,
        entities: nextCvr.entities,
      },
    ])
    .returning({ id: s.replicacheCvr.id });
  invariant(cvr != null);

  // 18(i): build patch
  const patch: PullOkResponse[`patch`] = [];
  if (prevCvr == null) {
    patch.push({ op: `clear` });
  }

  // 18(i): dels
  for (const entity of Object.values(entityPatches)) {
    for (const key of entity.dels) {
      patch.push({ op: `del`, key });
    }
  }

  // 18(ii): puts
  if (`skillState` in schema) {
    const e = schema.skillState;
    for (const s of entityPatches.skillState.puts) {
      patch.push({
        op: `put`,
        key: e.marshalKey(s),
        value: e.marshalValue(s),
      });
    }
  }
  if (`skillRating` in schema) {
    const e = schema.skillRating;
    for (const s of entityPatches.skillRating.puts) {
      patch.push({
        op: `put`,
        key: e.marshalKey(s),
        value: e.marshalValue(s),
      });
    }
  }
  if (`hanziGlossMistake` in schema) {
    const e = schema.hanziGlossMistake;
    for (const s of entityPatches.hanziGlossMistake.puts) {
      patch.push({
        op: `put`,
        key: e.marshalKey(s),
        value: e.marshalValue(s),
      });
    }
  }
  if (`hanziPinyinMistake` in schema) {
    const e = schema.hanziPinyinMistake;
    for (const s of entityPatches.hanziPinyinMistake.puts) {
      patch.push({
        op: `put`,
        key: e.marshalKey(s),
        value: e.marshalValue(s),
      });
    }
  }
  if (`pinyinFinalAssociation` in schema) {
    const e = schema.pinyinFinalAssociation;
    for (const s of entityPatches.pinyinFinalAssociation.puts) {
      patch.push({
        op: `put`,
        key: e.marshalKey(s),
        value: e.marshalValue(s),
      });
    }
  }
  if (`pinyinInitialAssociation` in schema) {
    const e = schema.pinyinInitialAssociation;
    for (const s of entityPatches.pinyinInitialAssociation.puts) {
      patch.push({
        op: `put`,
        key: e.marshalKey(s),
        value: e.marshalValue(s),
      });
    }
  }
  if (`pinyinInitialGroupTheme` in schema) {
    const e = schema.pinyinInitialGroupTheme;
    for (const s of entityPatches.pinyinInitialGroupTheme.puts) {
      patch.push({
        op: `put`,
        key: e.marshalKey(s),
        value: e.marshalValue(s),
      });
    }
  }

  // 18(ii): construct cookie
  const nextCookie: Cookie = {
    order: nextCvrVersion,
    cvrId: cvr.id,
  };

  // 17(iii): lastMutationIDChanges
  // n/a

  return {
    cookie: nextCookie,
    lastMutationIdChanges,
    patch,
    partial,
  };
}

// Implements the push algorithm from
// https://doc.replicache.dev/strategies/row-version#push
export async function processMutation(
  db: Drizzle,
  userId: string,
  clientGroupId: string,
  clientGroupSchemaVersion: string,
  mutation: ReplicacheMutation,
  // 1: `let errorMode = false`. In JS, we implement this step naturally
  // as a param. In case of failure, caller will call us again with `true`.
  errorMode: boolean,
  mutate: MutateHandler<Drizzle>,
): Promise<boolean> {
  return await startSpan({ name: processMutation.name }, async () => {
    // 2: beginTransaction
    return await db.transaction(async (db) => {
      debug(`Processing mutation errorMode=%o %o`, errorMode, mutation);

      // 3: `getClientGroup(body.clientGroupID)`
      // 4: Verify requesting user owns cg (in function)
      const clientGroup = await getClientGroup(db, {
        userId,
        clientGroupId,
        schemaVersion: clientGroupSchemaVersion,
      });
      // 5: `getClient(mutation.clientID)`
      // 6: Verify requesting client group owns requested client
      const prevClient = await getClient(db, mutation.clientId, clientGroupId);

      // 7: init nextMutationID
      const nextMutationId = prevClient.lastMutationId + 1;

      // 8: rollback and skip if already processed.
      if (mutation.id < nextMutationId) {
        debug(`Mutation %s has already been processed - skipping`, mutation.id);
        return false;
      }

      // 9: Rollback and error if from future.
      if (mutation.id > nextMutationId) {
        throw new Error(
          `Mutation ${mutation.id} is from the future - aborting`,
        );
      }

      const t1 = Date.now();

      if (!errorMode) {
        try {
          // 10(i): Run business logic
          // 10(i)(a): xmin column is automatically updated by Postgres for any affected rows.
          await mutate(db, userId, mutation);
        } catch (error) {
          // 10(ii)(a-c): log error, abort, and retry
          debug(`Error executing mutation: %o %o`, mutation, error);
          throw error;
        }
      }

      // 11-12: put client and client group
      const nextClient = {
        id: mutation.clientId,
        clientGroupId,
        lastMutationId: nextMutationId,
      };

      await putClientGroup(db, clientGroup);
      await putClient(db, nextClient);

      debug(`Processed mutation in %s`, Date.now() - t1);

      return true;
    });
  });
}

export interface ClientRecord {
  id: string;
  clientGroupId: string;
  lastMutationId: number;
}

export async function putClient(db: Drizzle, client: ClientRecord) {
  const { id, clientGroupId, lastMutationId } = client;

  await db
    .insert(s.replicacheClient)
    .values({
      id,
      clientGroupId,
      lastMutationId,
    })
    .onConflictDoUpdate({
      target: s.replicacheClient.id,
      set: { lastMutationId, updatedAt: new Date() },
    });
}

export interface ClientGroupRecord {
  id: string;
  userId: string;
  schemaVersion: string;
  cvrVersion: number;
}

export async function putClientGroup(
  db: Drizzle,
  clientGroup: ClientGroupRecord,
) {
  const { id, userId, cvrVersion, schemaVersion } = clientGroup;

  await db
    .insert(s.replicacheClientGroup)
    .values({ id, userId, cvrVersion, schemaVersion })
    .onConflictDoUpdate({
      target: s.replicacheClientGroup.id,
      set: { cvrVersion, updatedAt: new Date() },
    });
}

export async function getClientGroup(
  db: Drizzle,
  opts: {
    userId: string;
    clientGroupId: string;
    schemaVersion: string;
  },
): Promise<ClientGroupRecord> {
  const r = await db.query.replicacheClientGroup.findFirst({
    where: (p, { eq }) => eq(p.id, opts.clientGroupId),
  });

  if (!r) {
    return {
      id: opts.clientGroupId,
      userId: opts.userId,
      cvrVersion: 0,
      schemaVersion: opts.schemaVersion,
    };
  }

  if (r.userId !== opts.userId) {
    throw new Error(`Authorization error - user does not own client group`);
  }

  return {
    id: opts.clientGroupId,
    userId: r.userId,
    cvrVersion: r.cvrVersion,
    schemaVersion: r.schemaVersion,
  };
}

export async function getClient(
  db: Drizzle,
  clientId: string,
  clientGroupId: string,
): Promise<ClientRecord> {
  const r = await db.query.replicacheClient.findFirst({
    where: (p, { eq }) => eq(p.id, clientId),
  });

  if (!r) {
    return {
      id: clientId,
      clientGroupId: ``,
      lastMutationId: 0,
    };
  }

  if (r.clientGroupId !== clientGroupId) {
    throw new Error(
      `Authorization error - client does not belong to client group`,
    );
  }

  return {
    id: r.id,
    clientGroupId: r.clientGroupId,
    lastMutationId: r.lastMutationId,
  };
}

export async function computeCvrEntities(
  db: Drizzle,
  userId: string,
  schema: SupportedSchema,
) {
  return await startSpan({ name: computeCvrEntities.name }, async () => {
    const pinyinFinalAssociationVersions = db
      .select({
        map: json_object_agg(
          s.pinyinFinalAssociation.id,
          json_build_object({
            final: s.pinyinFinalAssociation.final,
            xmin: xmin(s.pinyinFinalAssociation),
          }),
        ).as(`pinyinFinalAssociationVersions`),
      })
      .from(s.pinyinFinalAssociation)
      .where(eq(s.pinyinFinalAssociation.userId, userId))
      .as(`pinyinFinalAssociationVersions`);

    const pinyinInitialAssociationVersions = db
      .select({
        map: json_object_agg(
          s.pinyinInitialAssociation.id,
          json_build_object({
            initial: s.pinyinInitialAssociation.initial,
            xmin: xmin(s.pinyinInitialAssociation),
          }),
        ).as(`pinyinInitialAssociationVersions`),
      })
      .from(s.pinyinInitialAssociation)
      .where(eq(s.pinyinInitialAssociation.userId, userId))
      .as(`pinyinInitialAssociationVersions`);

    const pinyinInitialGroupThemeVersions = db
      .select({
        map: json_object_agg(
          s.pinyinInitialGroupTheme.id,
          json_build_object({
            groupId: sql<string>`${s.pinyinInitialGroupTheme.groupId}`,
            xmin: xmin(s.pinyinInitialGroupTheme),
          }),
        ).as(`pinyinInitialGroupThemeVersions`),
      })
      .from(s.pinyinInitialGroupTheme)
      .where(eq(s.pinyinInitialGroupTheme.userId, userId))
      .as(`pinyinInitialGroupThemeVersions`);

    const skillStateVersions = db
      .select({
        map: json_object_agg(
          s.skillState.id,
          json_build_object({
            skill: s.skillState.skill,
            xmin: xmin(s.skillState),
          }),
        ).as(`skillStateVersions`),
      })
      .from(s.skillState)
      .where(eq(s.skillState.userId, userId))
      .as(`skillStateVersions`);

    const skillRatingVersions = db
      .select({
        map: json_object_agg(
          s.skillRating.id,
          json_build_object({
            id: s.skillRating.id,
            xmin: xmin(s.skillRating),
          }),
        ).as(`skillRatingVersions`),
      })
      .from(s.skillRating)
      .where(eq(s.skillRating.userId, userId))
      .as(`skillRatingVersions`);

    const hanziGlossMistakeVersions = db
      .select({
        map: json_object_agg(
          s.hanziGlossMistake.id,
          json_build_object({
            id: s.hanziGlossMistake.id,
            xmin: xmin(s.hanziGlossMistake),
          }),
        ).as(`hanziGlossMistakeVersions`),
      })
      .from(s.hanziGlossMistake)
      .where(eq(s.hanziGlossMistake.userId, userId))
      .as(`hanziGlossMistakeVersions`);

    const hanziPinyinMistakeVersions = db
      .select({
        map: json_object_agg(
          s.hanziPinyinMistake.id,
          json_build_object({
            id: s.hanziPinyinMistake.id,
            xmin: xmin(s.hanziPinyinMistake),
          }),
        ).as(`hanziPinyinMistakeVersions`),
      })
      .from(s.hanziPinyinMistake)
      .where(eq(s.hanziPinyinMistake.userId, userId))
      .as(`hanziPinyinMistakeVersions`);

    const [result] = await db
      .select({
        pinyinFinalAssociation: pinyinFinalAssociationVersions.map,
        pinyinInitialAssociation: pinyinInitialAssociationVersions.map,
        pinyinInitialGroupTheme: pinyinInitialGroupThemeVersions.map,
        skillRating: skillRatingVersions.map,
        skillState: skillStateVersions.map,
        hanziGlossMistake: hanziGlossMistakeVersions.map,
        hanziPinyinMistake: hanziPinyinMistakeVersions.map,
      })
      .from(pinyinFinalAssociationVersions)
      .leftJoin(pinyinInitialAssociationVersions, sql`true`)
      .leftJoin(pinyinInitialGroupThemeVersions, sql`true`)
      .leftJoin(skillRatingVersions, sql`true`)
      .leftJoin(skillStateVersions, sql`true`)
      .leftJoin(hanziGlossMistakeVersions, sql`true`)
      .leftJoin(hanziPinyinMistakeVersions, sql`true`);
    invariant(result != null);

    return {
      pinyinInitialAssociation: mapValues(
        result.pinyinInitialAssociation,
        (v) => v.xmin + `:` + schema.pinyinInitialAssociation.marshalKey(v),
      ),
      pinyinFinalAssociation: mapValues(
        result.pinyinFinalAssociation,
        (v) => v.xmin + `:` + schema.pinyinFinalAssociation.marshalKey(v),
      ),
      pinyinInitialGroupTheme:
        `pinyinInitialGroupTheme` in schema
          ? mapValues(
              result.pinyinInitialGroupTheme,
              (v) =>
                v.xmin +
                `:` +
                schema.pinyinInitialGroupTheme.marshalKey({
                  groupId: rPinyinInitialGroupId().unmarshal(v.groupId),
                }),
            )
          : {},
      skillState: mapValues(
        result.skillState,
        (v) => v.xmin + `:` + schema.skillState.marshalKey(v),
      ),
      skillRating: mapValues(
        result.skillRating,
        (v) => v.xmin + `:` + schema.skillRating.marshalKey(v),
      ),
      hanziGlossMistake: mapValues(
        result.hanziGlossMistake,
        (v) => v.xmin + `:` + schema.hanziGlossMistake.marshalKey(v),
      ),
      hanziPinyinMistake: mapValues(
        result.hanziPinyinMistake,
        (v) => v.xmin + `:` + schema.hanziPinyinMistake.marshalKey(v),
      ),
    };
  });
}

export const fetchedMutationSchema = pushRequestSchema.omit({
  // `profileId` isn't stored in the DB so we can't return it.
  profileId: true,
  // `pushVersion` isn't stored in the DB nor is it really needed as the
  // requester can build their own push request.
  pushVersion: true,
});

export type FetchedMutation = z.infer<typeof fetchedMutationSchema>;

export async function fetchMutations(
  db: Drizzle,
  userId: string,
  opts: {
    schemaVersions: string[];
    lastMutationIds: Record<string, number>;
    limit?: number;
  },
): Promise<{ mutations: FetchedMutation[] }> {
  return await startSpan({ name: fetchMutations.name }, async () => {
    let remainingLimit = opts.limit ?? 100;

    const clientState = await getReplicacheClientStateForUser(db, userId);

    // Compare the state provided by the caller with state from the database to
    // determine which clients have new mutations.
    const clientsWithNewData = clientState.flatMap((c) => {
      // Make sure the client is using a supported schema.
      if (
        c.schemaVersion == null ||
        !opts.schemaVersions.includes(c.schemaVersion)
      ) {
        return [];
      }

      const sinceMutationId = opts.lastMutationIds[c.clientId] ?? 0;
      // Skip the client if it doesn't have newer data than what has already
      // been seen.
      if (sinceMutationId >= c.lastMutationId) {
        return [];
      }

      return {
        client: c,
        clientId: c.clientId,
        clientGroupId: c.clientGroupId,
        schemaVersion: c.schemaVersion,
        lastMutationId: c.lastMutationId,
        sinceMutationId,
      };
    });

    const result: FetchedMutation[] = [];

    for (const client of clientsWithNewData) {
      const mutations = await getReplicacheClientMutationsSince(db, {
        clientId: client.clientId,
        sinceMutationId: client.sinceMutationId,
        limit: remainingLimit,
      });

      result.push({
        clientGroupId: client.clientGroupId,
        schemaVersion: client.schemaVersion,
        mutations,
      });

      remainingLimit -= mutations.length;

      if (remainingLimit <= 0) {
        break;
      }
    }

    return { mutations: result };
  });
}

/**
 * Fetch the current state of the replicache clients from the DB (in terms of
 * their last mutation and schema version) for a given user.
 */
export async function getReplicacheClientStateForUser(
  db: Drizzle,
  userId: string,
) {
  return await db
    .select({
      clientId: s.replicacheClient.id,
      clientGroupId: s.replicacheClient.clientGroupId,
      schemaVersion: s.replicacheClientGroup.schemaVersion,
      lastMutationId: s.replicacheClient.lastMutationId,
    })
    .from(s.replicacheClient)
    .leftJoin(
      s.replicacheClientGroup,
      and(
        eq(s.replicacheClient.clientGroupId, s.replicacheClientGroup.id),
        eq(s.replicacheClientGroup.userId, userId),
      ),
    );
}

/**
 * Get the mutations for a given client that are newer than a given mutation ID.
 */
export async function getReplicacheClientMutationsSince(
  db: Drizzle,
  opts: {
    clientId: string;
    sinceMutationId: number;
    limit?: number;
  },
) {
  const { clientId, sinceMutationId, limit = 20 } = opts;

  const mutationsFromDb = await db.query.replicacheMutation.findMany({
    where: and(
      eq(s.replicacheMutation.clientId, clientId),
      gt(s.replicacheMutation.mutationId, sinceMutationId),
    ),
    orderBy: s.replicacheMutation.mutationId,
    limit,
  });

  // Parse and verify the data.
  const mutations = mutationsFromDb.map((x) =>
    replicacheMutationSchema.parse(x.mutation),
  );

  // Check the invariant that mutations are ordered in ascending
  // order by ID from the database.
  for (let i = 1; i < mutations.length; i++) {
    invariant(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      mutations[i]!.id > mutations[i - 1]!.id,
      `mutations not ordered correctly`,
    );
  }

  return mutations;
}

export async function updateRemoteSyncClientLastMutationId(
  db: Drizzle,
  opts: { remoteSyncId: string; clientId: string; lastMutationId: number },
) {
  await withRepeatableReadTransaction(db, async (db) => {
    // Get a fresh copy since we're overwriting it but we only
    // want to update one key. This could probably be done more
    // efficiently in raw SQL.
    const res = await db.query.remoteSync.findFirst({
      where: eq(s.remoteSync.id, opts.remoteSyncId),
    });
    invariant(res != null, `could not find remoteSync id=${opts.remoteSyncId}`);

    await db
      .update(s.remoteSync)
      .set({
        lastSyncedMutationIds: {
          ...res.lastSyncedMutationIds,
          [opts.clientId]: opts.lastMutationId,
        },
      })
      .where(eq(s.remoteSync.id, opts.remoteSyncId));
  });
}

export async function pushChunked(
  db: Drizzle,
  userId: string,
  input: PushRequest,
) {
  // Commit mutations in batches, rather than trying to do it all at once
  // and timing out or locking the database. Each batch can be processed and
  // committed separately.
  for (const batch of chunk(input.mutations, 2)) {
    const inputBatch: typeof input = {
      ...input,
      mutations: batch,
    };

    const result = await withRepeatableReadTransaction(
      db,
      async (db) => await push(db, userId, inputBatch),
    );

    // Return any errors immediately
    if (result != null) {
      return result;
    }
  }
}

/**
 * Find the new remote client IDs that we haven't seen before and add them to
 * the remoteSync record.
 */
export async function ignoreRemoteClientForRemoteSync(
  db: Drizzle,
  remoteSyncId: string,
  clientIds: string[],
) {
  await withRepeatableReadTransaction(db, async (db) => {
    const freshRemoteSync = await db.query.remoteSync.findFirst({
      where: eq(s.remoteSync.id, remoteSyncId),
    });
    invariant(freshRemoteSync != null, `remoteSync not found`);

    const knownRemoteClientIds = new Set(freshRemoteSync.pulledClientIds);

    const newRemoteClientIds = clientIds.filter(
      (x) => !knownRemoteClientIds.has(x),
    );

    if (newRemoteClientIds.length > 0) {
      await db
        .update(s.remoteSync)
        .set({
          pulledClientIds: [...knownRemoteClientIds, ...newRemoteClientIds],
        })
        .where(eq(s.remoteSync.id, remoteSyncId));
    }
  });
}
