import {
  Cookie,
  makeDrizzleMutationHandler,
  Mutation,
  PullRequest,
  PushRequest,
} from "@/data/rizzle";
import * as r from "@/data/rizzleSchema";
import { MarshaledSkillId } from "@/data/rizzleSchema";
import { invariant } from "@haohaohow/lib/invariant";
import makeDebug from "debug";
import { eq, inArray, sql } from "drizzle-orm";
import mapValues from "lodash/mapValues";
import { basename } from "node:path";
import {
  ClientStateNotFoundResponse,
  PatchOperation,
  PushResponse,
  VersionNotSupportedResponse,
} from "replicache";
import { z } from "zod";
import * as schema from "../schema";
import type { Drizzle } from "./db";
import { json_build_object, json_object_agg } from "./db";

const debug = makeDebug(basename(import.meta.filename));

export async function push(
  tx: Drizzle,
  userId: string,
  push: PushRequest,
): Promise<PushResponse | undefined> {
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

  for (const mutation of push.mutations) {
    try {
      await processMutation(tx, userId, push.clientGroupId, mutation, false);
    } catch {
      await processMutation(tx, userId, push.clientGroupId, mutation, true);
    }
  }
}

const cvrEntriesSchema = z
  .object({
    skillState: z.record(z.string()),
    skillRating: z.record(z.string()),
    client: z.record(z.string()),
  })
  .partial();

type CvrEntities = z.infer<typeof cvrEntriesSchema>;

export type CvrEntitiesDiff = { [K in keyof CvrEntities]?: CvrEntityDiff };
export type CvrEntityDiff = {
  puts: string[];
  dels: string[];
};

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

type PullResponse =
  | {
      cookie: Cookie;
      lastMutationIDChanges: Record<string, number>;
      patch: PatchOperation[];
    }
  | ClientStateNotFoundResponse
  | VersionNotSupportedResponse;

