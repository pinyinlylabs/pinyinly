import type { HanziCharacter } from "#data/model.ts";
import { deepDecomposeHanzi } from "#dictionary.ts";
import { describe, test } from "vitest";
import { 汉 } from "./data/helpers.ts";
import type { IsEqual } from "@pinyinly/lib/types";

describe(`deepDecomposeHanzi() suite`, () => {
  test(`predicate narrows type`, async () => {
    const result = deepDecomposeHanzi(
      汉`说讠`,
      [],
      (x): x is HanziCharacter => x === 汉`讠`,
    );

    true satisfies IsEqual<typeof result, readonly HanziCharacter[]>;
  });
});
