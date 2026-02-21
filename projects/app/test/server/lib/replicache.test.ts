import { currentSchema as schema } from "#data/rizzleSchema.ts";
import { fetchMutations, pull, push } from "#server/lib/replicache.ts";
import { projectRoot } from "#test/helpers.ts";
import { nanoid } from "#util/nanoid.ts";
import { globSync } from "@pinyinly/lib/fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { createUser, txTest } from "./dbHelpers.ts";

describe(`push suite` satisfies HasNameOf<typeof push>, () => {
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

describe(`pull suite` satisfies HasNameOf<typeof pull>, () => {
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

describe(
  `fetchMutations suite` satisfies HasNameOf<typeof fetchMutations>,
  () => {
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
  },
);

describe(`schema test coverage`, () => {
  test(`every replicache schema version has a test file`, () => {
    const schemaDir = path.join(projectRoot, `src/server/lib/replicache`);
    const testDir = path.join(projectRoot, `test/server/lib/replicache`);

    const schemaFiles = globSync(`v*.ts`, { cwd: schemaDir });

    expect(schemaFiles.length).toBeGreaterThan(0);

    const testFiles = globSync(`v*.test.ts`, { cwd: testDir });

    const schemaVersions = schemaFiles
      .map((f) => f.match(/v(\d+)\.ts/)?.[1])
      .filter((v): v is string => v != null);

    const testedVersions = testFiles
      .map((f) => f.match(/v(\d+)\.test\.ts/)?.[1])
      .filter((v): v is string => v != null);

    const missingTestVersions = schemaVersions.filter(
      (v) => !testedVersions.includes(v),
    );

    expect(
      missingTestVersions,
      `Missing test files for schema versions: ${missingTestVersions.join(
        `, `,
      )}`,
    ).toEqual([]);
  });
});
