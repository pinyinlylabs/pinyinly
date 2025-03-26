import { ReplicacheOptions, TEST_LICENSE_KEY } from "replicache";

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
