import { splitN, unicodeShortIdentifier } from "#util/unicode.ts";
import { describe, expect, test } from "vitest";

describe(
  `unicodeShortIdentifier suite` satisfies HasNameOf<
    typeof unicodeShortIdentifier
  >,
  () => {
    test(`works for hanzi`, () => {
      expect(unicodeShortIdentifier(`汉`)).toEqual(`U+6C49`);
    });
  },
);

describe(`splitN suite` satisfies HasNameOf<typeof splitN>, () => {
  test.for([
    [`a b`, ` `, 0, [`a b`]],
    [`a b`, ` `, 1, [`a`, `b`]],
    [`a b c`, ` `, 1, [`a`, `b c`]],
    [`a b c`, ` `, 1, [`a`, `b c`]],
    [`a b c`, ` `, 2, [`a`, `b`, `c`]],
    [`a  b`, `  `, 1, [`a`, `b`]],
  ] as const)(
    `splits a string into N parts %s`,
    ([input, separator, limit, expected]) => {
      expect(splitN(input, separator, limit)).toEqual(expected);
    },
  );

  test(`throws on empty separator`, () => {
    expect(() => splitN(`a`, ``, 1)).toThrowErrorMatchingInlineSnapshot(
      `[Error: separator must be non-empty]`,
    );
  });

  test(`throws on negative limit`, () => {
    expect(() => splitN(`a`, ` `, -1)).toThrowErrorMatchingInlineSnapshot(
      `[Error: limit must be non-negative]`,
    );
  });
});
