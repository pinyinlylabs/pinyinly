import type { DictionarySearchEntry } from "#client/query.ts";
import type { HanziText } from "#data/model.ts";
import { buildRelatedMeaningMatches } from "#client/ui/WikiHanziRelatedMeanings.utils.ts";
import { describe, expect, test } from "vitest";

describe(`WikiHanziRelatedMeanings`, () => {
  test(`builds one scored list ranked by gloss overlap and excludes the current entry`, () => {
    const currentEntries = [
      makeEntry({
        hanzi: `甲`,
        meaningKey: `supportA`,
        hanziWord: `甲:supportA`,
        gloss: [`to support`, `to back`],
        hskSortKey: 10,
        hanziCharacterCount: 1,
      }),
      makeEntry({
        hanzi: `甲`,
        meaningKey: `supportB`,
        hanziWord: `甲:supportB`,
        gloss: [`to bolster`],
        hskSortKey: 11,
        hanziCharacterCount: 1,
      }),
    ] satisfies readonly DictionarySearchEntry[];

    const allEntries = [
      ...currentEntries,
      makeEntry({
        hanzi: `帮`,
        meaningKey: `support`,
        hanziWord: `帮:support`,
        gloss: [`to support`],
        hskSortKey: 2,
        hanziCharacterCount: 1,
      }),
      makeEntry({
        hanzi: `支持`,
        meaningKey: `support`,
        hanziWord: `支持:support`,
        gloss: [`to support`, `to back`],
        hskSortKey: 4,
        hanziCharacterCount: 2,
      }),
      makeEntry({
        hanzi: `援助`,
        meaningKey: `aid`,
        hanziWord: `援助:aid`,
        gloss: [`strong support`, `help`],
        hskSortKey: 6,
        hanziCharacterCount: 2,
      }),
      makeEntry({
        hanzi: `助`,
        meaningKey: `help`,
        hanziWord: `助:help`,
        gloss: [`to support and help`],
        hskSortKey: 8,
        hanziCharacterCount: 1,
      }),
      makeEntry({
        hanzi: `甲`,
        meaningKey: `other`,
        hanziWord: `甲:other`,
        gloss: [`to support`],
        hskSortKey: 1,
        hanziCharacterCount: 1,
      }),
    ] satisfies readonly DictionarySearchEntry[];

    const matches = buildRelatedMeaningMatches({
      currentEntries,
      allEntries,
      hanzi: `甲` as HanziText,
    });

    expect(matches.map((match) => match.entry.hanziWord)).toEqual([
      `支持:support`,
      `帮:support`,
      `助:help`,
      `援助:aid`,
    ]);

    expect(
      matches.map((match) => Number(match.similarityScore.toFixed(3))),
    ).toEqual([0.667, 0.333, 0.25, 0.2]);

    expect(matches.map((match) => match.entry.hanzi)).not.toContain(`甲`);

    expect(matches.every((match) => match.similarityScore > 0)).toBe(true);
  });

  test(`returns an empty list when there are no overlapping gloss tokens`, () => {
    const currentEntries = [
      makeEntry({
        hanzi: `甲`,
        meaningKey: `supportA`,
        hanziWord: `甲:supportA`,
        gloss: [`to support`],
        hskSortKey: 10,
        hanziCharacterCount: 1,
      }),
    ] satisfies readonly DictionarySearchEntry[];

    const allEntries = [
      ...currentEntries,
      makeEntry({
        hanzi: `山`,
        meaningKey: `mountain`,
        hanziWord: `山:mountain`,
        gloss: [`mountain`],
        hskSortKey: 2,
        hanziCharacterCount: 1,
      }),
    ] satisfies readonly DictionarySearchEntry[];

    const matches = buildRelatedMeaningMatches({
      currentEntries,
      allEntries,
      hanzi: `甲` as HanziText,
    });

    expect(matches).toEqual([]);
  });
});

function makeEntry({
  hanzi,
  meaningKey,
  hanziWord,
  gloss,
  hskSortKey,
  hanziCharacterCount,
}: {
  hanzi: string;
  meaningKey: string;
  hanziWord: string;
  gloss: readonly string[];
  hskSortKey: number;
  hanziCharacterCount: number;
}): DictionarySearchEntry {
  return {
    id: `${hanziWord}:id`,
    sourceKind: `builtIn`,
    hanzi: hanzi as DictionarySearchEntry[`hanzi`],
    meaningKey,
    hanziWord: hanziWord as DictionarySearchEntry[`hanziWord`],
    gloss: [...gloss],
    glossCount: gloss.length,
    hskSortKey,
    hanziCharacterCount,
  };
}
