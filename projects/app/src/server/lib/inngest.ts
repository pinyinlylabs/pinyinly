import { v6 } from "@/data/rizzleSchema";
import { loadDictionary } from "@/dictionary/dictionary";
import { AppRouter } from "@/server/routers/_app";
import { preflightCheckEnvVars } from "@/util/env";
import { httpSessionHeader } from "@/util/http";
import { invariant } from "@haohaohow/lib/invariant";
import { sentryMiddleware } from "@inngest/middleware-sentry";
import { createTRPCClient, httpLink } from "@trpc/client";
import { notInArray } from "drizzle-orm";
import { Inngest } from "inngest";
import * as postmark from "postmark";
import { z } from "zod";
import * as s from "../schema";
import { substring, withDrizzle } from "./db";
import {
  getReplicacheClientMutationsSince,
  getReplicacheClientStateForUser,
  updateRemoteSyncClientLastMutationId,
  withDrizzleIgnoreRemoteClientForRemoteSync,
  withDrizzlePushChunked,
} from "./replicache";

const { POSTMARK_SERVER_TOKEN } = process.env;

if (preflightCheckEnvVars) {
  invariant(POSTMARK_SERVER_TOKEN != null, `POSTMARK_SERVER_TOKEN is required`);
}

// Create a client to send and receive events
export const inngest = new Inngest({
  id: `my-app`,
  middleware: [sentryMiddleware()],
});

// Your new function:
const helloWorld = inngest.createFunction(
  { id: `hello-world` },
  { event: `test/hello.world` },
  async ({ event, step }) => {
    await step.sleep(`wait-a-moment`, `1s`);

    const data2 = await step.run(`validateData`, () =>
      z
        .object({
          email: z.string(),
        })
        .partial({ email: true })
        .parse(event.data),
    );

    const data = z
      .object({
        email: z.string(),
      })
      .partial({ email: true })
      .parse(event.data);

    return {
      message: `Hello ${data.email ?? `world`}!`,
      message2: `Hello ${data2.email ?? `world`}!`,
    };
  },
);

// Your new function:
const helloWorld2 = inngest.createFunction(
  { id: `hello-world2` },
  { event: `test/hello.world2` },
  async ({ step }) => {
    await step.sleep(`wait-a-moment`, `1s`);
    await step.sleep(`wait-a-moment2`, `1s`);

    const data2 = await step.run(`getData2`, () => `data2`);

    const data3 = await step.run(`getData3`, () =>
      z
        .object({
          email: z.string(),
        })
        .parse({ email: `hardcoded email` }),
    );

    return {
      data2,
      data3,
    };
  },
);

const helloWorldEmail = inngest.createFunction(
  { id: `hello-world-email` },
  { event: `test/hello.world.email` },
  async ({ step }) => {
    invariant(POSTMARK_SERVER_TOKEN != null);
    const client = new postmark.ServerClient(POSTMARK_SERVER_TOKEN);

    const response = await step.run(`sendEmail`, () =>
      client.sendEmail({
        From: `hello@haohao.how`,
        To: `brad@haohao.how`,
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
            [httpSessionHeader]: sessionId,
          };
        },
      }),
    ],
  });
}

const syncRemotePush = inngest.createFunction(
  { id: `syncRemotePush`, concurrency: 1 },
  {
    // Sync every 5 minutes
    cron: `*/5 * * * *`,
  },
  async ({ step }) => {
    // Find all sync rules
    const remoteSyncs = await step.run(`findSyncRules`, async () => {
      const remoteSyncs = await withDrizzle(async (db) => {
        return await db.query.remoteSync.findMany();
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
          return await withDrizzle(
            async (db) =>
              await getReplicacheClientStateForUser(db, remoteSync.userId),
          );
        },
      );

      for (const {
        clientId,
        lastMutationId,
        schemaVersion,
      } of remoteSyncClients) {
        if (schemaVersion !== v6.version) {
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

              await trpcClient.replicache.push.mutate({
                mutations: mutationBatchToPush,
                profileId: remoteSync.remoteProfileId,
                clientGroupId: remoteSync.remoteClientGroupId,
                pushVersion: 1,
                schemaVersion,
              });

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
  { id: `syncRemotePull`, concurrency: 1 },
  {
    // Sync every 5 minutes
    cron: `*/5 * * * *`,
  },
  async ({ step }) => {
    // Find all sync rules
    const remoteSyncs = await step.run(
      `findSyncRules`,
      async () =>
        await withDrizzle(async (db) => await db.query.remoteSync.findMany()),
    );

    // Iterate over each remote sync rule and process it one by one.
    for (const remoteSync of remoteSyncs) {
      const schemaVersions = [v6.version];

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const fetchedMutations = await step.run(
          // Putting the user ID in is unnecessary but it helps debugging.
          `fetchMutations-${remoteSync.id}-${remoteSync.userId}`,
          async () => {
            const clientsState = await withDrizzle(
              async (db) =>
                await getReplicacheClientStateForUser(db, remoteSync.userId),
            );

            const lastMutationIds = Object.fromEntries(
              clientsState.map((c) => [c.clientId, c.lastMutationId]),
            );

            const trpcClient = createTrpcClient(
              remoteSync.remoteUrl,
              remoteSync.remoteSessionId,
            );

            return await trpcClient.replicache.fetchMutations.mutate({
              schemaVersions,
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
                await withDrizzleIgnoreRemoteClientForRemoteSync(
                  remoteSync.id,
                  remoteClientIds,
                );
              }

              // Finally apply the mutations.
              const result = await withDrizzlePushChunked(remoteSync.userId, {
                schemaVersion,
                profileId: remoteSync.remoteProfileId,
                clientGroupId,
                pushVersion: 1,
                mutations,
              });

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
    const allHanziWords = [...dict.keys()];

    await step.run(`check skillRating.skill`, async () => {
      const unknownSkills = await withDrizzle(
        async (db) =>
          await db
            .selectDistinct({ skill: s.skillRating.skill })
            .from(s.skillRating)
            .where(
              notInArray(
                substring(s.skillRating.skill, /^\w+:(.+)$/),
                allHanziWords,
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
      const unknownSkills = await withDrizzle(
        async (db) =>
          await db
            .selectDistinct({ skill: s.skillState.skill })
            .from(s.skillState)
            .where(
              notInArray(
                substring(s.skillState.skill, /^\w+:(.+)$/),
                allHanziWords,
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

// Create an empty array where we'll export future Inngest functions
export const functions = [
  dataIntegrityDictionary,
  helloWorld,
  helloWorld2,
  helloWorldEmail,
  syncRemotePull,
  syncRemotePush,
];
