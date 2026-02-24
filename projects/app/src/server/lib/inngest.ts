import type { AssetId } from "@/data/model";
import { assetIdSchema, hanziWordSkillKinds } from "@/data/model";
import { supportedSchemas } from "@/data/rizzleSchema";
import { hanziWordSkill } from "@/data/skills";
import { loadDictionary, loadHanziWordMigrations } from "@/dictionary";
import * as s from "@/server/pgSchema";
import type { AppRouter } from "@/server/routers/_app";
import { postmarkServerToken } from "@/util/env";
import { httpSessionHeaderTx } from "@/util/http";
import { sentryMiddleware } from "@inngest/middleware-sentry";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import { createTRPCClient, httpLink } from "@trpc/client";
import { subDays } from "date-fns/subDays";
import { and, eq, gte, inArray, lt, notInArray, sql } from "drizzle-orm";
import { EventSchemas, Inngest, RetryAfterError } from "inngest";
import * as postmark from "postmark";
import z from "zod/v4";
import {
  downloadAssetFromRemote,
  listAssetFiles,
  uploadAssetToRemote,
} from "./assetSync";
import {
  pgBatchUpdate,
  substring,
  withDrizzle,
  withRepeatableReadTransaction,
} from "./db";
import {
  getReplicacheClientMutationsSince,
  getReplicacheClientStateForUser,
  ignoreRemoteClientForRemoteSync,
  pushChunked,
  updateRemoteSyncClientLastMutationId,
} from "./replicache";
import { retryMutation as retryMutationV13 } from "./replicache/v12";

// Create a client to send and receive events
export const inngest = new Inngest({
  id: `my-app`,
  middleware: [sentryMiddleware()],
  schemas: new EventSchemas().fromSchema({
    "asset/sync-upload": z.object({
      remoteSyncId: z.string(),
      assetId: assetIdSchema,
    }),
    "asset/sync-download": z.object({
      remoteSyncId: z.string(),
      assetId: assetIdSchema,
    }),
    "replicache/retry-mutations": z.object({
      startMutationRecordId: z.string(),
    }),
    "migrateAssetIds/manual": z.never(),
    "test/hello.world.email": z.never(),
    "test/fn": z.never(),
    "test/crypto": z.never(),
    "test/log-root-error": z.never(),
    "test/log-step-error": z.never(),
    "test/throw-root-error": z.never(),
    "test/throw-step-error": z.never(),
  }),
});

const devTestThrowRootError = inngest.createFunction(
  { id: `test-throw-root-error` },
  { event: `test/throw-root-error` },
  () => {
    throw new Error(`test error`);
  },
);

const devTestThrowStepError = inngest.createFunction(
  { id: `test-throw-step-error` },
  { event: `test/throw-step-error` },
  async ({ step }) => {
    await step.run(`throw error`, () => {
      throw new Error(`test error`);
    });
  },
);

const devTestLogRootError = inngest.createFunction(
  { id: `test-log-root-error` },
  { event: `test/log-root-error` },
  () => {
    console.error(new Error(`test error`));
  },
);

const devTestLogStepError = inngest.createFunction(
  { id: `test-log-step-error` },
  { event: `test/log-step-error` },
  async ({ step }) => {
    await step.run(`log error`, () => {
      console.error(new Error(`test error`));
    });
  },
);

const devTestCrypto = inngest.createFunction(
  { id: `test-crypto` },
  { event: `test/crypto` },
  async () => {
    const Crypto = await import(`expo-crypto`);
    return Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `test`,
    );
  },
);

const helloWorldEmail = inngest.createFunction(
  { id: `hello-world-email` },
  { event: `test/hello.world.email` },
  async ({ step }) => {
    const client = new postmark.ServerClient(nonNullable(postmarkServerToken));

    const response = await step.run(`sendEmail`, async () =>
      client.sendEmail({
        From: `hello@pinyinly.com`,
        To: `brad@pinyinly.com`,
        Subject: `Hello World`,
        TextBody: `Hello World`,
        HtmlBody: `<strong>Hello</strong> World`,
        MessageStream: `outbound`,
      }),
    );

    return {
      response,
    };
  },
);

