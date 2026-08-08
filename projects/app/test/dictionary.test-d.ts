import type { HanziCharacter } from "#data/model.ts";
import { decomposeHanziToIdsLeafs } from "#dictionary.ts";
import { describe, test } from "vitest";
import { 汉 } from "./data/helpers.ts";
import type { IsEqual } from "@pinyinly/lib/types";

describe(`decomposeHanzi() suite`, () => {
  test(`predicate narrows type`, async () => {
    const result = decomposeHanziToIdsLeafs(
      汉`说讠`,
      [],
      (x): x is HanziCharacter => x === 汉`讠`,
    );

    true satisfies IsEqual<typeof result, HanziCharacter[]>;
  });
});
