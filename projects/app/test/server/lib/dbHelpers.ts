import type { Drizzle, Transaction } from "#server/lib/db.ts";
import * as s from "#server/pgSchema.ts";
import { nanoid } from "#util/nanoid.ts";
import { PGlite } from "@electric-sql/pglite";
import { nonNullable } from "@haohaohow/lib/invariant";
import type { PgTransactionConfig } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import type { TestContext } from "vitest";
import { expect, test } from "vitest";

const migrationsFolder = import.meta.dirname + `/../../../drizzle`;

let dataDir: File | Blob | undefined;

async function createTestDb(annotate?: TestContext[`annotate`]) {
  let start = new Date();
  const client = await PGlite.create({ loadDataDir: dataDir });
  await annotate?.(`created pglite (${Date.now() - start.getTime()}ms)`);

  const db = drizzle(client, { schema: s });

  // Run migrations and cache a snapshot of the DB.
  if (dataDir == null) {
    start = new Date();
    await migrate(db, { migrationsFolder });
    await annotate?.(`applied migrations (${Date.now() - start.getTime()}ms)`);
    start = new Date();
    dataDir = await client.dumpDataDir();
    await annotate?.(
      `cached pglite snapshot (${Date.now() - start.getTime()}ms)`,
    );
  }

  return Object.assign(db, {
    close: () => client.close(),
  });
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export const txTest = test
  // TODO. can i flatten this?
  .extend<{ db: TestDb }>({
    db: [
      async ({ annotate }, use) => {
        // Create a fresh DB for this test
        const testDb = await createTestDb(annotate);

        try {
          await use(testDb);
        } finally {
          // Clean up DB after the test
          await testDb.close();
        }
      },
      { scope: `worker` },
    ],
  })
  .extend<{ tx: Transaction; pgConfig?: PgTransactionConfig }>({
    pgConfig: async ({}, use) => {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      await use(undefined);
    },
    tx: async ({ db, pgConfig }, use) => {
      class TestRollback extends Error {}

      await db
        .transaction(async (tx) => {
          await use(tx as Transaction);
          throw new TestRollback();
        }, pgConfig)
        .catch((error: unknown) => {
          if (!(error instanceof TestRollback)) {
            throw error;
          }
        });
    },
  });

export const dbTest = test.extend<{ db: TestDb }>({
  db: async ({ annotate }, use) => {
    // Create a fresh DB for this test
    const testDb = await createTestDb(annotate);

    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      await use(testDb);
    } finally {
      // Clean up DB after the test
      await testDb.close();
    }
  },
});

export async function createUser(tx: Drizzle, id: string = nanoid()) {
  const [user] = await tx.insert(s.user).values([{ id }]).returning();
  expect(user).toBeDefined();
  return nonNullable(user);
}