function createTrpcClient(url: string, sessionId: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpLink({
        url,
        headers() {
          return {
            [httpSessionHeaderTx]: sessionId,
          };
        },
      }),
    ],
  });
}

/**
 * Check if there's an internet connection by attempting a fetch.
 * Returns false if offline, allowing sync functions to skip gracefully.
 */
export async function checkIsOffline(timeoutMs = 3000): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    await fetch(`https://cloudflare.com/cdn-cgi/trace`, {
      method: `GET`,
      signal: controller.signal,
      cache: `no-store`,
    });
    return false;
  } catch {
    return true;
  } finally {
    clearTimeout(timeout);
  }
}

const replicacheGarbageCollection = inngest.createFunction(
  {
    description: `Delete old replicache data no longer used to reduce DB bloat.`,
    id: `replicacheGarbageCollection`,
    singleton: { mode: `skip` },
  },
  {
    // Run once every hour
    cron: `0 * * * *`,
  },
  async ({ step }) => {
    let deletedRowCount = 0;
    do {
      const { deletedRows } = await step.run(
        `replicacheCvr table deletes`,
        async () =>
          withDrizzle(async (db) => {
            const rowsToDelete = await db
              .select({ id: s.replicacheCvr.id })
              .from(s.replicacheCvr)
              .where(lt(s.replicacheCvr.createdAt, subDays(new Date(), 7)))
              .limit(1000);

            const idsToDelete = rowsToDelete.map((r) => r.id);

            const deletedRows = await db
              .delete(s.replicacheCvr)
              .where(inArray(s.replicacheCvr.id, idsToDelete))
              .returning({ id: s.replicacheCvr.id });

            return { deletedRows };
          }),
      );
      deletedRowCount = deletedRows.length;
    } while (deletedRowCount > 0);
  },
);

const pgFullVacuumGarbageCollection = inngest.createFunction(
  {
    description: `Checks PostgreSQL tables for dead tuples and if VACUUM FULL is needed to reclaim space.`,
    id: `pgFullVacuumGarbageCollection`,
    singleton: { mode: `skip` },
  },
  {
    // Run once every day
    cron: `0 0 * * *`,
  },
  async ({ step }) => {
    type BloatRow = {
      schema_name: string;
      table_name: string;
      table_size: string;
      n_live_tup: number;
      n_dead_tup: number;
      table_dead_pct: number;
      toast_table_size: string | null;
      toast_live_tup: number | null;
      toast_dead_tup: number | null;
      toast_dead_pct: number | null;
      recommendation: `OK` | `Consider VACUUM FULL`;
    };

    const bloatRows = await step.run(`query bloat stats`, async () =>
      withDrizzle(async (db) => {
        const { rows } = await db.execute<BloatRow>(`
  WITH toast_stats AS (
    SELECT 
      t.oid AS toast_oid,
      t.relname AS toast_relname,
      t.reltoastrelid AS toast_relid,
      p.oid AS parent_oid,
      p.relname AS parent_relname,
      ns.nspname AS schema_name,
      pg_total_relation_size(t.oid) AS toast_total_size,
      s.n_dead_tup AS toast_dead_tup,
      s.n_live_tup AS toast_live_tup
    FROM pg_class t
    JOIN pg_class p ON t.reltoastrelid = p.oid
    JOIN pg_namespace ns ON p.relnamespace = ns.oid
    LEFT JOIN pg_stat_all_tables s ON s.relid = t.oid
    WHERE t.relname LIKE 'pg_toast_%'
  ),
  parent_table_stats AS (
    SELECT
      s.relid,
      n.nspname AS schema_name,
      c.relname AS table_name,
      s.n_live_tup,
      s.n_dead_tup,
      pg_total_relation_size(s.relid) AS table_size
    FROM pg_stat_user_tables s
    JOIN pg_class c ON c.oid = s.relid
    JOIN pg_namespace n ON n.oid = c.relnamespace
  )
  SELECT 
    p.schema_name,
    p.table_name,
    pg_size_pretty(p.table_size) AS table_size,
    p.n_live_tup,
    p.n_dead_tup,
    ROUND(((p.n_dead_tup::float / NULLIF(p.n_live_tup + p.n_dead_tup, 0)) * 100)::numeric, 2) AS table_dead_pct,
    pg_size_pretty(t.toast_total_size) AS toast_table_size,
    t.toast_live_tup,
    t.toast_dead_tup,
    ROUND(((t.toast_dead_tup::float / NULLIF(t.toast_live_tup + t.toast_dead_tup, 0)) * 100)::numeric, 2) AS toast_dead_pct,
    CASE 
      WHEN (p.n_dead_tup > 100000 AND (p.n_dead_tup::float / NULLIF(p.n_live_tup + p.n_dead_tup, 0)) > 0.2)
        OR (t.toast_dead_tup > 10000 AND (t.toast_dead_tup::float / NULLIF(t.toast_live_tup + t.toast_dead_tup, 0)) > 0.2)
      THEN 'Consider VACUUM FULL'
      ELSE 'OK'
    END AS recommendation
  FROM parent_table_stats p
  LEFT JOIN toast_stats t ON p.relid = t.parent_oid
  ORDER BY recommendation DESC, table_dead_pct DESC NULLS LAST;
`);
        return rows;
      }),
    );

    const tablesToVacuum = bloatRows.filter(
      (row) => row.recommendation === `Consider VACUUM FULL`,
    );

    for (const table of tablesToVacuum) {
      await step.run(
        `vacuum table ${table.schema_name}.${table.table_name}`,
        async () => {
          // Run VACUUM FULL on the table
          await withDrizzle(async (db) => {
            await db.execute(
              sql`VACUUM FULL ${sql.identifier(table.schema_name)}.${sql.identifier(table.table_name)};`,
            );
          });
        },
      );
    }

    return bloatRows;
  },
);

