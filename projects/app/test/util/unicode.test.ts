import { unicodeShortIdentifier } from "#util/unicode.ts";
import { describe, expect, test } from "vitest";

describe(`${unicodeShortIdentifier.name} suite`, () => {
  test(`works for hanzi`, () => {
    expect(unicodeShortIdentifier(`汉`)).toEqual(`U+6C49`);
  });
});
