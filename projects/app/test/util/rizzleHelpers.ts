import type { Db } from "#client/query.js";
import { makeDb } from "#client/query.js";
import { mutators } from "#data/rizzleMutators.js";
import type { Rizzle } from "#data/rizzleSchema.js";
import { currentSchema } from "#data/rizzleSchema.js";
import { r } from "#util/rizzle.ts";
import type { Fixtures } from "@vitest/runner";
import type {
  ReadTransaction,
  ReplicacheOptions,
  WriteTransaction,
} from "replicache";

let _testReplicacheNameId = 0;
/**
 * Create a {@link ReplicacheOptions} object suitable for testing.
 *
 * @param name The name of the database. By default it will be unique for each
 * call but can a value can be passed in if you want to share a database.
 * @returns
 */
export const testReplicacheOptions = (
  name = `test${_testReplicacheNameId++}`,
): ReplicacheOptions<never> => ({
  name,
  kvStore: `mem`,
  pullInterval: null,
  logLevel: `error`,
});

/**
 * Create a mock transaction for tests using Vitest
 */
export function makeMockTx() {
  const readTx: ReadTransaction = {
    get: async (): Promise<undefined> => {},
    scan: () => null as never,
    clientID: null as never,
    environment: null as never,
    location: null as never,
    has: async () => false,
    isEmpty: null as never,
  };

  const writeTx: WriteTransaction = {
    ...readTx,
    set: async () => {},
    mutationID: null as never,
    reason: null as never,
    put: null as never,
    del: null as never,
  };

  // Return the mock transaction with a dispose method to clean up between tests
  return {
    ...writeTx,
    readonly: readTx,
    [Symbol.dispose]: () => null,
  };
}

export const rizzleFixture: Fixtures<{ rizzle: Rizzle }> = {
  rizzle: [
    async ({}, use) => {
      await using rizzle = r.replicache(
        testReplicacheOptions(),
        currentSchema,
        mutators,
      );
      await use(rizzle);
    },
    { scope: `test` },
  ],
};

export const dbFixture: Fixtures<{ db: Db }, { rizzle: Rizzle }> = {
  db: [
    async ({ rizzle }, use) => {
      const db = makeDb(rizzle);
      await use(db);
    },
    { scope: `test` },
  ],
};