const syncRemotePush = inngest.createFunction(
  {
    id: `syncRemotePush`,
    singleton: { mode: `skip` },
  },
  {
    // Sync every 5 minutes
    cron: `*/5 * * * *`,
  },
  async ({ step }) => {
    await onlineOrRetryLater();

    // Find all sync rules
    const remoteSyncs = await step.run(`findSyncRules`, async () => {
      const remoteSyncs = await withDrizzle(async (db) => {
        return db.query.remoteSync.findMany();
      });
      return remoteSyncs;
    });

    // Iterate over each remote sync rule and process it one by one.
    for (const remoteSync of remoteSyncs) {
      const remoteSyncClients = await step.run(
        // Putting the user ID in is unnecessary but it helps debugging.
        `fetchRemoteSyncState-${remoteSync.id}-${remoteSync.userId}`,
        async () => {
          // calculate which replicache clients need to be synced
          return withDrizzle(async (db) =>
            getReplicacheClientStateForUser(db, remoteSync.userId),
          );
        },
      );

      for (const {
        clientId,
        lastMutationId,
        schemaVersion,
      } of remoteSyncClients) {
        if (
          schemaVersion == null ||
          !supportedSchemas.some((s) => s.version === schemaVersion)
        ) {
          continue;
        }

        // Don't push any clients that originate from the remote server (these
        // would exist locally from being pull syncing).
        if (remoteSync.pulledClientIds.includes(clientId)) {
          continue;
        }

        let lastSyncedMutationId =
          // For new clients that have never been synced, there won't be a
          // lastSyncedMutationIds entry, so we default to 0.
          remoteSync.lastSyncedMutationIds[clientId] ?? 0;

        const mutationBatchSize = 20;
        while (lastSyncedMutationId < lastMutationId) {
          const newLastSyncedMutationId = await step.run(
            `syncRemoteClient-${clientId}-${lastSyncedMutationId}`,
            // oxlint-disable-next-line no-loop-func
            async () => {
              // Fetch mutations that need to be sent.
              const mutationBatchToPush = await withDrizzle(async (db) =>
                getReplicacheClientMutationsSince(db, {
                  clientId,
                  sinceMutationId: lastSyncedMutationId,
                  limit: mutationBatchSize,
                }),
              );

              // push to server

              const trpcClient = createTrpcClient(
                remoteSync.remoteUrl,
                remoteSync.remoteSessionId,
              );

              const result = await trpcClient.replicache.push.mutate({
                mutations: mutationBatchToPush,
                profileId: remoteSync.remoteProfileId,
                clientGroupId: remoteSync.remoteClientGroupId,
                pushVersion: 1,
                schemaVersion,
              });

              // Check for errors (VersionNotSupportedResponse or ClientStateNotFoundResponse)
              if (result != null) {
                console.error(
                  `Error pushing mutations to remote for clientId=${clientId}, remoteSyncId=${remoteSync.id}:`,
                  result,
                );
                // Don't update lastSyncedMutationIds - will retry on next sync
                return lastSyncedMutationId; // Return current value unchanged
              }

              const newLastSyncedMutationId = mutationBatchToPush.at(-1)?.id;
              invariant(
                newLastSyncedMutationId != null,
                `newLastMutationId is null`,
              );

              // Update the remoteSync record with the new lastMutationId for
              // the client, so that in the future only mutations after that are
              // sent.
              await withDrizzle(async (db) => {
                await updateRemoteSyncClientLastMutationId(db, {
                  remoteSyncId: remoteSync.id,
                  clientId,
                  lastMutationId: newLastSyncedMutationId,
                });
              });

              return newLastSyncedMutationId;
            },
          );

          invariant(newLastSyncedMutationId > lastSyncedMutationId);
          lastSyncedMutationId = newLastSyncedMutationId;
        }
      }
    }
  },
);

