// pyly-not-src-test

import type {
  HanziText,
  PinyinNumericText,
  PinyinText,
  PinyinUnit,
} from "#data/model.ts";
import {
  applyToneSandhi,
  matchAllPinyinUnits,
  splitPinyinUnitTone,
} from "#data/pinyin.ts";
import isEqual from "lodash/isEqual";
import { describe, expect, test } from "vitest";
import {
  extractDictionaryPinyinFromCedictEntry,
  loadCedictDictionary,
} from "./cedict";
import type { CedictV2EntryType } from "./cedict";
import type { HskVocabJsonEntry } from "./hskpdf";
import {
  extractHskVocabPdfEntries,
  extractHskVocabPdfRows,
  extractHskVocabSenses,
  hskPdfFilePath,
  loadHskVocabJson,
} from "./hskpdf";
import { arrayFilterUnique } from "@pinyinly/lib/collections";

describe(`extractHskVocabPdfRows suite`, () => {
  test(`extracts rows from pages 4-5`, async () => {
    const rows = await extractHskVocabPdfRows({
      pdfPath: hskPdfFilePath,
      startPage: 4,
      endPage: 5,
    });

    expect(rows.length).toBeGreaterThan(50);

    // Indexes should be sequential with no gaps or duplicates.
    const indexes = rows.map((row) => Number(row.index));
    for (const [i, index] of indexes.entries()) {
      const prev = indexes[i - 1];
      if (prev != null) {
        expect(index).toBe(prev + 1);
      }
    }

    const byIndex = new Map(rows.map((row) => [row.index, row]));

    // Multi-word pinyin must keep its space.
    expect(byIndex.get(`14`)).toEqual({
      index: `14`,
      level: `1`,
      word: `不客气`,
      pinyin: `bú kèqi`,
      partOfSpeech: ``,
    });
    expect(byIndex.get(`24`)).toEqual({
      index: `24`,
      level: `1`,
      word: `打电话`,
      pinyin: `dǎ diànhuà`,
      partOfSpeech: ``,
    });

    // Homograph disambiguation digit must stay attached to the word.
    expect(byIndex.get(`10`)).toEqual({
      index: `10`,
      level: `1`,
      word: `本1`,
      pinyin: `běn`,
      partOfSpeech: `量`,
    });

    // Multiple parenthetical levels and part-of-speech values must be preserved as-is.
    expect(byIndex.get(`71`)).toEqual({
      index: `71`,
      level: `1（2）（4）`,
      word: `好`,
      pinyin: `hǎo`,
      partOfSpeech: `形、（副）、（动）`,
    });
    expect(byIndex.get(`46`)).toEqual({
      index: `46`,
      level: `1（2）`,
      word: `多`,
      pinyin: `duō`,
      partOfSpeech: `形、动、代、（数、副）`,
    });
  });

  // A few glyphs have no ToUnicode mapping in the PDF, so pdf.js extracts an
  // empty word for them; these must be patched via `knownWordExtractionFixes`.
  test(`patches words pdf.js can't extract text for`, async () => {
    const rows = await extractHskVocabPdfRows({
      pdfPath: hskPdfFilePath,
      startPage: 169,
      endPage: 169,
    });

    const byIndex = new Map(rows.map((row) => [row.index, row]));

    expect(byIndex.get(`6616`)).toEqual({
      index: `6616`,
      level: `7-9`,
      word: `缝`,
      pinyin: `féng`,
      partOfSpeech: `动`,
    });
  });

  test(`save to snapshot`, async () => {
    await expect(
      extractHskVocabPdfRows({
        pdfPath: hskPdfFilePath,
        startPage: 4,
        endPage: 5,
      }),
    ).resolves.toMatchJsonFileSnapshot(`hskpdf-vocab-raw-page-4-5.json`);

    await expect(
      extractHskVocabPdfRows({
        pdfPath: hskPdfFilePath,
        startPage: 169,
        endPage: 169,
      }),
    ).resolves.toMatchJsonFileSnapshot(`hskpdf-vocab-raw-page-169.json`);

    await expect(
      extractHskVocabPdfRows({
        pdfPath: hskPdfFilePath,
        startPage: 4,
        endPage: 278,
      }),
    ).resolves.toMatchJsonFileSnapshot(`hskpdf-vocab-raw-page-4-278.json`);
  });
});

