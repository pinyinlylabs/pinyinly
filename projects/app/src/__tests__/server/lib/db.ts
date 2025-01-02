import { Transaction } from "@/server/lib/db";
import * as schema from "@/server/schema";
import { PGlite } from "@electric-sql/pglite";
import { PgTransactionConfig } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { TestContext } from "node:test";
import url from "node:url";

const __dirname = url.fileURLToPath(new URL(`.`, import.meta.url));
const migrationsFolder = __dirname + `../../../../drizzle`;

let dataDir: File | Blob | undefined;
async function createTestDb(t: TestContext) {
  let start = new Date();
  const client = await PGlite.create({ loadDataDir: dataDir });
  t.diagnostic(`created pglite (${new Date().getTime() - start.getTime()}ms)`);

  const db = drizzle(client, { schema });

  // Run migrations and cache a snapshot of the DB.
  if (dataDir == null) {
    start = new Date();
    await migrate(db, { migrationsFolder });
    t.diagnostic(
      `applied migrations (${new Date().getTime() - start.getTime()}ms)`,
    );
    start = new Date();
    dataDir = await client.dumpDataDir();
    t.diagnostic(
      `cached pglite snapshot (${new Date().getTime() - start.getTime()}ms)`,
    );
  }

  return Object.assign(db, {
    close: () => client.close(),
  });
}

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export const withTxTest = (t: TestContext, config?: PgTransactionConfig) => {
  let db: TestDb | undefined;

  type TestFn = (tx: Transaction, t: TestContext) => Promise<void>;
  class TestRollback extends Error {}

  async function txTest(name: string, fn: TestFn) {
    await t.test(name, async (t2) => {
      if (db == null) {
        db = await createTestDb(t2);
        t.after(() => db?.close());
      }

      await db
        .transaction(async (tx) => {
          await fn(tx as Transaction, t2);
          throw new TestRollback();
        }, config)
        .catch((e: unknown) => {
          if (!(e instanceof TestRollback)) {
            throw e;
          }
        });
    });
  }

  return Object.assign(txTest, {
    skip: (msg: string, _fn?: TestFn) => t.test(msg, { skip: true }),
    todo: (msg: string, _fn?: TestFn) => t.test(msg, { todo: true }),
  });
};

export const withDbTest = (t: TestContext) => {
  type TestFn = (db: TestDb, t: TestContext) => Promise<void>;

  async function dbTest(name: string, fn: TestFn) {
    await t.test(name, async (t2) => {
      const testDb = await createTestDb(t2);
      t2.after(() => testDb.close());
      await fn(testDb, t2);
    });
  }

  return Object.assign(dbTest, {
    skip: (msg: string, _fn?: TestFn) => t.test(msg, { skip: true }),
    todo: (msg: string, _fn?: TestFn) => t.test(msg, { todo: true }),
  });
};
