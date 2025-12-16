import { memoize0 } from "@pinyinly/lib/collections";
import { fetchWithFsDbCache, makeFsDbCache } from "@pinyinly/lib/fs";
import isEqual from "lodash/isEqual";
import { z } from "zod/v4";

const fsDbCache = makeFsDbCache(import.meta.filename);

export const ivankraHsk30Schema = z
  .object({
    id: z.string(),
    simplified: z.string().min(1),
    traditional: z.string(),
    pinyin: z.string().min(1),
    pos: z.string().transform((val) => val.split(`/`)),
    level: z.string(),
    webNo: z.string(),
    webPinyin: z.string(),
    ocr: z.string(),
    cedict: z.string(),
    example: z.string().transform((val) => (val === `1` ? true : false)),
  })
  .strict();

export type IvankraHsk30Item = z.infer<typeof ivankraHsk30Schema>;

export const loadIvankraHsk30 = memoize0(
  async (): Promise<IvankraHsk30Item[]> => {
    // e.g.
    //
    // ID,Simplified,Traditional,Pinyin,POS,Level,WebNo,WebPinyin,OCR,CEDICT,Example
    // L1-0001,爱,愛,ài,V,1,18,ài,爱,愛|爱[ai4],
    const csv = await fetchWithFsDbCache(
      `https://raw.githubusercontent.com/ivankra/hsk30/refs/heads/master/hsk30-expanded.csv`,
      { fsDbCache },
    );

    const lines = csv.trim().split(`\n`);
    const Index = {
      Id: 0,
      Simplified: 1,
      Traditional: 2,
      Pinyin: 3,
      Pos: 4,
      Level: 5,
      WebNo: 6,
      Webpinyin: 7,
      Ocr: 8,
      Cedict: 9,
      Example: 10,
    };
    const entries = lines.slice(1).map((line) => {
      const parts = line.split(`,`);

      // https://github.com/ivankra/hsk30/issues/2
      if (
        parts[Index.Id] === `L3-0301` &&
        parts[Index.Simplified] === `现代化`
      ) {
        parts[Index.Example] = `1`;
      }

      return ivankraHsk30Schema.parse({
        id: parts[Index.Id],
        simplified: parts[Index.Simplified],
        traditional: parts[Index.Traditional],
        pinyin: parts[Index.Pinyin],
        pos: parts[Index.Pos],
        level: parts[Index.Level],
        webNo: parts[Index.WebNo],
        webPinyin: parts[Index.Webpinyin],
        ocr: parts[Index.Ocr],
        cedict: parts[Index.Cedict],
        example: parts[Index.Example],
      });
    });

    return stripCruft(entries);
  },
);

/**
 * A function to just keep the simplified items.
 */
function stripCruft(items: IvankraHsk30Item[]) {
  return items.flatMap((item, i, arr) => {
    const prevItem = arr[i - 1];

    // Remove variants that differ by traditional form only:
    if (
      prevItem?.id === item.id &&
      prevItem.pinyin === item.pinyin &&
      isEqual(prevItem.pos, item.pos) &&
      prevItem.simplified === item.simplified &&
      prevItem.traditional !== item.traditional
    ) {
      return [];
    }

    // Remove entirely duplicate items:
    if (isEqual(prevItem, item)) {
      return [];
    }

    // Remove examples
    if (item.example) {
      return [];
    }

    return [item];
  });
}