const syncRemotePull = inngest.createFunction(
  {
    id: `syncRemotePull`,
    singleton: { mode: `skip` },
  },
  {
    // Sync every 5 minutes
    cron: `*/5 * * * *`,
  },
  async ({ step }) => {
    await onlineOrRetryLater();

    // Find all sync rules
    const remoteSyncs = await step.run(`findSyncRules`, async () =>
      withDrizzle(async (db) => db.query.remoteSync.findMany()),
    );

    // Iterate over each remote sync rule and process it one by one.
    for (const remoteSync of remoteSyncs) {
      while (true) {
        const fetchedMutations = await step.run(
          // Putting the user ID in is unnecessary but it helps debugging.
          `fetchMutations-${remoteSync.id}-${remoteSync.userId}`,
          async () => {
            const clientsState = await withDrizzle(async (db) =>
              getReplicacheClientStateForUser(db, remoteSync.userId),
            );

            const lastMutationIds = Object.fromEntries(
              clientsState.map((c) => [c.clientId, c.lastMutationId]),
            );

            const trpcClient = createTrpcClient(
              remoteSync.remoteUrl,
              remoteSync.remoteSessionId,
            );

            return trpcClient.replicache.fetchMutations.mutate({
              schemaVersions: supportedSchemas.map((s) => s.version),
              lastMutationIds,
            });
          },
        );

        if (fetchedMutations.mutations.length === 0) {
          break;
        }

        await step.run(
          `applyMutations-${remoteSync.id}-${remoteSync.userId}`,
          async () => {
            for (const {
              clientGroupId,
              schemaVersion,
              mutations,
            } of fetchedMutations.mutations) {
              // Make sure remote clients aren't pushed back to the remote
              // server during syncing. Find the new remote client IDs that we
              // haven't seen before and add them to the remoteSync record.
              {
                const remoteClientIds = [
                  ...new Set(mutations.map((m) => m.clientId)),
                ];
                await withDrizzle(async (db) => {
                  await ignoreRemoteClientForRemoteSync(
                    db,
                    remoteSync.id,
                    remoteClientIds,
                  );
                });
              }

              // Finally apply the mutations.
              const result = await withDrizzle(async (db) =>
                pushChunked(db, remoteSync.userId, {
                  schemaVersion,
                  profileId: remoteSync.remoteProfileId,
                  clientGroupId,
                  pushVersion: 1,
                  mutations,
                }),
              );

              if (result != null) {
                console.error(`Error applying remote mutations for:`, result);
              }
            }
          },
        );
      }
    }
  },
);

