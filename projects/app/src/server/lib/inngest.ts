import { v5 } from "@/data/rizzleSchema";
import { AppRouter } from "@/server/routers/_app";
import {
  arrayFilterUniqueWithKey,
  sortComparatorNumber,
} from "@/util/collections";
import { preflightCheckEnvVars } from "@/util/env";
import { mutationSchema } from "@/util/rizzle";
import { invariant } from "@haohaohow/lib/invariant";
import { sentryMiddleware } from "@inngest/middleware-sentry";
import { createTRPCClient, httpLink } from "@trpc/client";
import { and, eq, sql } from "drizzle-orm";
import { Inngest } from "inngest";
import * as postmark from "postmark";
import { z } from "zod";
import * as schema from "../schema";
import { withDrizzle } from "./db";

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

const syncRemote = inngest.createFunction(
  { id: `sync-remote` },
  { event: `test/sync.remote` },
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
      const clientSyncStates = await step.run(
        // Putting the user ID in is unnecessary but it helps debugging.
        `fetchRemoteSyncState-${remoteSync.id}-${remoteSync.userId}`,
        async () => {
          // calculate which replicache clients need to be synced
          return await withDrizzle(async (db) => {
            return await db
              .select({
                clientId: schema.replicacheClient.id,
                schemaVersion: schema.replicacheClientGroup.schemaVersion,
                lastMutationId: schema.replicacheClient.lastMutationId,
              })
              .from(schema.replicacheClient)
              .leftJoin(
                schema.replicacheClientGroup,
                and(
                  eq(
                    schema.replicacheClient.clientGroupId,
                    schema.replicacheClientGroup.id,
                  ),
                  eq(schema.replicacheClientGroup.userId, remoteSync.userId),
                ),
              );
          });
        },
      );

      for (const {
        clientId,
        lastMutationId,
        schemaVersion,
      } of clientSyncStates) {
        if (schemaVersion !== v5.version) {
          console.error(
            `Unable to sync client without schemaVersion, skipping…`,
            { clientId, lastMutationId, schemaVersion },
          );
          continue;
        }

        const prevLastMutationId =
          remoteSync.lastSyncedMutationIds[clientId] ?? 0;

        // fetch all mutations for the client
        if (prevLastMutationId < lastMutationId) {
          await step.run(`syncRemoteClient-${clientId}`, async () => {
            // Fetch mutations that need to be sent.
            const mutations = await withDrizzle(async (db) => {
              return await db.query.replicacheMutation.findMany({
                where: and(
                  eq(schema.replicacheMutation.clientId, clientId),
                  sql`${schema.replicacheMutation.mutation}->>'id' > ${prevLastMutationId}`,
                ),
              });
            });

            // push to server

            const sortedMutations = mutations
              .map((x) => mutationSchema.parse(x.mutation))
              .filter(arrayFilterUniqueWithKey((x) => x.id))
              .sort(sortComparatorNumber((x) => x.id));

            const client = createTRPCClient<AppRouter>({
              links: [
                httpLink({
                  url: remoteSync.remoteUrl,
                  // You can pass any HTTP headers you wish here
                  headers() {
                    return {
                      [`x-hhh-session`]: remoteSync.remoteSessionId,
                    };
                  },
                }),
              ],
            });

            await client.replicache.push.mutate({
              mutations: sortedMutations,
              profileId: remoteSync.remoteProfileId,
              clientGroupId: remoteSync.remoteClientGroupId,
              pushVersion: 1,
              schemaVersion,
            });

            const newLastMutationId =
              sortedMutations[sortedMutations.length - 1]?.id;
            invariant(newLastMutationId != null, `newLastMutationId is null`);

            // Update the remoteSync record with the new lastMutationId for
            // the client, so that in the future only mutations after that are
            // sent.
            await withDrizzle(async (db) => {
              await db.transaction(
                async (tx) => {
                  // Get a fresh copy since we're overwriting it but we only
                  // want to update one key. This could probably be done more
                  // efficiently in raw SQL.
                  const res = await tx.query.remoteSync.findFirst({
                    where: eq(schema.remoteSync.id, remoteSync.id),
                  });
                  invariant(
                    res != null,
                    `could not find remoteSync id=${remoteSync.id}`,
                  );

                  await tx
                    .update(schema.remoteSync)
                    .set({
                      lastSyncedMutationIds: {
                        ...res.lastSyncedMutationIds,
                        [clientId]: newLastMutationId,
                      },
                    })
                    .where(eq(schema.remoteSync.id, remoteSync.id));
                },
                { isolationLevel: `repeatable read` },
              );
            });
          });
        }
      }
    }
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [helloWorld, helloWorld2, helloWorldEmail, syncRemote];
