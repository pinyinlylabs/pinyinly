import { getWikiHskLevelDetails } from "#client/ui/WikiHanziHskLozenges.utils.ts";
import { describe, expect, test } from "vitest";

describe(`getWikiHskLevelDetails`, () => {
  test(`sorts levels and distinguishes direct listings from first appearances`, () => {
    expect(
      getWikiHskLevelDetails([
        { hsk: `4`, hskFirstAppearance: `2` },
        { hsk: `2`, hskFirstAppearance: `2` },
        { hsk: `7-9`, hskFirstAppearance: `6` },
      ]),
    ).toEqual([
      { hskLevel: `2`, isDirect: true, isFirstAppearance: true },
      { hskLevel: `4`, isDirect: true, isFirstAppearance: false },
      { hskLevel: `6`, isDirect: false, isFirstAppearance: true },
      { hskLevel: `7-9`, isDirect: true, isFirstAppearance: false },
    ]);
  });

  test(`returns no levels when no HSK metadata is present`, () => {
    expect(getWikiHskLevelDetails([{}, {}])).toEqual([]);
  });
});
