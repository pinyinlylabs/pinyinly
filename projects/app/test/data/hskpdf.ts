import { readFile } from "@pinyinly/lib/fs";
import { invariant } from "@pinyinly/lib/invariant";
import path from "node:path";
// The default `pdfjs-dist` build targets browsers (e.g. it needs `DOMMatrix`);
// the legacy build works in Node.
// oxlint-disable-next-line no-restricted-imports
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const hskPdfFilePath = path.join(
  import.meta.dirname,
  `新版HSK考试大纲（词汇、汉字、语法）.pdf`,
);

export interface HskPdfRow {
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

export async function extractHskPdfRows(options: {
  pdfPath: string;
  startPage: number;
  endPage: number;
}): Promise<HskPdfRow[]> {
  const { pdfPath, startPage, endPage } = options;

  const data = await readFile(pdfPath);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(data) })
    .promise;

  const rows: HskPdfRow[] = [];

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

    rows.push(...extractRowsFromPageItems(items));
  }

  return rows;
}

function extractRowsFromPageItems(items: PositionedTextItem[]): HskPdfRow[] {
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

  const rows: HskPdfRow[] = [];

  for (const row of rowGroups) {
    if (row === headerRow) {
      continue;
    }

    const indexText = joinColumnText(columnItemsFor(row, `序号`, columnStartX));
    // Skip non-data rows, e.g. the page number printed in the footer.
    if (!/^\d+$/u.test(indexText)) {
      continue;
    }

    rows.push({
      index: indexText,
      level: joinColumnText(columnItemsFor(row, `等级`, columnStartX)),
      word: joinColumnText(columnItemsFor(row, `词语`, columnStartX)),
      pinyin: joinColumnText(columnItemsFor(row, `拼音`, columnStartX)),
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
