import {
  rFsrsRating,
  rPinyinInitialGroupId,
  SupportedSchema,
  v3,
  v4,
} from "@/data/rizzleSchema";
import {
  ClientStateNotFoundResponse,
  Cookie,
  makeDrizzleMutationHandler,
  MutateHandler,
  Mutation,
  PullOkResponse,
  PullRequest,
  PushRequest,
  PushResponse,
  RizzleDrizzleMutators,
  VersionNotSupportedResponse,
} from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import makeDebug from "debug";
import { eq, inArray, sql } from "drizzle-orm";
import mapValues from "lodash/mapValues";
import pickBy from "lodash/pickBy";
import { DatabaseError } from "pg-protocol";
import { z } from "zod";
import * as s from "../schema";
import type { Drizzle } from "./db";
import {
  assertMinimumIsolationLevel,
  json_build_object,
  json_object_agg,
} from "./db";
import { updateSkillState } from "./queries";

const loggerName = import.meta.filename.split(`/`).slice(-1)[0];
invariant(loggerName != null);
const debug = makeDebug(loggerName);

const mutators: RizzleDrizzleMutators<SupportedSchema, Drizzle> = {
  async initSkillState(db, userId, { skill, now }) {
    await db
      .insert(s.skillState)
      .values({
        userId,
        skill,
        srs: null,
        dueAt: now,
        createdAt: now,
      })
      .onConflictDoNothing();
  },
  async reviewSkill(db, userId, { skill, rating, now }) {
    await db.insert(s.skillRating).values([
      {
        userId,
        skill,
        rating: rFsrsRating.marshal(rating),
        createdAt: now,
      },
    ]);

    await updateSkillState(db, skill, userId);
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

const mutateV3 = makeDrizzleMutationHandler(v3, mutators);
const mutateV4 = makeDrizzleMutationHandler(v4, mutators);

function getSchemaImpl(schemaVersion: string) {
  if (schemaVersion === v3.version) {
    return { schema: v3, mutate: mutateV3 };
  } else if (schemaVersion === v4.version) {
    return { schema: v4, mutate: mutateV4 };
  }
  return null;
}

export async function push(
  tx: Drizzle,
  userId: string,
  push: PushRequest,
): Promise<PushResponse> {
  const mutate = getSchemaImpl(push.schemaVersion)?.mutate;
  if (mutate == null) {
    return {
      error: `VersionNotSupported`,
      versionType: `schema`,
    } satisfies VersionNotSupportedResponse;
  }

  if (push.pushVersion !== 1) {
    return {
      error: `VersionNotSupported`,
      versionType: `push`,
    } satisfies VersionNotSupportedResponse;
  }

  // Required as per https://doc.replicache.dev/concepts/db-isolation-level
  await assertMinimumIsolationLevel(tx, `repeatable read`);

  for (const mutation of push.mutations) {
    let success;
    try {
      await processMutation(
        tx,
        userId,
        push.clientGroupId,
        mutation,
        false,
        mutate,
      );
      success = true;
    } catch (err) {
      await processMutation(
        tx,
        userId,
        push.clientGroupId,
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
    await tx.insert(s.replicacheMutation).values([
      {
        clientId: mutation.clientId,
        mutation,
        success,
      },
    ]);
  }
}

const cvrEntriesSchema = z
  .object({
    pinyinInitialAssociation: z.record(z.string()),
    pinyinFinalAssociation: z.record(z.string()),
    pinyinInitialGroupTheme: z.record(z.string()),
    skillState: z.record(z.string()),
    skillRating: z.record(z.string()),
  })
  .partial();

type CvrEntities = z.infer<typeof cvrEntriesSchema>;

export type CvrEntitiesDiff = { [K in keyof CvrEntities]?: CvrEntityDiff };
export type CvrEntityDiff = {
  puts: string[];
  dels: string[];
};

function diffLastMutationIds(
  prev: Record<string, number>,
  next: Record<string, number>,
) {
  return pickBy(next, (v, k) => prev[k] !== v);
}

function diffCvrEntities(
  prev: CvrEntities,
  next: CvrEntities,
): CvrEntitiesDiff {
  const r: CvrEntitiesDiff = {};
  const names = [
    ...new Set([...Object.keys(prev), ...Object.keys(next)]),
  ] as (keyof CvrEntities)[];
  for (const name of names) {
    const prevEntries = prev[name] ?? {};
    const nextEntries = next[name] ?? {};
    r[name] = {
      puts: Object.keys(nextEntries).filter(
        (id) =>
          prevEntries[id] === undefined || prevEntries[id] !== nextEntries[id],
      ),
      dels: Object.keys(prevEntries)
        .filter((id) => nextEntries[id] === undefined)
        .map((id) => {
          const parts = prevEntries[id]?.match(/^(.+?):(.+)$/);
          invariant(parts != null);
          const [, _xmin, key] = parts;
          invariant(key != null);
          return key;
        }),
    };
  }
  return r;
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
  tx: Drizzle,
  userId: string,
  pull: PullRequest,
): Promise<
  PullOkResponse | VersionNotSupportedResponse | ClientStateNotFoundResponse
> {
  const schema = getSchemaImpl(pull.schemaVersion)?.schema;
  if (schema == null) {
    return {
      error: `VersionNotSupported`,
      versionType: `schema`,
    } satisfies VersionNotSupportedResponse;
  }

  // Required as per https://doc.replicache.dev/concepts/db-isolation-level
  await assertMinimumIsolationLevel(tx, `repeatable read`);

  const { clientGroupId, cookie } = pull;

  // 1: Fetch prevCVR
  const prevCvr =
    cookie != null
      ? await tx.query.replicacheCvr.findFirst({
          where: (p, { eq }) => eq(p.id, cookie.cvrId),
        })
      : null;

  // 2: Init baseCVR
  // n/a

  async function withSerializationRetries<T>(
    result: Promise<T>,
    retryCount = 3,
  ): Promise<T> {
    for (
      let remainingRetries = retryCount;
      remainingRetries > 0;
      remainingRetries--
    ) {
      try {
        return await result;
      } catch (e) {
        if (e instanceof DatabaseError && e.code === `40001`) {
          // Serialization failure, retry
          if (remainingRetries === 0) {
            throw e;
          }
        }
      }
    }

    return await result;
  }

  // 3: begin transaction
  const txResult = await withSerializationRetries(
    tx.transaction(async (tx) => {
      // 4-5: getClientGroup(body.clientGroupID), verify user
      const prevClientGroup = await getClientGroup(tx, {
        userId,
        clientGroupId,
      });
      debug(`%o`, { prevClientGroup });

      // 6: Read all domain data, just ids and versions
      // n/a

      // 7: Read all clients in CG
      const clients = await tx.query.replicacheClient.findMany({
        where: (t) => eq(t.clientGroupId, clientGroupId),
      });

      // 8: Build nextCVR
      const nextCvrEntities = await computeCvrEntities(tx, userId, schema);
      const nextCvrLastMutationIds = Object.fromEntries(
        clients.map((c) => [c.id, c.lastMutationId]),
      );
      debug(`%o`, { nextCvrEntities, nextCvrLastMutationIds });

      // 9: calculate diffs
      const entitiesDiff = diffCvrEntities(
        prevCvr?.entities ?? {},
        nextCvrEntities,
      );
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
      ] = await Promise.all([
        tx.query.pinyinFinalAssociation.findMany({
          where: (t) =>
            inArray(t.id, entitiesDiff.pinyinFinalAssociation?.puts ?? []),
        }),
        tx.query.pinyinInitialAssociation.findMany({
          where: (t) =>
            inArray(t.id, entitiesDiff.pinyinInitialAssociation?.puts ?? []),
        }),
        tx.query.pinyinInitialGroupTheme.findMany({
          where: (t) =>
            inArray(t.id, entitiesDiff.pinyinInitialGroupTheme?.puts ?? []),
        }),
        tx.query.skillState.findMany({
          where: (t) => inArray(t.id, entitiesDiff.skillState?.puts ?? []),
        }),
        tx.query.skillRating.findMany({
          where: (t) => inArray(t.id, entitiesDiff.skillRating?.puts ?? []),
        }),
      ]);
      debug(`%o`, { skillStates, skillRatings });

      // 12: changed clients
      // n/a (done above)

      // 13: newCVRVersion
      const prevCvrVersion = pull.cookie?.order ?? 0;
      const nextCvrVersion =
        Math.max(prevCvrVersion, prevClientGroup.cvrVersion) + 1;

      // 14: Write ClientGroupRecord
      const nextClientGroup = {
        ...prevClientGroup,
        cvrVersion: nextCvrVersion,
      };
      debug(`%o`, { nextClientGroup });
      await putClientGroup(tx, nextClientGroup);

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
        },
        nextCvr: {
          lastMutationIds: nextCvrLastMutationIds,
          entities: nextCvrEntities,
        },
        lastMutationIdChanges: lastMutationIdsDiff,
        nextCvrVersion,
      };
    }),
  );

  // 10: If diff is empty, return no-op PR
  if (txResult === null) {
    return {
      cookie: pull.cookie,
      lastMutationIdChanges: {},
      patch: [],
    };
  }

  const { entityPatches, nextCvr, nextCvrVersion, lastMutationIdChanges } =
    txResult;

  // 16-17: store cvr
  const [cvr] = await tx
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
      patch.push({
        op: `del`,
        key,
      });
    }
  }

  // 18(ii): puts
  if (`skillState` in schema) {
    for (const s of entityPatches.skillState.puts) {
      patch.push({
        op: `put`,
        key: schema.skillState.marshalKey(s),
        value: schema.skillState.marshalValue({
          createdAt: s.createdAt,
          srs: null,
          due: s.dueAt,
        }),
      });
    }
  }
  if (`skillRating` in schema) {
    for (const s of entityPatches.skillRating.puts) {
      patch.push({
        op: `put`,
        key: schema.skillRating.marshalKey(s),
        value: schema.skillRating.marshalValue({
          rating: rFsrsRating.unmarshal(s.rating),
        }),
      });
    }
  }
  if (`pinyinFinalAssociation` in schema) {
    const e = schema.pinyinFinalAssociation;
    for (const s of entityPatches.pinyinFinalAssociation.puts) {
      patch.push({ op: `put`, key: e.marshalKey(s), value: e.marshalValue(s) });
    }
  }
  if (`pinyinInitialAssociation` in schema) {
    const e = schema.pinyinInitialAssociation;
    for (const s of entityPatches.pinyinInitialAssociation.puts) {
      patch.push({ op: `put`, key: e.marshalKey(s), value: e.marshalValue(s) });
    }
  }
  if (`pinyinInitialGroupTheme` in schema) {
    const e = schema.pinyinInitialGroupTheme;
    for (const s of entityPatches.pinyinInitialGroupTheme.puts) {
      patch.push({ op: `put`, key: e.marshalKey(s), value: e.marshalValue(s) });
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
  };
}

