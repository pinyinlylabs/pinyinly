import type {
  ReadTransaction,
  ReplicacheOptions,
  WriteTransaction,
} from "replicache";
import { TEST_LICENSE_KEY } from "replicache";

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
  licenseKey: TEST_LICENSE_KEY,
  kvStore: `mem`,
  pullInterval: null,
  logLevel: `error`,
});

/**
 * Create a mock transaction for tests using Vitest
 */
export function makeMockTx() {
  const readTx: ReadTransaction = {
    get: async () => undefined,
    scan: () => null as never,
    clientID: null as never,
    environment: null as never,
    location: null as never,
    has: async () => false,
    isEmpty: null as never,
  };

  const writeTx: WriteTransaction = {
    ...readTx,
    set: async () => undefined,
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
