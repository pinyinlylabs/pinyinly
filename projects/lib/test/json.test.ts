import { jsonStringifyShallowIndent } from "#json.ts";
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