// Implements the push algorithm from
// https://doc.replicache.dev/strategies/row-version#push
export async function processMutation(
  tx: Drizzle,
  userId: string,
  clientGroupId: string,
  mutation: Mutation,
  // 1: `let errorMode = false`. In JS, we implement this step naturally
  // as a param. In case of failure, caller will call us again with `true`.
  errorMode: boolean,
  mutate: MutateHandler<Drizzle>,
): Promise<void> {
  // 2: beginTransaction
  await tx.transaction(async (tx) => {
    debug(`Processing mutation errorMode=%o %o`, errorMode, mutation);

    // 3: `getClientGroup(body.clientGroupID)`
    // 4: Verify requesting user owns cg (in function)
    const clientGroup = await getClientGroup(tx, { userId, clientGroupId });
    // 5: `getClient(mutation.clientID)`
    // 6: Verify requesting client group owns requested client
    const prevClient = await getClient(tx, mutation.clientId, clientGroupId);

    // 7: init nextMutationID
    const nextMutationId = prevClient.lastMutationId + 1;

    // 8: rollback and skip if already processed.
    if (mutation.id < nextMutationId) {
      debug(`Mutation %s has already been processed - skipping`, mutation.id);
      return;
    }

    // 9: Rollback and error if from future.
    if (mutation.id > nextMutationId) {
      throw new Error(`Mutation ${mutation.id} is from the future - aborting`);
    }

    const t1 = Date.now();

    if (!errorMode) {
      try {
        // 10(i): Run business logic
        // 10(i)(a): xmin column is automatically updated by Postgres for any affected rows.
        await mutate(tx, userId, mutation);
      } catch (e) {
        // 10(ii)(a-c): log error, abort, and retry
        debug(`Error executing mutation: %o %o`, mutation, e);
        throw e;
      }
    }

    // 11-12: put client and client group
    const nextClient = {
      id: mutation.clientId,
      clientGroupId,
      lastMutationId: nextMutationId,
    };

    await putClientGroup(tx, clientGroup);
    await putClient(tx, nextClient);

    debug(`Processed mutation in %s`, Date.now() - t1);
  });
}