describe(`extractHskVocabSenses suite`, () => {
  test.for([
    // No parenthetical levels/pos: a single sense.
    [
      { index: `1`, level: `1`, word: `爱`, pinyin: `ài`, partOfSpeech: `动` },
      [{ level: `1`, partOfSpeech: [`动`] }],
    ],
    // Empty part-of-speech (e.g. "打电话") still yields a single sense.
    [
      {
        index: `24`,
        level: `1`,
        word: `打电话`,
        pinyin: `dǎ diànhuà`,
        partOfSpeech: ``,
      },
      [{ level: `1`, partOfSpeech: [] }],
    ],
    // One extra level, one extra parenthetical pos group.
    [
      {
        index: `33`,
        level: `1（3）`,
        word: `点1`,
        pinyin: `diǎn`,
        partOfSpeech: `量、（名）`,
      },
      [
        { level: `1`, partOfSpeech: [`量`] },
        { level: `3`, partOfSpeech: [`名`] },
      ],
    ],
    // Extra parenthetical pos group with multiple values.
    [
      {
        index: `44`,
        level: `1（4）`,
        word: `对`,
        pinyin: `duì`,
        partOfSpeech: `形、介、（动、量）`,
      },
      [
        { level: `1`, partOfSpeech: [`形`, `介`] },
        { level: `4`, partOfSpeech: [`动`, `量`] },
      ],
    ],
    // Primary group has multiple values too.
    [
      {
        index: `46`,
        level: `1（2）`,
        word: `多`,
        pinyin: `duō`,
        partOfSpeech: `形、动、代、（数、副）`,
      },
      [
        { level: `1`, partOfSpeech: [`形`, `动`, `代`] },
        { level: `2`, partOfSpeech: [`数`, `副`] },
      ],
    ],
    [
      {
        index: `55`,
        level: `1（3）`,
        word: `分`,
        pinyin: `fēn`,
        partOfSpeech: `量、（动、名）`,
      },
      [
        { level: `1`, partOfSpeech: [`量`] },
        { level: `3`, partOfSpeech: [`动`, `名`] },
      ],
    ],
    [
      {
        index: `61`,
        level: `1（2）`,
        word: `给`,
        pinyin: `gěi`,
        partOfSpeech: `动、（介）`,
      },
      [
        { level: `1`, partOfSpeech: [`动`] },
        { level: `2`, partOfSpeech: [`介`] },
      ],
    ],
    // Two extra levels, one paren pos group each.
    [
      {
        index: `71`,
        level: `1（2）（4）`,
        word: `好`,
        pinyin: `hǎo`,
        partOfSpeech: `形、（副）、（动）`,
      },
      [
        { level: `1`, partOfSpeech: [`形`] },
        { level: `2`, partOfSpeech: [`副`] },
        { level: `4`, partOfSpeech: [`动`] },
      ],
    ],
  ] as const)(`row %o`, ([row, expected]) => {
    expect(extractHskVocabSenses(row)).toEqual(expected);
  });
});

describe(`extractHskVocabPdfEntries suite`, () => {
  test(`combines rows and senses`, async () => {
    const entries = await extractHskVocabPdfEntries({
      pdfPath: hskPdfFilePath,
      startPage: 4,
      endPage: 5,
    });

    const byIndex = new Map(entries.map((entry) => [entry.index, entry]));

    expect(byIndex.get(`24`)).toEqual({
      index: `24`,
      word: `打电话`,
      pinyin: [`dǎ diànhuà`],
      senses: [{ level: `1`, partOfSpeech: [] }],
    });

    expect(byIndex.get(`71`)).toEqual({
      index: `71`,
      word: `好`,
      pinyin: [`hǎo`],
      senses: [
        { level: `1`, partOfSpeech: [`形`] },
        { level: `2`, partOfSpeech: [`副`] },
        { level: `4`, partOfSpeech: [`动`] },
      ],
    });

    // The word column's trailing disambiguation digit must be split out.
    expect(byIndex.get(`10`)).toEqual({
      index: `10`,
      word: `本`,
      disambiguator: 1,
      pinyin: [`běn`],
      senses: [{ level: `1`, partOfSpeech: [`量`] }],
    });
  });

  test(`splits variant pinyin readings`, async () => {
    const entries = await extractHskVocabPdfEntries({
      pdfPath: hskPdfFilePath,
      startPage: 4,
      endPage: 278,
    });

    const byIndex = new Map(entries.map((entry) => [entry.index, entry]));

    expect(byIndex.get(`181`)).toMatchObject({
      word: `谁`,
      pinyin: [`shéi`, `shuí`],
    });
    expect(byIndex.get(`1688`)).toMatchObject({
      word: `熟`,
      pinyin: [`shú`, `shóu`],
    });
  });

  test(`save to snapshot`, async () => {
    await expect(
      extractHskVocabPdfEntries({
        pdfPath: hskPdfFilePath,
        startPage: 4,
        endPage: 5,
      }),
    ).resolves.toMatchJsonFileSnapshot(`hskpdf-vocab-entries-page-4-5.json`);

    await expect(
      extractHskVocabPdfEntries({
        pdfPath: hskPdfFilePath,
        startPage: 4,
        endPage: 278,
      }),
    ).resolves.toMatchJsonFileSnapshot(`hskpdf-vocab.json`);
  });
});