const dataIntegrityDictionary = inngest.createFunction(
  { id: `dataIntegrityDictionary` },
  { cron: `30 * * * *` },
  async ({ step }) => {
    const dict = await loadDictionary();

    await step.run(`check skillRating.skill`, async () => {
      const unknownSkills = await withDrizzle(async (db) =>
        db
          .selectDistinct({ skill: s.skillRating.skill })
          .from(s.skillRating)
          .where(
            notInArray(
              substring(s.skillRating.skill, /^\w+:(.+)$/),
              dict.allHanziWords,
            ),
          ),
      ).then((x) => x.map((r) => r.skill));

      if (unknownSkills.length > 0) {
        console.error(
          `unknown hanzi word in skillRating.skill:`,
          unknownSkills,
        );
      }

      return unknownSkills;
    });

    await step.run(`check skillState.skill`, async () => {
      const unknownSkills = await withDrizzle(async (db) =>
        db
          .selectDistinct({ skill: s.skillState.skill })
          .from(s.skillState)
          .where(
            notInArray(
              substring(s.skillState.skill, /^\w+:(.+)$/),
              dict.allHanziWords,
            ),
          ),
      ).then((x) => x.map((r) => r.skill));

      if (unknownSkills.length > 0) {
        console.error(`unknown hanzi word in skillState.skill:`, unknownSkills);
      }

      return unknownSkills;
    });
  },
);

const migrateHanziWords = inngest.createFunction(
  { id: `migrateHanziWords` },
  { cron: `30 * * * *` },
  async ({ step }) => {
    const hanziWordMigrations = await loadHanziWordMigrations();
    // HanziWord -> HanziWord
    const skillRenames = [...hanziWordMigrations].flatMap(
      ([oldHanziWord, newHanziWord]) =>
        newHanziWord == null // `null` indicates a deletion rather than a rename, so skip these.
          ? []
          : hanziWordSkillKinds.map(
              (skillType) =>
                [
                  hanziWordSkill(skillType, oldHanziWord),
                  hanziWordSkill(skillType, newHanziWord),
                ] as const,
            ),
    );
    // HanziWord -> null
    const skillDeletes = [...hanziWordMigrations].flatMap(
      ([oldHanziWord, newHanziWord]) =>
        // When newHanziWord is null it's a deletion rather than a rename.
        newHanziWord == null
          ? hanziWordSkillKinds.map((skillType) =>
              hanziWordSkill(skillType, oldHanziWord),
            )
          : [],
    );

    //
    // skillRating
    //

    await step.run(`skillRating.skill renames`, async () =>
      withDrizzle(async (db) =>
        pgBatchUpdate(db, {
          whereColumn: s.skillRating.skill,
          setColumn: s.skillRating.skill,
          updates: skillRenames,
        }),
      ),
    );

    await step.run(`skillRating.skill deletes`, async () =>
      withDrizzle(async (db) => {
        const deletedRows = await db
          .delete(s.skillRating)
          .where(inArray(s.skillRating.skill, skillDeletes))
          .returning();

        return { deletedRows };
      }),
    );

    //
    // skillState
    //

    await step.run(`skillState.skill renames`, async () => {
      return withDrizzle(async (db) => {
        return withRepeatableReadTransaction(db, async (db) => {
          const newSkills = skillRenames.map(([, newSkill]) => newSkill);

          const skillStatesWithNewSkill = await db.query.skillState.findMany({
            where: (t) => inArray(t.skill, newSkills),
          });
          const existingNewSkills = new Set(
            skillStatesWithNewSkill.map((r) => r.skill),
          );

          const toMigrate = skillRenames.filter(
            ([, newSkill]) =>
              // We only want to do renames for skillState rows that don't
              // already exist in the new format (a new record would exist if a
              // review was done on the new skill).
              !existingNewSkills.has(newSkill),
          );

          const toDelete = skillRenames
            .filter(([, newSkill]) =>
              // These are stale skill states that
              existingNewSkills.has(newSkill),
            )
            .map(([oldSkill]) => oldSkill);

          // Sanity check that we're not doubling up.
          invariant(toMigrate.length + toDelete.length === skillRenames.length);

          // Migrate old -> new.
          const { affectedRows: migratedCount } = await pgBatchUpdate(db, {
            whereColumn: s.skillState.skill,
            setColumn: s.skillState.skill,
            updates: toMigrate,
          });

          // Delete old that already have a new.
          const deletedRows = await db
            .delete(s.skillState)
            .where(inArray(s.skillState.skill, toDelete))
            .returning();

          return { migratedCount, deletedRows };
        });
      });
    });

    await step.run(`skillState.skill deletes`, async () =>
      withDrizzle(async (db) => {
        const deletedRows = await db
          .delete(s.skillState)
          .where(inArray(s.skillState.skill, skillDeletes))
          .returning();

        return { deletedRows };
      }),
    );
  },
);

