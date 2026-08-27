// pyly-not-src-test

import { describe, expect, test } from "vitest";
import { extractHskPdfRows, hskPdfFilePath } from "./hskpdf";

describe(`extractHskPdfRows suite`, () => {
  test(`extracts rows from pages 4-5`, async () => {
    const rows = await extractHskPdfRows({
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
      extractHskPdfRows({
        pdfPath: hskPdfFilePath,
        startPage: 4,
        endPage: 5,
      }),
    ).resolves.toMatchJsonFileSnapshot(`hsk-page-4-5.json`);

    await expect(
      extractHskPdfRows({
        pdfPath: hskPdfFilePath,
        startPage: 4,
        endPage: 278,
      }),
    ).resolves.toMatchJsonFileSnapshot(`hsk-page-4-278.json`);
  });
});