// Manually curated fallback for (word, pinyin) pairs whose CEDICT
// pronunciation can't be matched automatically (e.g. erhua, alternate
// readings). Add entries here as mismatches are discovered.
const cedictPinyinOverrides: Record<string, PinyinNumericText> = {};

function matchCedictPinyin(
  hskEntry: HskVocabJsonEntry,
  cedictEntries: readonly CedictV2EntryType[],
): PinyinNumericText | undefined {
  const cedictCandidates = buildCedictPinyinCandidates(cedictEntries);

  for (const pinyin of hskEntry.pinyin) {
    const match = matchCedictPinyinReading(
      { word: hskEntry.word, pinyin },
      cedictCandidates,
    );
    if (match != null) {
      return match;
    }
  }
  return;
}

interface CedictPinyinCandidateType {
  canonicalPinyin: PinyinNumericText;
  pinyin: PinyinText;
  isAlternate: boolean;
}

function buildCedictPinyinCandidates(
  entries: readonly CedictV2EntryType[],
): CedictPinyinCandidateType[] {
  const candidatesByKey = new Map<string, CedictPinyinCandidateType>();

  for (const entry of entries) {
    const [primaryPinyin, ...alternatePinyins] =
      extractDictionaryPinyinFromCedictEntry(entry);
    if (primaryPinyin != null) {
      const candidate = {
        canonicalPinyin: entry.pinyin,
        pinyin: primaryPinyin,
        isAlternate: false,
      };
      candidatesByKey.set(
        `${candidate.canonicalPinyin}\u0000${primaryPinyin}`,
        candidate,
      );
    }

    for (const pinyin of alternatePinyins) {
      const candidate = {
        canonicalPinyin: entry.pinyin,
        pinyin,
        isAlternate: true,
      };
      candidatesByKey.set(
        `${candidate.canonicalPinyin}\u0000${pinyin}`,
        candidate,
      );
    }
  }

  return [...candidatesByKey.values()];
}

