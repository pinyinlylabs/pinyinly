import type { DictionarySearchEntry } from "#client/query.ts";
import { quickSearch } from "#client/ui/hooks/useQuickSearch.ts";
import type { HanziText, HanziWord, PinyinText } from "#data/model.js";
import { describe, expect, test } from "vitest";

describe(`quickSearch suite` satisfies HasNameOf<typeof quickSearch>, () => {
  test(`matches non-first gloss and pinyin values`, () => {
    const entries: DictionarySearchEntry[] = [
      makeEntry({
        hanzi: `服` as HanziText,
        meaningKey: `clothes`,
        gloss: [`clothes`, `wear`],
        pinyin: [`fú` as PinyinText, `fóu` as PinyinText],
      }),
    ];

    const glossResults = quickSearch(entries, `wear`);
    expect(glossResults).toHaveLength(1);
    expect(glossResults[0]?.kind).toBe(`hanziWord`);
    if (glossResults[0]?.kind !== `hanziWord`) {
      throw new Error(`Expected hanziWord result`);
    }
    expect(glossResults[0].hanziWord).toBe(`服:clothes`);
    expect(glossResults[0].score).toBe(10);

    const pinyinResults = quickSearch(entries, `fóu`);
    expect(pinyinResults).toHaveLength(1);
    expect(pinyinResults[0]?.kind).toBe(`hanziWord`);
    if (pinyinResults[0]?.kind !== `hanziWord`) {
      throw new Error(`Expected hanziWord result`);
    }
    expect(pinyinResults[0].hanziWord).toBe(`服:clothes`);
    expect(pinyinResults[0].score).toBe(20);

    const hanziResults = quickSearch(entries, `服`);
    expect(hanziResults).toHaveLength(1);
    expect(hanziResults[0]?.kind).toBe(`hanziWord`);
    if (hanziResults[0]?.kind !== `hanziWord`) {
      throw new Error(`Expected hanziWord result`);
    }
    expect(hanziResults[0].hanziWord).toBe(`服:clothes`);
    expect(hanziResults[0].score).toBe(0);
  });
});

function makeEntry({
  hanzi,
  meaningKey,
  gloss,
  pinyin,
}: {
  hanzi: HanziText;
  meaningKey: string;
  gloss: string[];
  pinyin?: PinyinText[];
}): DictionarySearchEntry {
  const hanziWord = `${hanzi}:${meaningKey}` as HanziWord;

  return {
    id: `builtIn:${hanziWord}`,
    sourceKind: `builtIn`,
    hanzi,
    meaningKey,
    hanziWord,
    gloss,
    pinyin,
    hskSortKey: Number.POSITIVE_INFINITY,
    hanziCharacterCount: hanzi.length,
  };
}
