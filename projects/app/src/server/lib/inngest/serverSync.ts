import type { AssetId } from "@/data/model";
import { supportedSchemas } from "@/data/rizzleSchema";
import * as s from "@/server/pgSchema";
import { invariant } from "@pinyinly/lib/invariant";
import { and, eq, gte } from "drizzle-orm";
import { invoke } from "inngest";
import z from "zod";
import {
  downloadAssetFromRemote,
  listAssetFiles,
  listReferencedAssetIdsForUser,
  uploadAssetToRemote,
} from "@/server/lib/assetSync";
import { withDrizzle, withRepeatableReadTransaction } from "@/server/lib/db";
import {
  getReplicacheClientMutationsSince,
  getReplicacheClientStateForUser,
  ignoreRemoteClientForRemoteSync,
  pushChunked,
  updateRemoteSyncClientLastMutationId,
} from "@/server/lib/replicache";
import { retryMutation as retryMutationV12 } from "@/server/lib/replicache/v12";
import { retryMutation as retryMutationV14 } from "@/server/lib/replicache/v14";
import {
  assetUploadSucessEvent,
  serverSyncAssetPushEvent,
  inngest,
  serverSyncAssetPullEvent,
} from "./client";
import chunk from "lodash/chunk";
import { onlineOrRetryLater, createTrpcClient } from "./shared";

const maxFindMissingAssetsCount = 200;

export const replicachePush = inngest.createFunction(
  {
    id: `serverSync/replicache.push`,
    singleton: { mode: `skip` },
    triggers: [
      // Sync every 5 minutes
      { cron: `*/5 * * * *` },
      invoke(z.object({})),
    ],
  },
  async ({ step, logger }) => {
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
                logger.error(
                  {
                    clientId,
                    remoteSyncId: remoteSync.id,
                    result,
                  },
                  `Error pushing mutations to remote`,
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

export const replicachePull = inngest.createFunction(
  {
    id: `serverSync/replicache.pull`,
    singleton: { mode: `skip` },
    triggers: [
      // Sync every 5 minutes
      { cron: `*/5 * * * *` },
      invoke(z.object({})),
    ],
  },
  async ({ step, logger }) => {
    await onlineOrRetryLater();

    // Find all sync rules
    const remoteSyncs = await step.run(`findSyncRules`, async () =>
      withDrizzle(async (db) => db.query.remoteSync.findMany()),
    );

    // Iterate over each remote sync rule and process it one by one.
    for (const remoteSync of remoteSyncs) {
      for (;;) {
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
                logger.error(
                  {
                    clientGroupId,
                    remoteProfileId: remoteSync.remoteProfileId,
                    result,
                    schemaVersion,
                    userId: remoteSync.userId,
                  },
                  `Error applying remote mutations`,
                );
              }
            }
          },
        );
      }
    }
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
    id: `serverSync/retryFailedMutations`,
    description: `Retry failed mutations starting from a specific mutation ID and continuing through all subsequent failed mutations for the same client.`,
    triggers: [
      invoke(
        z.object({
          startMutationRecordId: z.string(),
        }),
      ),
    ],
  },
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
      logger.error(
        {
          error: mutationChain.error,
          startMutationRecordId,
        },
        `Failed to fetch mutation chain`,
      );
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

    logger.info(
      {
        mutationCount: mutations.length,
        startMutationRecordId,
      },
      `Retrying failed mutations`,
    );

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
                    case `14`: {
                      return retryMutationV14(db, mutationRecord.id);
                    }
                    case `13`: {
                      return retryMutationV12(db, mutationRecord.id);
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
                  logger.error(
                    {
                      error: result.error,
                      mutationId: mutationRecord.mutationId,
                      mutationRecordId: mutationRecord.id,
                      schemaVersion,
                      stack: result.stack,
                    },
                    `Failed to retry mutation`,
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
          {
            error: batchResult.error,
            failedAtMutationId,
            stack: batchResult.stack,
          },
          `Stopped retrying mutations due to retry failure`,
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

const assetSyncAll = inngest.createFunction(
  {
    id: `serverSync/syncAssets`,
    singleton: { mode: `skip` },
    triggers: [
      // Sync every 5 minutes
      { cron: `*/5 * * * *` },
      invoke(z.object({})),
    ],
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

        const referencedLocalAssets = await step.run(
          `listReferencedLocalAssets-${remoteSyncId}`,
          async () => listReferencedAssetIdsForUser(userId),
        );

        const missingLocalAssets = referencedLocalAssets.filter(
          (assetId) => !localAssetsSet.has(assetId),
        );

        const remoteClient = createTrpcClient(
          remoteSync.remoteUrl,
          remoteSync.remoteSessionId,
        );

        const assetIdChunks = chunk(localAssets, maxFindMissingAssetsCount);

        const results = await Promise.all(
          assetIdChunks.map(async (assetIds) =>
            remoteClient.asset.findMissingAssets.query({ assetIds }),
          ),
        );

        const missingRemoteAssetsSet = new Set(
          results.flatMap((result) => result.missingAssetIds),
        );

        const missingLocalAssetChunks = chunk(
          missingLocalAssets,
          maxFindMissingAssetsCount,
        );

        const missingLocalResults = await Promise.all(
          missingLocalAssetChunks.map(async (assetIds) =>
            remoteClient.asset.findMissingAssets.query({ assetIds }),
          ),
        );

        const missingRemoteDownloadAssetsSet = new Set(
          missingLocalResults.flatMap((result) => result.missingAssetIds),
        );

        // Diff to find assets to upload and download
        const toUpload: AssetId[] = [];
        for (const id of localAssets) {
          if (missingRemoteAssetsSet.has(id)) {
            toUpload.push(id);
          }
        }

        const toDownload: AssetId[] = [];
        for (const id of missingLocalAssets) {
          if (!missingRemoteDownloadAssetsSet.has(id)) {
            toDownload.push(id);
          }
        }

        if (toUpload.length > 0 || toDownload.length > 0) {
          logger.info(
            {
              remoteSyncId: remoteSync.id,
              toDownloadCount: toDownload.length,
              toUploadCount: toUpload.length,
            },
            `Calculated asset sync delta`,
          );
        }

        // Fan out upload jobs
        if (toUpload.length > 0) {
          await step.sendEvent(
            `emit-uploads`,
            toUpload.map((assetId) =>
              serverSyncAssetPushEvent.create({
                remoteSyncId: remoteSync.id,
                assetId,
              }),
            ),
          );
        }

        // Fan out download jobs
        if (toDownload.length > 0) {
          await step.sendEvent(
            `emit-downloads`,
            toDownload.map((assetId) =>
              serverSyncAssetPullEvent.create({
                remoteSyncId: remoteSync.id,
                assetId,
              }),
            ),
          );
        }
      } catch (error) {
        logger.error(
          { err: error, remoteSyncId: remoteSync.id },
          `Error during asset blob sync`,
        );
      }
    }
  },
);

