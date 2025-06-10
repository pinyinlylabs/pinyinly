import type { SupportedSchema } from "@/data/rizzleSchema";
import { rPinyinInitialGroupId, v7, v7_1 } from "@/data/rizzleSchema";
import type {
  ClientStateNotFoundResponse,
  PullOkResponse,
  PullRequest,
  PushRequest,
  PushResponse,
  VersionNotSupportedResponse,
} from "@/util/rizzle";
import { pushRequestSchema, replicacheMutationSchema } from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import { startSpan } from "@sentry/core";
import { and, eq, gt, sql } from "drizzle-orm";
import chunk from "lodash/chunk";
import mapValues from "lodash/mapValues";
import type { z } from "zod/v4";
import * as s from "../schema";
import type { Drizzle } from "./db";
import {
  json_build_object,
  json_object_agg,
  withRepeatableReadTransaction,
  xmin,
} from "./db";
import {
  pull as pullV7,
  pull as pullV7_1,
  push as pushV7,
  push as pushV7_1,
} from "./replicache/v7";

interface Impl {
  pull: typeof pull;
  push: typeof push;
}

export async function push(
  db: Drizzle,
  userId: string,
  pushRequest: PushRequest,
): Promise<PushResponse> {
  return await startSpan({ name: push.name }, async () => {
    const impl = getImpl(pushRequest.schemaVersion);
    return await impl.push(db, userId, pushRequest);
  });
}

export async function pull(
  db: Drizzle,
  userId: string,
  pullRequest: PullRequest,
): Promise<
  PullOkResponse | VersionNotSupportedResponse | ClientStateNotFoundResponse
> {
  return await startSpan({ name: pull.name }, async () => {
    const impl = getImpl(pullRequest.schemaVersion);
    return await impl.pull(db, userId, pullRequest);
  });
}

function getImpl(schemaVersion: string): Impl {
  if (schemaVersion === v7_1.version) {
    return { pull: pullV7_1, push: pushV7_1 };
  } else if (schemaVersion === v7.version) {
    return { pull: pullV7, push: pushV7 };
  }

  return { pull: notSupported, push: notSupported };
}

const notSupported = () =>
  Promise.resolve({
    error: `VersionNotSupported`,
    versionType: `schema`,
  } satisfies VersionNotSupportedResponse);

export interface ClientRecord {
  id: string;
  clientGroupId: string;
  lastMutationId: number;
}

export interface ClientGroupRecord {
  id: string;
  userId: string;
  schemaVersion: string;
  cvrVersion: number;
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
