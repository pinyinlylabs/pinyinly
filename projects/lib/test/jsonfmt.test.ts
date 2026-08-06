import {
  getJsonIndentLevelsForFilePath,
  jsonStringifyShallowIndent,
} from "#jsonfmt.ts";
import path from "node:path";
import * as fs from "#fs.ts";
import { describe, expect, test } from "vitest";

describe(
  `jsonStringifyShallowIndent` satisfies HasNameOf<
    typeof jsonStringifyShallowIndent
  >,
  () => {
    const input = {
      foo: `bar`,
      baz: { qux: `quux`, quux: { qix: `qiix` } },
    };

    test(`should stringify JSON consistent object keys`, () => {
      expect(jsonStringifyShallowIndent({ a: 1, b: 1, c: 1 })).toEqual(
        jsonStringifyShallowIndent({ c: 1, b: 1, a: 1 }),
      );
    });

    test(`should keep arrays as arrays`, () => {
      const output = jsonStringifyShallowIndent({ b: [1, 2] });
      expect(output).toMatchInlineSnapshot(
        `
          "{
            "b":[1,2]
          }"
        `,
      );
    });

    test(`should stringify JSON with indentation = 0`, () => {
      const output = jsonStringifyShallowIndent(input, 0);
      expect(output).toMatchInlineSnapshot(
        `"{"baz":{"quux":{"qix":"qiix"},"qux":"quux"},"foo":"bar"}"`,
      );
    });

    test(`should stringify JSON with indentation = 1`, () => {
      const output = jsonStringifyShallowIndent(input, 1);
      expect(output).toMatchInlineSnapshot(`
        "{
          "baz":{"quux":{"qix":"qiix"},"qux":"quux"},
          "foo":"bar"
        }"
      `);
    });

    test(`should stringify JSON with indentation = 2`, () => {
      const output = jsonStringifyShallowIndent(input, 2);
      expect(output).toMatchInlineSnapshot(`
        "{
          "baz":{
            "quux":{"qix":"qiix"},
            "qux":"quux"
          },
          "foo":"bar"
        }"
      `);
    });

    test(`should stringify JSON with indentation = 3`, () => {
      const output = jsonStringifyShallowIndent(input, 3);
      expect(output).toMatchInlineSnapshot(`
        "{
          "baz":{
            "quux":{
              "qix":"qiix"
            },
            "qux":"quux"
          },
          "foo":"bar"
        }"
      `);
    });
  },
);

describe(
  `getJsonIndentForFilePath` satisfies HasNameOf<
    typeof getJsonIndentLevelsForFilePath
  >,
  () => {
    test(`falls back to 2 when config file is missing`, async () => {
      await using resource = await fs.tempDir();
      const filePath = path.join(resource.tempDir, `foo.json`);
      const indent = await getJsonIndentLevelsForFilePath(filePath);
      expect(indent).toBe(2);
    });

    test(`uses first matching rule`, async () => {
      await using resource = await fs.tempDir();
      await fs.writeFile(
        path.join(resource.tempDir, `.jsonfmtrc.json`),
        JSON.stringify(
          {
            rules: [
              { files: [`**/*.json`], indent: 1 },
              { files: [`projects/app/test/data/**/*.json`], indent: 3 },
            ],
          },
          null,
          2,
        ),
        `utf8`,
      );

      const filePath = path.join(
        resource.tempDir,
        `projects/app/test/data/example.json`,
      );
      const indent = await getJsonIndentLevelsForFilePath(filePath);
      expect(indent).toBe(1);
    });

    test(`uses fallback when no rules match`, async () => {
      await using resource = await fs.tempDir();
      await fs.writeFile(
        path.join(resource.tempDir, `.jsonfmtrc.json`),
        JSON.stringify(
          {
            rules: [{ files: [`projects/app/test/data/**/*.json`], indent: 1 }],
          },
          null,
          2,
        ),
        `utf8`,
      );

      const filePath = path.join(resource.tempDir, `projects/lib/package.json`);
      const indent = await getJsonIndentLevelsForFilePath(filePath);
      expect(indent).toBe(2);
    });
  },
);
