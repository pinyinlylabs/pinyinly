import { getCharacterItemsForWord } from "#client/ui/WikiHanziWordCharacters.utils.ts";
import type { HanziText } from "#data/model.ts";
import { describe, expect, test } from "vitest";

describe(`WikiHanziWordCharacters`, () => {
  test(`getCharacterItemsForWord returns characters in word order`, () => {
    const result = getCharacterItemsForWord(`教学楼` as HanziText);

    expect(result.map((x) => x.hanzi)).toEqual([`教`, `学`, `楼`]);
    expect(result.map((x) => x.position)).toEqual([0, 1, 2]);
  });

  test(`getCharacterItemsForWord returns characters in word order for two-character word`, () => {
    const result = getCharacterItemsForWord(`学习` as HanziText);

    expect(result.map((x) => x.hanzi)).toEqual([`学`, `习`]);
    expect(result.map((x) => x.position)).toEqual([0, 1]);
  });

  test(`getCharacterItemsForWord deduplicates repeated characters keeping first occurrence`, () => {
    // 爸爸 (bàba) is a reduplicated word where the same character appears twice
    const result = getCharacterItemsForWord(`爸爸` as HanziText);

    expect(result.map((x) => x.hanzi)).toEqual([`爸`]);
    expect(result.map((x) => x.position)).toEqual([0]);
  });
});
