import {
  ClientStateNotFoundResponse,
  Cookie,
  makeDrizzleMutationHandler,
  Mutation,
  PullOkResponse,
  PullRequest,
  PushRequest,
  PushResponse,
  VersionNotSupportedResponse,
} from "@/data/rizzle";
import * as r from "@/data/rizzleSchema";
import { MarshaledSkillId } from "@/data/rizzleSchema";
import { invariant } from "@haohaohow/lib/invariant";
import makeDebug from "debug";
import { eq, inArray, sql } from "drizzle-orm";
import mapValues from "lodash/mapValues";
import pickBy from "lodash/pickBy";
import { basename } from "node:path";
import { DatabaseError } from "pg-protocol";
import { z } from "zod";
import * as schema from "../schema";
import type { Drizzle } from "./db";
import {
  assertMinimumIsolationLevel,
  json_build_object,
  json_object_agg,
} from "./db";

const debug = makeDebug(basename(import.meta.filename));

export async function push(
  tx: Drizzle,
  userId: string,
  push: PushRequest,
): Promise<PushResponse> {
  if (push.schemaVersion !== `3`) {
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
      await processMutation(tx, userId, push.clientGroupId, mutation, false);
      success = true;
    } catch (err) {
      await processMutation(tx, userId, push.clientGroupId, mutation, true);
      success = false;
    }

    // Save the mutations as a backup in case they need to be replayed later or
    // transferred to another database (e.g. local <-> production).
    //
    // This also needs to be done _last_ so that foreign keys to other tables
    // exist (e.g. client).
    await tx.insert(schema.replicacheMutation).values([
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
  invariant(pull.schemaVersion === `3`);

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
      const nextCvrEntities = await computeCvrEntities(tx, userId);
      const nextCvrLastMutationIds = Object.fromEntries(
        clients.map((c) => [c.id, c.lastMutationId]),
      );
      debug(`%o`, { nextCvrEntities, nextCvrLastMutationIds });

      // 9: calculate diffs
      const entitiesDiff = diffCvrEntities(
        prevCvr?.entities ?? {},
        nextCvrEntities,
      );
      const prevCvrLastMutationIds = // TODO: refactor to just use drizzle custom type
        prevCvr != null
          ? (prevCvr.lastMutationIds as Record<string, number>)
          : null;
      const lastMutationIdsDiff = diffLastMutationIds(
        prevCvrLastMutationIds ?? {},
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
      const [skillStates, skillRatings] = await Promise.all([
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
    .insert(schema.replicacheCvr)
    .values([
      {
        lastMutationIds: nextCvr.lastMutationIds,
        entities: nextCvr.entities,
      },
    ])
    .returning({ id: schema.replicacheCvr.id });
  invariant(cvr != null);

  // 18(i): build patch
  const patch: PullOkResponse[`patch`] = [];
  if (prevCvr == null) {
    patch.push({ op: `clear` });
  }

  // 18(i)(skillState):
  for (const s of entityPatches.skillState.puts) {
    patch.push({
      op: `put`,
      key: r.skillState.marshalKey({ skill: s.skillId as MarshaledSkillId }),
      value: r.skillState.marshalValue({
        created: s.createdAt,
        srs: null,
        due: s.dueAt,
      }),
    });
  }
  for (const key of entityPatches.skillState.dels) {
    patch.push({
      op: `del`,
      key,
    });
  }
  // 18(i)(skillRating):
  for (const s of entityPatches.skillRating.puts) {
    patch.push({
      op: `put`,
      key: r.skillRating.marshalKey({
        skill: s.skillId as MarshaledSkillId,
        when: s.createdAt,
      }),
      value: r.skillRating.marshalValue({
        rating: r.rFsrsRating.unmarshal(s.rating),
      }),
    });
  }
  for (const key of entityPatches.skillRating.dels) {
    patch.push({
      op: `del`,
      key,
    });
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
        await _mutate(tx, userId, mutation);
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
  const {
    id,
    clientGroupId: clientGroupId,
    lastMutationId: lastMutationId,
  } = client;

  await db
    .insert(schema.replicacheClient)
    .values({
      id,
      clientGroupId,
      lastMutationId,
    })
    .onConflictDoUpdate({
      target: schema.replicacheClient.id,
      set: { lastMutationId, updatedAt: new Date() },
    });
}

export async function putClientGroup(
  db: Drizzle,
  clientGroup: ClientGroupRecord,
) {
  const { id, userId, cvrVersion } = clientGroup;

  await db
    .insert(schema.replicacheClientGroup)
    .values({ id, userId, cvrVersion })
    .onConflictDoUpdate({
      target: schema.replicacheClientGroup.id,
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

export const _mutate = makeDrizzleMutationHandler<typeof r.schema, Drizzle>(
  r.schema,
  {
    async addSkillState(db, userId, { skill, now }) {
      const skillId = r.rSkillId().marshal(skill);
      await db
        .insert(schema.skillState)
        .values({
          userId,
          skillId,
          srs: null,
          dueAt: now,
          createdAt: now,
        })
        .onConflictDoNothing();
    },
    async reviewSkill(db, userId, { skill, rating, now }) {
      await db.insert(schema.skillRating).values([
        {
          userId,
          skillId: r.rSkillId().marshal(skill),
          rating: r.rFsrsRating.marshal(rating),
          createdAt: now,
        },
      ]);
    },
  },
);

export async function computeCvrEntities(db: Drizzle, userId: string) {
  const skillStateVersions = db
    .select({
      map: json_object_agg(
        schema.skillRating.id,
        json_build_object({
          skillId: schema.skillState.skillId,
          xmin: sql<string>`${schema.skillState}.xmin`,
        }),
      ).as(`skillStateVersions`),
    })
    .from(schema.skillState)
    .where(eq(schema.skillState.userId, userId))
    .as(`skillStateVersions`);

  const skillRatingVersions = db
    .select({
      map: json_object_agg(
        schema.skillRating.id,
        json_build_object({
          skillId: schema.skillRating.skillId,
          createdAt: sql<string>`${schema.skillRating.createdAt}::timestamptz`,
          xmin: sql<string>`${schema.skillRating}.xmin`,
        }),
      ).as(`skillRatingVersions`),
    })
    .from(schema.skillRating)
    .where(eq(schema.skillRating.userId, userId))
    .as(`skillRatingVersions`);

  const [result] = await db
    .select({
      skillState: skillStateVersions.map,
      skillRating: skillRatingVersions.map,
    })
    .from(skillStateVersions)
    .leftJoin(skillRatingVersions, sql`true`);

  invariant(result != null);

  return {
    skillState: mapValues(
      result.skillState,
      (v) =>
        v.xmin +
        `:` +
        r.skillState.marshalKey({ skill: v.skillId as MarshaledSkillId }),
    ),
    skillRating: mapValues(
      result.skillRating,
      (v) =>
        v.xmin +
        `:` +
        r.skillRating.marshalKey({
          skill: v.skillId as MarshaledSkillId,
          when: new Date(v.createdAt),
        }),
    ),
  };
}
