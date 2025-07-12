import { hanziWordSkillKinds } from "@/data/model";
import { supportedSchemas } from "@/data/rizzleSchema";
import { hanziWordSkill } from "@/data/skills";
import {
  loadDictionary,
  loadHanziWordMigrations,
} from "@/dictionary/dictionary";
import type { AppRouter } from "@/server/routers/_app";
import { preflightCheckEnvVars } from "@/util/env";
import { httpSessionHeaderTx } from "@/util/http";
import { sentryMiddleware } from "@inngest/middleware-sentry";
import { invariant } from "@pinyinly/lib/invariant";
import { createTRPCClient, httpLink } from "@trpc/client";
import { subDays } from "date-fns/subDays";
import { inArray, lt, notInArray, sql } from "drizzle-orm";
import { Inngest } from "inngest";
import * as postmark from "postmark";
import * as s from "../pgSchema";
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

const { POSTMARK_SERVER_TOKEN } = process.env;

if (preflightCheckEnvVars) {
  invariant(POSTMARK_SERVER_TOKEN != null, `POSTMARK_SERVER_TOKEN is required`);
}

// Create a client to send and receive events
export const inngest = new Inngest({
  id: `my-app`,
  middleware: [sentryMiddleware()],
});

const devTestThrowRootError = inngest.createFunction(
  { id: `test-throw-root-error` },
  { event: `test/test-throw-root-error` },
  () => {
    throw new Error(`test error`);
  },
);

const devTestThrowStepError = inngest.createFunction(
  { id: `test-throw-step-error` },
  { event: `test/test-throw-step-error` },
  async ({ step }) => {
    await step.run(`throw error`, () => {
      throw new Error(`test error`);
    });
  },
);

const devTestLogRootError = inngest.createFunction(
  { id: `test-log-root-error` },
  { event: `test/test-log-root-error` },
  () => {
    console.error(new Error(`test error`));
  },
);

const devTestLogStepError = inngest.createFunction(
  { id: `test-log-step-error` },
  { event: `test/test-log-step-error` },
  async ({ step }) => {
    await step.run(`log error`, () => {
      console.error(new Error(`test error`));
    });
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
          await withDrizzle(async (db) => {
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

    const bloatRows = await step.run(
      `query bloat stats`,
      async () =>
        await withDrizzle(async (db) => {
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
            async () => {
              // Fetch mutations that need to be sent.
              const mutationBatchToPush = await withDrizzle(
                async (db) =>
                  await getReplicacheClientMutationsSince(db, {
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
  {
    id: `syncRemotePull`,
    singleton: { mode: `skip` },
  },
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
              const result = await withDrizzle(
                async (db) =>
                  await pushChunked(db, remoteSync.userId, {
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

    await step.run(
      `skillRating.skill renames`,
      async () =>
        await withDrizzle(
          async (db) =>
            await pgBatchUpdate(db, {
              whereColumn: s.skillRating.skill,
              setColumn: s.skillRating.skill,
              updates: skillRenames,
            }),
        ),
    );

    await step.run(
      `skillRating.skill deletes`,
      async () =>
        await withDrizzle(async (db) => {
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
      return await withDrizzle(async (db) => {
        return await withRepeatableReadTransaction(db, async (db) => {
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

    await step.run(
      `skillState.skill deletes`,
      async () =>
        await withDrizzle(async (db) => {
          const deletedRows = await db
            .delete(s.skillState)
            .where(inArray(s.skillState.skill, skillDeletes))
            .returning();

          return { deletedRows };
        }),
    );
  },
);

// Create an empty array where we'll export future Inngest functions
export const functions = [
  dataIntegrityDictionary,
  helloWorldEmail,
  migrateHanziWords,
  pgFullVacuumGarbageCollection,
  replicacheGarbageCollection,
  syncRemotePull,
  syncRemotePush,
  devTestThrowRootError,
  devTestThrowStepError,
  devTestLogRootError,
  devTestLogStepError,
];
