import { pull, push } from "#server/lib/replicache.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { withTxTest } from "./dbHelpers";

await test(`${push.name} suite`, async (t) => {
  const txTest = withTxTest(t, { isolationLevel: `repeatable read` });

  await txTest(
    `returns correct error for invalid schema version`,
    async (tx) => {
      const result = await push(tx, `1`, {
        profileId: ``,
        clientGroupId: ``,
        pushVersion: 1,
        schemaVersion: `666`,
        mutations: [],
      });

      assert.deepEqual(result, {
        error: `VersionNotSupported`,
        versionType: `schema`,
      });
    },
  );
});

await test(`${pull.name} suite`, async (t) => {
  const txTest = withTxTest(t, { isolationLevel: `repeatable read` });

  await txTest(
    `returns correct error for invalid schema version`,
    async (tx) => {
      const result = await pull(tx, `5`, {
        profileId: ``,
        clientGroupId: ``,
        pullVersion: 1,
        schemaVersion: `666`,
        cookie: null,
      });

      assert.deepEqual(result, {
        error: `VersionNotSupported`,
        versionType: `schema`,
      });
    },
  );
});
