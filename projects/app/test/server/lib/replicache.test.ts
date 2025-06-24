import { currentSchema as schema } from "#data/rizzleSchema.ts";
import { fetchMutations, pull, push } from "#server/lib/replicache.ts";
import { nanoid } from "#util/nanoid.ts";
import { describe, expect } from "vitest";
import { createUser, txTest } from "./dbHelpers";

describe(`${push.name} suite`, () => {
  txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

  txTest(`returns correct error for invalid schema version`, async ({ tx }) => {
    const result = await push(tx, `1`, {
      profileId: ``,
      clientGroupId: ``,
      pushVersion: 1,
      schemaVersion: `666`,
      mutations: [],
    });

    expect(result).toEqual({
      error: `VersionNotSupported`,
      versionType: `schema`,
    });
  });
});

describe(`${pull.name} suite`, () => {
  txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

  txTest(`returns correct error for invalid schema version`, async ({ tx }) => {
    const result = await pull(tx, `5`, {
      profileId: ``,
      clientGroupId: ``,
      pullVersion: 1,
      schemaVersion: `666`,
      cookie: null,
    });

    expect(result).toEqual({
      error: `VersionNotSupported`,
      versionType: `schema`,
    });
  });
});

describe(`${fetchMutations.name} suite`, () => {
  txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

  txTest(`works for non-existant user and client group`, async ({ tx }) => {
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

    expect(
      await fetchMutations(tx, user.id, {
        schemaVersions: [schema.version],
        lastMutationIds: {},
      }),
    ).toEqual({
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
    });
  });
});
