import { currentSchema as schema } from "#data/rizzleSchema.ts";
import { fetchMutations, pull, push } from "#server/lib/replicache.ts";
import { nanoid } from "#util/nanoid.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { createUser, withTxTest } from "./dbHelpers";

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

await test(`${fetchMutations.name} suite`, async (t) => {
  const txTest = withTxTest(t, { isolationLevel: `repeatable read` });

  await txTest(`works for non-existant user and client group`, async (tx) => {
    const clientGroupId = nanoid();
    const clientId = nanoid();

    const user = await createUser(tx);

    // Push a mutation from client 1
    await push(tx, user.id, {
      profileId: ``,
      clientGroupId,
      pushVersion: 1,
      schemaVersion: schema.version,
      mutations: [
        {
          id: 1,
          name: `noop`,
          args: { arg1: `value1` },
          timestamp: 1,
          clientId,
        },
      ],
    });

    assert.deepEqual(
      await fetchMutations(tx, user.id, {
        schemaVersions: [schema.version],
        lastMutationIds: {},
      }),
      {
        mutations: [
          {
            clientGroupId,
            mutations: [
              {
                args: { arg1: `value1` },
                clientId,
                id: 1,
                name: `noop`,
                timestamp: 1,
              },
            ],
            schemaVersion: schema.version,
          },
        ],
      },
    );
  });
});