export async function pull(
  tx: Drizzle,
  userId: string,
  pull: PullRequest,
): Promise<PullResponse> {
  invariant(pull.schemaVersion === `3`);

  const { clientGroupId, cookie } = pull;
  // 1: Fetch prevCVR
  const prevCvrEntities = cookie
    ? ((
        await tx.query.replicacheCvr.findFirst({
          columns: { entities: true },
          where: (p, { eq }) => eq(p.id, cookie.cvrId),
        })
      )?.entities as CvrEntities)
    : undefined;

  // 2: Init baseCVR
  const baseCvrEntries: CvrEntities = prevCvrEntities ?? { skillState: {} };
  debug(`%o`, { prevCvrEntities, baseCvrEntries });

  // 3: begin transaction
  const txResult = await tx.transaction(async (tx) => {
    // 4-5: getClientGroup(body.clientGroupID), verify user
    const baseClientGroup = await getClientGroup(tx, clientGroupId, userId);

    const [nextCvrEntities, clientMeta] = await Promise.all([
      // 6: Read all domain data, just ids and versions
      computeCvrEntities(tx, userId, clientGroupId),
      // 7: Read all clients in CG
      tx.query.replicacheClient.findMany({
        where: (t) => eq(t.clientGroupId, clientGroupId),
      }),
    ]);

    debug(`%o`, {
      baseClientGroup,
      clientMeta,
      nextCvrEntities,
    });

    // 8: Build nextCVR
    // const nextCVR: CVR = {
    //   list: cvrEntriesFromSearch(listMeta),
    //   todo: cvrEntriesFromSearch(todoMeta),
    //   share: cvrEntriesFromSearch(shareMeta),
    //   client: cvrEntriesFromSearch(clientMeta),
    // };
    debug(`%o`, { nextCvrEntities });

    // 9: calculate diffs
    const diff = diffCvrEntities(baseCvrEntries, nextCvrEntities);
    debug(`%o`, { diff });

    // 10: If diff is empty, return no-op PR
    if (prevCvrEntities && isCvrDiffEmpty(diff)) {
      return null;
    }

    // 11: get entities
    const [skillStates, skillRatings, clients] = await Promise.all([
      tx.query.skillState.findMany({
        where: (t) => inArray(t.id, diff.skillState?.puts ?? []),
      }),
      tx.query.skillRating.findMany({
        where: (t) => inArray(t.id, diff.skillRating?.puts ?? []),
      }),
      tx.query.replicacheClient.findMany({
        where: (t) => inArray(t.id, diff.client?.puts ?? []),
      }),
    ]);
    debug(`%o`, { skillStates, clients });

    // 12: changed clients - no need to re-read clients from database,
    // n/a

    // 13: newCVRVersion
    const baseCvrVersion = pull.cookie?.order ?? 0;
    const nextCvrVersion =
      Math.max(baseCvrVersion, baseClientGroup.cvrVersion) + 1;

    // 14: Write ClientGroupRecord
    const nextClientGroup = {
      ...baseClientGroup,
      cvrVersion: nextCvrVersion,
    };
    debug(`%o`, { nextClientGroup });
    await putClientGroup(tx, nextClientGroup);

    return {
      entities: {
        skillState: { dels: diff.skillState?.dels ?? [], puts: skillStates },
        skillRating: { dels: diff.skillRating?.dels ?? [], puts: skillRatings },
        client: { dels: diff.client?.dels ?? [], puts: clients },
      },
      nextCvrEntities,
      nextCvrVersion,
    };
  });

  // 10: If diff is empty, return no-op PR
  if (txResult === null) {
    return {
      cookie: pull.cookie,
      lastMutationIDChanges: {},
      patch: [],
    };
  }

  const { entities, nextCvrEntities, nextCvrVersion } = txResult;

  // 16-17: store cvr
  const [cvr] = await tx
    .insert(schema.replicacheCvr)
    .values([
      {
        lastMutationIds: Object.fromEntries(
          entities.client.puts.map((p) => [p.id, p.lastMutationId]),
        ),
        entities: nextCvrEntities,
      },
    ])
    .returning({ id: schema.replicacheCvr.id });
  invariant(cvr != null);

  // 18(i): build patch
  const patch: PatchOperation[] = [];
  if (prevCvrEntities === undefined) {
    patch.push({ op: `clear` });
  }

  // 18(i)(skillState):
  for (const s of entities.skillState.puts) {
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
  for (const key of entities.skillState.dels) {
    patch.push({
      op: `del`,
      key,
    });
  }
  // 18(i)(skillRating):
  for (const s of entities.skillRating.puts) {
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
  for (const key of entities.skillRating.dels) {
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
  const lastMutationIDChanges = nextCvrEntities.client as unknown as Record<
    string,
    number
  >; // todo: does it matter that the client versions are not numbers?;

  return {
    cookie: nextCookie,
    lastMutationIDChanges,
    patch,
  };
}

// Implements the push algorithm from
// https://doc.replicache.dev/strategies/row-version#push
async function processMutation(
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
    const clientGroup = await getClientGroup(tx, clientGroupId, userId);
    // 5: `getClient(mutation.clientID)`
    // 6: Verify requesting client group owns requested client
    const baseClient = await getClient(tx, mutation.clientId, clientGroupId);

    // 7: init nextMutationID
    const nextMutationId = baseClient.lastMutationId + 1;

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
  clientGroupId: string,
  userId: string,
): Promise<ClientGroupRecord> {
  const r = await db.query.replicacheClientGroup.findFirst({
    where: (p, { eq }) => eq(p.id, clientGroupId),
  });

  if (!r) {
    return {
      id: clientGroupId,
      userId,
      cvrVersion: 0,
    };
  }

  if (r.userId !== userId) {
    throw new Error(`Authorization error - user does not own client group`);
  }

  return {
    id: clientGroupId,
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

const mutate = makeDrizzleMutationHandler<typeof r.schema, Drizzle>(r.schema, {
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
});

export async function computeCvrEntities(
  db: Drizzle,
  userId: string,
  clientGroupId: string,
) {
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

  const clientVersions = db
    .select({
      map: json_object_agg(
        schema.replicacheClient.id,
        sql<string>`${schema.replicacheClient}.xmin`,
      ).as(`clientVersions`),
    })
    .from(schema.replicacheClient)
    .where(eq(schema.replicacheClient.clientGroupId, clientGroupId))
    .as(`clientVersions`);

  const [result] = await db
    .select({
      skillState: skillStateVersions.map,
      skillRating: skillRatingVersions.map,
      client: clientVersions.map,
    })
    .from(skillStateVersions)
    .leftJoin(clientVersions, sql`true`)
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
    client: result.client,
  };
}
