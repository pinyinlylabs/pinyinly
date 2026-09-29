import { hanziTextSchema, pinyinTextSchema } from "#data/model.ts";
import { readFile } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import { memoize0 } from "@pinyinly/lib/collections";
import path from "node:path";
// The default `pdfjs-dist` build targets browsers (e.g. it needs `DOMMatrix`);
// the legacy build works in Node.
// oxlint-disable-next-line no-restricted-imports
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { z } from "zod";

export const hskPdfFilePath = path.join(
  import.meta.dirname,
  `新版HSK考试大纲（词汇、汉字、语法）.pdf`,
);

export interface HskVocabPdfRow {
  index: string;
  level: string;
  word: string;
  pinyin: string;
  partOfSpeech: string;
}

const columnHeaders = [`序号`, `等级`, `词语`, `拼音`, `词性`] as const;
type ColumnName = (typeof columnHeaders)[number];

interface PositionedTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
}

// Rows on the same line can have y-coordinates that differ by rounding noise.
const rowYTolerance = 2;
// A horizontal gap bigger than this within a column implies a space that was
// lost when pdf.js split the line into separate text runs, e.g. "bú kèqi".
const wordGapThreshold = 1;

export async function extractHskVocabPdfRows(options: {
  pdfPath: string;
  startPage: number;
  endPage: number;
}): Promise<HskVocabPdfRow[]> {
  const { pdfPath, startPage, endPage } = options;

  const data = await readFile(pdfPath);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(data) })
    .promise;

  const rows: HskVocabPdfRow[] = [];

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();

    const items: PositionedTextItem[] = textContent.items.flatMap((item) => {
      if (!(`str` in item) || item.str.trim() === ``) {
        return [];
      }
      return [
        {
          str: item.str,
          x: item.transform[4],
          y: item.transform[5],
          width: item.width,
        },
      ];
    });

    rows.push(...extractVocabRowsFromPageItems(items));
  }

  return rows;
}

// A few glyphs in the source PDF have no ToUnicode mapping for a specific
// font, so pdf.js extracts an empty string for them even though the
// character is visible in the PDF (verified by index against the PDF text).
// Keyed by `${index}:${pinyin}` so a future HSK revision reusing the same
// index for a different word can't silently pick up a stale fix.
const knownWordExtractionFixes: Record<string, string> = {
  "4134:hǎoróngyì": `好容易`,
  "6616:féng": `缝`,
  "8180:méng": `蒙`,
};

function extractVocabRowsFromPageItems(
  items: PositionedTextItem[],
): HskVocabPdfRow[] {
  const rowGroups = groupItemsIntoRows(items);

  const headerRow = rowGroups.find((row) =>
    columnHeaders.every((header) =>
      row.some((item) => item.str.trim() === header),
    ),
  );
  invariant(headerRow != null, `couldn't find header row on page`);

  const columnStartX = new Map<ColumnName, number>(
    columnHeaders.map((header) => {
      const item = headerRow.find((item) => item.str.trim() === header);
      invariant(item != null);
      return [header, item.x];
    }),
  );

  const rows: HskVocabPdfRow[] = [];

  for (const row of rowGroups) {
    if (row === headerRow) {
      continue;
    }

    const indexText = joinColumnText(columnItemsFor(row, `序号`, columnStartX));
    // Skip non-data rows, e.g. the page number printed in the footer.
    if (!/^\d+$/u.test(indexText)) {
      continue;
    }

    const extractedWord = joinColumnText(
      columnItemsFor(row, `词语`, columnStartX),
    );
    const pinyinText = joinColumnText(
      columnItemsFor(row, `拼音`, columnStartX),
    );
    const wordFixKey = `${indexText}:${pinyinText}`;
    const wordFix = knownWordExtractionFixes[wordFixKey];
    invariant(
      wordFix == null || extractedWord === ``,
      `knownWordExtractionFixes[${wordFixKey}] is stale, word extracted fine now`,
    );

    rows.push({
      index: indexText,
      level: joinColumnText(columnItemsFor(row, `等级`, columnStartX)),
      word: wordFix ?? extractedWord,
      pinyin: pinyinText,
      partOfSpeech: joinColumnText(columnItemsFor(row, `词性`, columnStartX)),
    });
  }

  return rows;
}

function groupItemsIntoRows(
  items: PositionedTextItem[],
): PositionedTextItem[][] {
  // PDF y-coordinates increase upward, so sorting descending walks the page
  // top-to-bottom.
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);

  const rows: PositionedTextItem[][] = [];
  for (const item of sorted) {
    const row = rows.at(-1);
    if (row != null && Math.abs(row[0]!.y - item.y) <= rowYTolerance) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }

  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
  }

  return rows;
}