type RetryBatchResult =
  | { succeeded: number; stopped: false }
  | {
      succeeded: number;
      stopped: true;
      failedAtMutationId: number;
      error: string;
      stack?: string;
    };

const retryFailedMutations = inngest.createFunction(
  {
    id: `retryFailedMutations`,
    description: `Retry failed mutations starting from a specific mutation ID and continuing through all subsequent failed mutations for the same client.`,
  },
  { event: `replicache/retry-mutations` },
  async ({ event, step, logger }) => {
    const { startMutationRecordId } = event.data;

    // Fetch the starting mutation and all subsequent failed mutations for the same client
    const mutationChain = await step.run(`fetch-mutation-chain`, async () => {
      return withDrizzle(async (db) => {
        // First, get the starting mutation to find its clientId and mutationId
        const startMutation = await db
          .select({
            id: s.replicacheMutation.id,
            clientId: s.replicacheMutation.clientId,
            mutationId: s.replicacheMutation.mutationId,
            success: s.replicacheMutation.success,
            schemaVersion: s.replicacheClientGroup.schemaVersion,
          })
          .from(s.replicacheMutation)
          .innerJoin(
            s.replicacheClient,
            eq(s.replicacheMutation.clientId, s.replicacheClient.id),
          )
          .innerJoin(
            s.replicacheClientGroup,
            eq(s.replicacheClient.clientGroupId, s.replicacheClientGroup.id),
          )
          .where(eq(s.replicacheMutation.id, startMutationRecordId))
          .limit(1)
          .then((rows) => rows[0]);

        if (startMutation == null) {
          return {
            error: `Mutation record not found: ${startMutationRecordId}`,
          };
        }

        if (startMutation.success !== false) {
          return {
            error: `Starting mutation is not a failed mutation (success=${String(startMutation.success)})`,
          };
        }

        // Now fetch all failed mutations for this client starting from the given mutationId
        const failedMutations = await db
          .select({
            id: s.replicacheMutation.id,
            mutationId: s.replicacheMutation.mutationId,
          })
          .from(s.replicacheMutation)
          .where(
            and(
              eq(s.replicacheMutation.clientId, startMutation.clientId),
              eq(s.replicacheMutation.success, false),
              gte(s.replicacheMutation.mutationId, startMutation.mutationId),
            ),
          )
          .orderBy(s.replicacheMutation.mutationId);

        return {
          schemaVersion: startMutation.schemaVersion,
          mutations: failedMutations,
        };
      });
    });

    if (`error` in mutationChain) {
      logger.error(mutationChain.error);
      return {
        success: false,
        error: mutationChain.error,
        totalAttempted: 0,
        succeeded: 0,
        failedAtMutationId: null,
      };
    }

    const { schemaVersion, mutations } = mutationChain;

    if (mutations.length === 0) {
      return {
        success: true,
        totalAttempted: 0,
        succeeded: 0,
        failedAtMutationId: null,
      };
    }

    logger.info(`Retrying ${mutations.length} failed mutations`);

    // Process mutations in batches
    const batchSize = 10;
    let totalSucceeded = 0;
    let failedAtMutationId: number | null = null;
    let stopped = false;

    for (let i = 0; i < mutations.length && !stopped; i += batchSize) {
      const batch = mutations.slice(i, i + batchSize);
      const batchIndex = Math.floor(i / batchSize);

      const batchResult = await step.run(
        `process-batch-${batchIndex}`,
        async (): Promise<RetryBatchResult> => {
          return withDrizzle(async (db) => {
            return withRepeatableReadTransaction(db, async (db) => {
              let succeeded = 0;

              for (const mutationRecord of batch) {
                // Route to the correct schema version's retryMutation
                const result = await (async () => {
                  switch (schemaVersion) {
                    case `13`: {
                      return retryMutationV13(db, mutationRecord.id);
                    }
                    default: {
                      return {
                        success: false as const,
                        error: `Unsupported schema version: ${schemaVersion}`,
                        stack: undefined,
                      };
                    }
                  }
                })();

                if (!result.success) {
                  console.error(
                    `Failed to retry mutation ${mutationRecord.mutationId}: ${result.error}`,
                    result.stack,
                  );

                  return {
                    succeeded,
                    stopped: true as const,
                    failedAtMutationId: mutationRecord.mutationId,
                    error: result.error,
                    stack: result.stack,
                  };
                }

                succeeded++;
              }

              return {
                succeeded,
                stopped: false as const,
              };
            });
          });
        },
      );

      totalSucceeded += batchResult.succeeded;

      if (batchResult.stopped) {
        stopped = true;
        failedAtMutationId = batchResult.failedAtMutationId;
        logger.error(
          `Stopped at mutation ${String(failedAtMutationId)}: ${batchResult.error}`,
          batchResult.stack,
        );
      }
    }

    return {
      success: !stopped,
      totalAttempted: stopped ? totalSucceeded + 1 : mutations.length,
      succeeded: totalSucceeded,
      failedAtMutationId,
    };
  },
);