function matchCedictPinyinReading(
  hskEntry: { word: HskVocabJsonEntry[`word`]; pinyin: PinyinText },
  cedictCandidates: readonly CedictPinyinCandidateType[],
): PinyinNumericText | undefined {
  // HSK hyphenates some idioms (e.g. "kǔjìn-gānlái") but CEDICT doesn't.
  const entryPinyin = hskEntry.pinyin.replaceAll(`-`, ``) as PinyinUnit;
  const primaryCandidates = cedictCandidates.filter(
    (candidate) => !candidate.isAlternate,
  );
  const alternateCandidates = cedictCandidates.filter(
    (candidate) => candidate.isAlternate,
  );

  function findUniqueExactMatch(
    candidates: readonly CedictPinyinCandidateType[],
  ): PinyinNumericText | undefined {
    const matches = candidates
      .filter((candidate) => candidate.pinyin === entryPinyin)
      .map((candidate) => candidate.canonicalPinyin)
      .filter(arrayFilterUnique());

    return matches.length === 1 ? matches[0] : undefined;
  }

  // Prefer the entry's declared pronunciation, then an exact also-pr.
  // This prevents a fuzzy primary match from hiding an exact alternate.
  const exactPrimaryMatch = findUniqueExactMatch(primaryCandidates);
  if (exactPrimaryMatch != null) {
    return exactPrimaryMatch;
  }

  const exactAlternateMatch = findUniqueExactMatch(alternateCandidates);
  if (exactAlternateMatch != null) {
    return exactAlternateMatch;
  }

  function matchFuzzyCandidates(
    candidates: readonly CedictPinyinCandidateType[],
  ): PinyinNumericText | undefined {
    // Punctuation/spacing differences (e.g. "bu2 yao4" vs "bú yào")
    // shouldn't stop a match.
    {
      const entryUnits = matchAllPinyinUnits(entryPinyin);
      const matches = candidates
        .filter((candidate) =>
          isEqual(matchAllPinyinUnits(candidate.pinyin), entryUnits),
        )
        .map((candidate) => candidate.canonicalPinyin)
        .filter(arrayFilterUnique());

      if (matches.length === 1) {
        return matches[0];
      }
    }

    // CEDICT doesn't apply tone sandhi, so compare candidates after applying
    // HSK tone sandhi. Invalid candidate/word shapes naturally fail here.
    {
      const entryUnits = matchAllPinyinUnits(entryPinyin);
      const matches = candidates
        .filter((candidate) =>
          isEqual(
            matchAllPinyinUnits(
              applyToneSandhi(hskEntry.word, candidate.pinyin),
            ),
            entryUnits,
          ),
        )
        .map((candidate) => candidate.canonicalPinyin)
        .filter(arrayFilterUnique());

      if (matches.length === 1) {
        return matches[0];
      }
    }

    // Try lowercase.
    {
      const entryUnits = matchAllPinyinUnits(
        entryPinyin.toLocaleLowerCase() as PinyinText,
      );
      const matches = candidates
        .filter((candidate) =>
          isEqual(
            matchAllPinyinUnits(
              candidate.pinyin.toLocaleLowerCase() as PinyinText,
            ),
            entryUnits,
          ),
        )
        .map((candidate) => candidate.canonicalPinyin)
        .filter(arrayFilterUnique());
      if (matches.length === 1) {
        return matches[0];
      }
    }

    // Sometimes the last syllable is converted to neutral tone.
    {
      const neutralLastUnit = (units: PinyinUnit[]): PinyinUnit[] =>
        units.map((unit, i, arr) =>
          i === arr.length - 1 ? splitPinyinUnitTone(unit).tonelessUnit : unit,
        );

      const entryUnits = neutralLastUnit(matchAllPinyinUnits(entryPinyin));
      const matches = candidates
        .filter((candidate) =>
          isEqual(
            neutralLastUnit(matchAllPinyinUnits(candidate.pinyin)),
            entryUnits,
          ),
        )
        .map((candidate) => candidate.canonicalPinyin)
        .filter(arrayFilterUnique());
      if (matches.length === 1) {
        return matches[0];
      }
    }

    // Try toneless.
    {
      const removeTones = (units: PinyinUnit[]): PinyinUnit[] =>
        units.map((unit) => splitPinyinUnitTone(unit).tonelessUnit);

      const entryUnits = removeTones(matchAllPinyinUnits(entryPinyin));
      const matches = candidates
        .filter((candidate) =>
          isEqual(
            removeTones(matchAllPinyinUnits(candidate.pinyin)),
            entryUnits,
          ),
        )
        .map((candidate) => candidate.canonicalPinyin)
        .filter(arrayFilterUnique());
      if (matches.length === 1) {
        return matches[0];
      }
    }

    return;
  }

  return (
    matchFuzzyCandidates(primaryCandidates) ??
    matchFuzzyCandidates(alternateCandidates) ??
    cedictPinyinOverrides[`${hskEntry.word}:${hskEntry.pinyin}`]
  );
}