const syncUploadedAssetToRemotes = inngest.createFunction(
  {
    id: `serverSync/syncUploadedAssetToRemotes`,
    singleton: {
      key: `event.data.assetId`,
      mode: `skip`,
    },
    triggers: [assetUploadSucessEvent],
  },
  async ({ event, step, logger }) => {
    await onlineOrRetryLater();

    const { userId, assetId } = event.data;

    const remoteSyncs = await step.run(`findSyncRulesForUser`, async () =>
      withDrizzle((db) =>
        db.query.remoteSync.findMany({
          where: eq(s.remoteSync.userId, userId),
        }),
      ),
    );

    if (remoteSyncs.length === 0) {
      logger.info(
        {
          assetId,
          userId,
        },
        `No remote sync rules found for uploaded asset`,
      );
      return;
    }

    for (const remoteSync of remoteSyncs) {
      await step.sendEvent(
        `emit-upload-${remoteSync.id}`,
        serverSyncAssetPushEvent.create({
          remoteSyncId: remoteSync.id,
          assetId,
        }),
      );
    }
  },
);

const assetPush = inngest.createFunction(
  {
    id: `serverSync/asset.push`,
    singleton: {
      key: `event.data.remoteSyncId + "-" + event.data.assetId`,
      mode: `skip`,
    },
    throttle: {
      limit: 5,
      period: `10s`,
    },
    triggers: [serverSyncAssetPushEvent],
  },
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
      logger.error(
        { assetId, remoteSyncId },
        `Remote sync rule not found for upload`,
      );
      return;
    }

    try {
      await step.run(`upload-asset`, async () => {
        await uploadAssetToRemote(
          createTrpcClient(remoteSync.remoteUrl, remoteSync.remoteSessionId),
          assetId,
        );
      });

      logger.info({ assetId, remoteSyncId }, `Successfully uploaded asset`);
    } catch (error) {
      logger.error(
        { assetId, err: error, remoteSyncId },
        `Failed to upload asset`,
      );
      throw error;
    }
  },
);

const assetPull = inngest.createFunction(
  {
    id: `serverSync/asset.pull`,
    singleton: {
      key: `event.data.remoteSyncId + "-" + event.data.assetId`,
      mode: `skip`,
    },
    throttle: {
      limit: 5,
      period: `10s`,
    },
    triggers: [serverSyncAssetPullEvent],
  },
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
      logger.error(
        { assetId, remoteSyncId },
        `Remote sync rule not found for download`,
      );
      return;
    }

    try {
      await step.run(`downloadAsset-${assetId}`, async () => {
        await downloadAssetFromRemote(
          createTrpcClient(remoteSync.remoteUrl, remoteSync.remoteSessionId),
          assetId,
        );
      });

      logger.info({ assetId, remoteSyncId }, `Successfully downloaded asset`);
    } catch (error) {
      logger.error(
        { assetId, err: error, remoteSyncId },
        `Failed to download asset`,
      );
      throw error;
    }
  },
);

export const functions = [
  replicachePush,
  replicachePull,
  retryFailedMutations,
  assetSyncAll,
  syncUploadedAssetToRemotes,
  assetPush,
  assetPull,
];