async function onlineOrRetryLater() {
  const isOffline = await checkIsOffline();
  if (isOffline) {
    throw new RetryAfterError(
      `No internet connection`,
      10 * 60 * 1000 /* retry after 10 minutes */,
    );
  }
}

const syncAssetBlobs = inngest.createFunction(
  {
    id: `syncAssetBlobs`,
    singleton: { mode: `skip` },
  },
  {
    // Sync every 5 minutes
    cron: `*/5 * * * *`,
  },
  async ({ step, logger }) => {
    await onlineOrRetryLater();

    // Find all sync rules
    const remoteSyncs = await step.run(`findSyncRules`, async () =>
      withDrizzle(async (db) => db.query.remoteSync.findMany()),
    );

    // Iterate over each remote sync rule and process it one by one.
    for (const remoteSync of remoteSyncs) {
      const remoteSyncId: string = remoteSync.id;
      const userId: string = remoteSync.userId;

      try {
        const localAssets = await step.run(
          `listLocalAssetFiles-${remoteSyncId}`,
          async () => listAssetFiles(userId),
        );

        const localAssetsSet = new Set(localAssets);

        const remoteAssets = await step.run(
          `listRemoteAssets-${remoteSyncId}`,
          async () => {
            const remoteClient = createTrpcClient(
              remoteSync.remoteUrl,
              remoteSync.remoteSessionId,
            );
            const assetIds =
              await remoteClient.asset.listAssetBucketUserFiles.query();
            // Filter out any legacy asset IDs that don't match the expected format, to
            // avoid syncing invalid asset IDs.
            return assetIds
              .map((assetId) => assetIdSchema.safeParse(assetId).data)
              .filter((x) => x != null);
          },
        );

        const remoteAssetsSet = new Set(remoteAssets);

        // Diff to find assets to upload and download
        const toUpload: AssetId[] = [];
        for (const id of localAssets) {
          if (!remoteAssetsSet.has(id)) {
            toUpload.push(id);
          }
        }

        const toDownload: AssetId[] = [];
        for (const id of remoteAssets) {
          if (!localAssetsSet.has(id)) {
            toDownload.push(id);
          }
        }

        if (toUpload.length > 0 || toDownload.length > 0) {
          logger.info(
            `Asset sync for ${remoteSync.id}: ${toUpload.length} to upload, ${toDownload.length} to download`,
          );
        }

        // Fan out upload jobs
        for (const assetId of toUpload) {
          await step.sendEvent(`emit-upload-${assetId}`, {
            name: `asset/sync-upload`,
            data: { remoteSyncId: remoteSync.id, assetId },
          });
        }

        // Fan out download jobs
        for (const assetId of toDownload) {
          await step.sendEvent(`emit-download-${assetId}`, {
            name: `asset/sync-download`,
            data: { remoteSyncId: remoteSync.id, assetId },
          });
        }
      } catch (error) {
        logger.error(
          `Error during asset blob sync for remote sync ${remoteSync.id}:`,
          error,
        );
      }
    }
  },
);