describe(`matchCedictPinyin suite`, () => {
  function makeEntry(word: string, pinyin: string): HskVocabJsonEntry {
    return {
      index: `1`,
      word: word as HanziText,
      pinyin: [pinyin as PinyinText],
      senses: [],
    };
  }

  function makeCedictEntries(
    word: string,
    pinyins: readonly PinyinNumericText[],
  ): CedictV2EntryType[] {
    return pinyins.map((pinyin) => ({
      traditional: word,
      simplified: word,
      pinyin,
      senses: [],
    }));
  }

  test.for([
    // exact match
    [`爱`, `ài`, [`ai4`], `ai4`],
    // "bu2 yao4" (numeric, no space) vs "bú yào" (diacritic, spaced).
    [`不要`, `bú yào`, [`bu2yao4`], `bu2yao4`],
    // Identical candidates return one of them (this can happen when there are
    // multiple entries with the same simplified by different traditional
    // pinyin).
    [`分`, `fèn`, [`fen4`, `fen4`], `fen4`],
    // returns undefined when no candidate matches
    [`猫`, `māo`, [`gou3`], undefined],
    // matches HSK's tone-sandhi pinyin against CEDICT's citation pinyin
    [`一阵`, `yízhèn`, [`yi1 zhen4`], `yi1 zhen4`],
    [`知识分子`, `zhīshi fènzǐ`, [`zhi1shi5 fen4zi3`], `zhi1shi5 fen4zi3`],
    [`恶心`, `ěxin`, [`e3xin1`, `e4xin1`], `e3xin1`],
    // Apostrophe is a syllable separator, not part of the pronunciation.
    [`感恩`, `gǎnēn`, [`gan3'en1`], `gan3'en1`],
    // Lowercase
    [`星期天`, `xīngqītiān`, [`Xing1qi1tian1`], `Xing1qi1tian1`],
  ] as [string, string, PinyinNumericText[], string][])(
    `$0 $1`,
    ([hskHanzi, hskPinyin, cedictPinyins, expected]) => {
      const entry = makeEntry(hskHanzi, hskPinyin);
      expect(
        matchCedictPinyin(entry, makeCedictEntries(hskHanzi, cedictPinyins)),
      ).toBe(expected);
    },
  );

  test(`matches also-pr and returns the entry's canonical pinyin`, () => {
    const entry = makeEntry(`好处`, `hǎochù`);
    const candidates: CedictV2EntryType[] = [
      {
        traditional: `好處`,
        simplified: `好处`,
        pinyin: `hao3chu3` as PinyinNumericText,
        senses: [`easy to get along with`],
      },
      {
        traditional: `好處`,
        simplified: `好处`,
        pinyin: `hao3chu5` as PinyinNumericText,
        senses: [`benefit; advantage; merit`, `(also pr. [hao3chu4])`],
      },
    ];

    expect(matchCedictPinyin(entry, candidates)).toBe(`hao3chu5`);
  });

  test(`matches a different also-pr reading and returns canonical pinyin`, () => {
    const entry = makeEntry(`大都`, `dàdū`);
    const cedictEntry: CedictV2EntryType = {
      traditional: `大都`,
      simplified: `大都`,
      pinyin: `da4dou1` as PinyinNumericText,
      senses: [`(also pr. [da4du1])`, `for the most part`, `on the whole`],
    };

    expect(matchCedictPinyin(entry, [cedictEntry])).toBe(`da4dou1`);
  });

  test(`falls back to a manually curated override`, () => {
    const entry = makeEntry(`分`, `fēnr`);
    cedictPinyinOverrides[`${entry.word}:${entry.pinyin[0]}`] =
      `fēn` as PinyinNumericText;
    try {
      expect(
        matchCedictPinyin(
          entry,
          makeCedictEntries(`分`, [`fen1` as PinyinNumericText]),
        ),
      ).toBe(`fēn`);
    } finally {
      delete cedictPinyinOverrides[`${entry.word}:${entry.pinyin[0]}`];
    }
  });
});

describe(`hskpdf-vocab-cedict suite`, () => {
  test(`match CEDICT pinyin and save to snapshot`, async () => {
    const entries = await loadHskVocabJson();
    const cedict = await loadCedictDictionary();

    const withCedictPinyin = entries.map((entry) => {
      const candidates = cedict.lookupHanzi(entry.word);
      const cedictPinyin = matchCedictPinyin(entry, candidates);

      expect
        .soft(
          cedictPinyin,
          `#${entry.index} ${entry.word} (${entry.pinyin.join(`/`)}) not found in CEDICT`,
        )
        .toBeDefined();

      // Only include `cedictPinyin` when it differs from the entry's own
      // pinyin, so entries that already match CEDICT don't bloat the snapshot.
      return cedictPinyin == null ? entry : { ...entry, cedictPinyin };
    });

    await expect(withCedictPinyin).toMatchJsonFileSnapshot(
      `hskpdf-vocab-cedict.json`,
    );
  });
});
