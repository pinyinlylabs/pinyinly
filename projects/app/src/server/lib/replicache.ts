import { v8, v9 } from "@/data/rizzleSchema";
import type {
  ClientStateNotFoundResponse,
  PullOkResponse,
  PullRequest,
  PushRequest,
  PushResponse,
  VersionNotSupportedResponse,
} from "@/util/rizzle";
import { pushRequestSchema, replicacheMutationSchema } from "@/util/rizzle";
import { invariant } from "@pinyinly/lib/invariant";
import { startSpan } from "@sentry/core";
import { and, eq, gt } from "drizzle-orm";
import chunk from "lodash/chunk";
import type { z } from "zod/v4";
import * as s from "../pgSchema";
import type { Drizzle } from "./db";
import { withRepeatableReadTransaction } from "./db";
import { pull as pullV8, push as pushV8 } from "./replicache/v8";
import { pull as pullV9, push as pushV9 } from "./replicache/v9";

interface Impl {
  pull: typeof pull;
  push: typeof push;
}

export async function push(
  db: Drizzle,
  userId: string,
  pushRequest: PushRequest,
): Promise<PushResponse> {
  const { schemaVersion } = pushRequest;
  return await startSpan(
    { name: `${push.name} (${schemaVersion})` },
    async () => {
      const impl = getImpl(schemaVersion);
      return await impl.push(db, userId, pushRequest);
    },
  );
}

export async function pull(
  db: Drizzle,
  userId: string,
  pullRequest: PullRequest,
): Promise<
  PullOkResponse | VersionNotSupportedResponse | ClientStateNotFoundResponse
> {
  const { schemaVersion } = pullRequest;
  return await startSpan(
    { name: `${pull.name} (${schemaVersion})` },
    async () => {
      const impl = getImpl(schemaVersion);
      return await impl.pull(db, userId, pullRequest);
    },
  );
}

function getImpl(schemaVersion: string): Impl {
  switch (schemaVersion) {
    case v9.version: {
      return { pull: pullV9, push: pushV9 };
    }
    case v8.version: {
      return { pull: pullV8, push: pushV8 };
    }
    default: {
      // If the schema version is not recognized, return a not supported
      // implementation that returns a VersionNotSupportedResponse.
      return {
        pull: notSupported,
        push: notSupported,
      };
    }
  }
}

const notSupported = () =>
  Promise.resolve({
    error: `VersionNotSupported`,
    versionType: `schema`,
  } satisfies VersionNotSupportedResponse);

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