const syncAssetBlobUpload = inngest.createFunction(
  {
    id: `syncAssetBlobUpload`,
    singleton: {
      key: `event.data.remoteSyncId + "-" + event.data.assetId`,
      mode: `skip`,
    },
    throttle: {
      limit: 5,
      period: `10s`,
    },
  },
  { event: `asset/sync-upload` },
  async ({ event, step, logger }) => {
    await onlineOrRetryLater();

    const { remoteSyncId, assetId } = event.data;

    const remoteSync = await step.run(`fetchRemoteSyncRule`, async () =>
      withDrizzle(async (db) =>
        db.query.remoteSync.findFirst({
          where: eq(s.remoteSync.id, remoteSyncId),
        }),
      ),
    );

    if (remoteSync == null) {
      logger.error(`Remote sync rule ${remoteSyncId} not found`);
      return;
    }

    try {
      await step.run(`uploadAsset-${assetId}`, async () => {
        await uploadAssetToRemote(
          createTrpcClient(remoteSync.remoteUrl, remoteSync.remoteSessionId),
          assetId,
        );
      });

      logger.info(
        `Successfully uploaded asset ${assetId} for remote sync ${remoteSyncId}`,
      );
    } catch (error) {
      logger.error(
        `Failed to upload asset ${assetId} for remote sync ${remoteSyncId}:`,
        error,
      );
      throw error;
    }
  },
);

const syncAssetBlobDownload = inngest.createFunction(
  {
    id: `syncAssetBlobDownload`,
    singleton: {
      key: `event.data.remoteSyncId + "-" + event.data.assetId`,
      mode: `skip`,
    },
    throttle: {
      limit: 5,
      period: `10s`,
    },
  },
  { event: `asset/sync-download` },
  async ({ event, step, logger }) => {
    await onlineOrRetryLater();

    const { remoteSyncId, assetId } = event.data;

    const remoteSync = await step.run(`fetchRemoteSyncRule`, async () =>
      withDrizzle(async (db) =>
        db.query.remoteSync.findFirst({
          where: eq(s.remoteSync.id, remoteSyncId),
        }),
      ),
    );

    if (remoteSync == null) {
      logger.error(`Remote sync rule ${remoteSyncId} not found`);
      return;
    }

    try {
      await step.run(`downloadAsset-${assetId}`, async () => {
        await downloadAssetFromRemote(
          createTrpcClient(remoteSync.remoteUrl, remoteSync.remoteSessionId),
          assetId,
        );
      });

      logger.info(
        `Successfully downloaded asset ${assetId} for remote sync ${remoteSyncId}`,
      );
    } catch (error) {
      logger.error(
        `Failed to download asset ${assetId} for remote sync ${remoteSyncId}:`,
        error,
      );
      throw error;
    }
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
  dataIntegrityDictionary,
  helloWorldEmail,
  migrateHanziWords,
  pgFullVacuumGarbageCollection,
  replicacheGarbageCollection,
  retryFailedMutations,
  syncRemotePull,
  syncRemotePush,
  syncAssetBlobs,
  syncAssetBlobUpload,
  syncAssetBlobDownload,
  devTestCrypto,
  devTestThrowRootError,
  devTestThrowStepError,
  devTestLogRootError,
  devTestLogStepError,
];