// Columns are detected per-page from the header row, so a small drift in
// column x-positions between pages doesn't break the layout.
function columnItemsFor(
  row: PositionedTextItem[],
  column: ColumnName,
  columnStartX: Map<ColumnName, number>,
): PositionedTextItem[] {
  const sortedColumns = [...columnStartX.entries()].sort((a, b) => a[1] - b[1]);
  const columnIndex = sortedColumns.findIndex(([name]) => name === column);
  invariant(columnIndex !== -1);

  const startX = sortedColumns[columnIndex]![1];
  const prevStartX = sortedColumns[columnIndex - 1]?.[1];
  const nextStartX = sortedColumns[columnIndex + 1]?.[1];

  const beginX =
    prevStartX == null ? Number.NEGATIVE_INFINITY : (prevStartX + startX) / 2;
  const endX =
    nextStartX == null ? Number.POSITIVE_INFINITY : (startX + nextStartX) / 2;

  return row
    .filter((item) => item.x >= beginX && item.x < endX)
    .sort((a, b) => a.x - b.x);
}

function joinColumnText(items: PositionedTextItem[]): string {
  let result = ``;
  let prevEndX: number | null = null;

  for (const item of items) {
    if (prevEndX != null && item.x - prevEndX > wordGapThreshold) {
      result += ` `;
    }
    result += item.str;
    prevEndX = item.x + item.width;
  }

  return result.replaceAll(/ {2,}/gu, ` `).trim();
}

// A single row can list multiple senses at once, e.g. a word introduced at
// HSK 1 that's tested again at HSK 2 and HSK 4.
export interface HskVocabSense {
  level: string;
  partOfSpeech: string[];
}

export function extractHskVocabSenses(row: HskVocabPdfRow): HskVocabSense[] {
  const levels = parseHskVocabLevels(row.level);
  const partOfSpeechGroups = parseHskVocabPartOfSpeechGroups(row.partOfSpeech);

  return levels.map((level, i) => ({
    level,
    partOfSpeech: partOfSpeechGroups[i] ?? [],
  }));
}

export interface HskVocabPdfEntry {
  index: string;
  word: string;
  // The word column sometimes has a trailing digit (e.g. "作为2") used to
  // disambiguate multiple vocab entries that share the same written word.
  disambiguator: number | undefined;
  pinyin: string[];
  senses: HskVocabSense[];
}

export async function extractHskVocabPdfEntries(options: {
  pdfPath: string;
  startPage: number;
  endPage: number;
}): Promise<HskVocabPdfEntry[]> {
  const rows = await extractHskVocabPdfRows(options);

  return rows.map((row) => {
    const { word, disambiguator } = parseHskVocabWord(row.word);
    return {
      index: row.index,
      word,
      disambiguator,
      pinyin: row.pinyin.split(`/`).map((pinyin) => pinyin.trim()),
      senses: extractHskVocabSenses(row),
    };
  });
}

// e.g. "作为2" -> { word: "作为", disambiguator: 2 }
function parseHskVocabWord(word: string): {
  word: string;
  disambiguator: number | undefined;
} {
  const match = /^(.+?)(\d+)$/u.exec(word);
  return match == null
    ? { word, disambiguator: undefined }
    : { word: match[1]!, disambiguator: Number(match[2]!) };
}

// e.g. "1（2）（4）" -> ["1", "2", "4"]
function parseHskVocabLevels(level: string): string[] {
  const primaryMatch = /^(\d+)/u.exec(level);
  invariant(primaryMatch != null, `couldn't parse level from "${level}"`);

  const levels = [primaryMatch[1]!];
  for (const match of level.matchAll(/（(\d+)）/gu)) {
    levels.push(match[1]!);
  }

  return levels;
}

// e.g. "形、动、代、（数、副）" -> [["形", "动", "代"], ["数", "副"]]
function parseHskVocabPartOfSpeechGroups(partOfSpeech: string): string[][] {
  const groups: string[][] = [];
  const primaryGroup: string[] = [];

  for (const match of partOfSpeech.matchAll(/（([^）]*)）|([^（）]+)/gu)) {
    if (match[1] != null) {
      const values = match[1].split(`、`).filter((value) => value !== ``);
      if (values.length > 0) {
        groups.push(values);
      }
    } else if (match[2] != null) {
      primaryGroup.push(
        ...match[2].split(`、`).filter((value) => value !== ``),
      );
    }
  }

  if (primaryGroup.length > 0) {
    groups.unshift(primaryGroup);
  }

  return groups;
}

// The full extracted vocabulary list, generated via `extractHskVocabPdfEntries`
// and saved by a snapshot test.
export const hskVocabJsonFilePath = path.join(
  import.meta.dirname,
  `hskpdf-vocab.json`,
);

const hskVocabJsonSenseSchema = z.object({
  level: z.string(),
  partOfSpeech: z.array(z.string()),
});

const hskVocabJsonEntrySchema = z.object({
  index: z.string(),
  word: hanziTextSchema,
  disambiguator: z.number().optional(),
  pinyin: z.array(pinyinTextSchema),
  senses: z.array(hskVocabJsonSenseSchema),
});

export type HskVocabJsonEntry = z.infer<typeof hskVocabJsonEntrySchema>;

export const loadHskVocabJson = memoize0(
  async (): Promise<HskVocabJsonEntry[]> => {
    const text = await readFile(hskVocabJsonFilePath, `utf8`);
    return z.array(hskVocabJsonEntrySchema).parse(JSON.parse(text));
  },
);
