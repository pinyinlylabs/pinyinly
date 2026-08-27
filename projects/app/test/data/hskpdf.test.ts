// pyly-not-src-test

import { describe, expect, test } from "vitest";
import {
  extractHskVocabPdfEntries,
  extractHskVocabPdfRows,
  extractHskVocabSenses,
  hskPdfFilePath,
} from "./hskpdf";

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
      pinyin: `dǎ diànhuà`,
      senses: [{ level: `1`, partOfSpeech: [] }],
    });

    expect(byIndex.get(`71`)).toEqual({
      index: `71`,
      word: `好`,
      pinyin: `hǎo`,
      senses: [
        { level: `1`, partOfSpeech: [`形`] },
        { level: `2`, partOfSpeech: [`副`] },
        { level: `4`, partOfSpeech: [`动`] },
      ],
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
  });
});