export interface ClientRecord {
  id: string;
  clientGroupId: string;
  lastMutationId: number;
}

export interface ClientGroupRecord {
  id: string;
  userId: string;
  cvrVersion: number;
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

export async function putClientGroup(
  db: Drizzle,
  clientGroup: ClientGroupRecord,
) {
  const { id, userId, cvrVersion } = clientGroup;

  await db
    .insert(s.replicacheClientGroup)
    .values({ id, userId, cvrVersion })
    .onConflictDoUpdate({
      target: s.replicacheClientGroup.id,
      set: { userId, cvrVersion, updatedAt: new Date() },
    });
}

export async function getClientGroup(
  db: Drizzle,
  opts: {
    userId: string;
    clientGroupId: string;
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
    };
  }

  if (r.userId !== opts.userId) {
    throw new Error(`Authorization error - user does not own client group`);
  }

  return {
    id: opts.clientGroupId,
    userId: r.userId,
    cvrVersion: r.cvrVersion,
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
  const pinyinFinalAssociationVersions = db
    .select({
      map: json_object_agg(
        s.pinyinFinalAssociation.id,
        json_build_object({
          final: s.pinyinFinalAssociation.final,
          xmin: sql<string>`${s.pinyinFinalAssociation}.xmin`,
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
          xmin: sql<string>`${s.pinyinInitialAssociation}.xmin`,
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
          xmin: sql<string>`${s.pinyinInitialGroupTheme}.xmin`,
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
          xmin: sql<string>`${s.skillState}.xmin`,
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
          skill: s.skillRating.skill,
          createdAt: sql<string>`${s.skillRating.createdAt}::timestamptz`,
          xmin: sql<string>`${s.skillRating}.xmin`,
        }),
      ).as(`skillRatingVersions`),
    })
    .from(s.skillRating)
    .where(eq(s.skillRating.userId, userId))
    .as(`skillRatingVersions`);

  const [result] = await db
    .select({
      pinyinFinalAssociation: pinyinFinalAssociationVersions.map,
      pinyinInitialAssociation: pinyinInitialAssociationVersions.map,
      pinyinInitialGroupTheme: pinyinInitialGroupThemeVersions.map,
      skillRating: skillRatingVersions.map,
      skillState: skillStateVersions.map,
    })
    .from(pinyinFinalAssociationVersions)
    .leftJoin(pinyinInitialAssociationVersions, sql`true`)
    .leftJoin(pinyinInitialGroupThemeVersions, sql`true`)
    .leftJoin(skillRatingVersions, sql`true`)
    .leftJoin(skillStateVersions, sql`true`);

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
                groupId: rPinyinInitialGroupId.unmarshal(v.groupId),
              }),
          )
        : {},
    skillState: mapValues(
      result.skillState,
      (v) => v.xmin + `:` + schema.skillState.marshalKey(v),
    ),
    skillRating: mapValues(
      result.skillRating,
      (v) =>
        v.xmin +
        `:` +
        schema.skillRating.marshalKey({
          skill: v.skill,
          createdAt: new Date(v.createdAt),
        }),
    ),
  };
}
