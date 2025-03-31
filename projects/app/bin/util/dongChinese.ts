import { PinyinText } from "#data/model.ts";
import {
  inverseSortComparator,
  memoize0,
  sortComparatorNumber,
} from "#util/collections.ts";
import { z } from "zod";
import { makeDbCache } from "./cache.js";
import { fetchWithCache } from "./fetch.js";

const dbCache = makeDbCache(import.meta.filename);

export const dongChineseData = memoize0(async () => {
  const rawJsonl = await fetchWithCache(
    `https://data.dong-chinese.com/dump/dictionary_char_2024-06-17.jsonl`,
    { dbCache },
  );

  const data = rawJsonl
    .split(`\n`)
    .filter((line) => line != ``)
    .map((line) => dongChineseSchema.parse(JSON.parse(line)));

  return {
    lookupChar: (char: string) => {
      for (const entry of data) {
        if (entry.char === char) {
          return entry;
        }
      }
    },
  };
});

export const dongChineseSchema = z
  .object({
    _id: z.string(),
    char: z.string().optional(),
    codepoint: z.string().optional(),
    strokeCount: z.union([z.number(), z.string()]).optional(),
    pinyinFrequencies: z
      .array(
        z
          .object({
            pinyin: z.string(),
            frequency: z.number().optional(),
            count: z.number().optional(),
          })
          .strict(),
      )
      .optional(),
    sources: z.array(z.string()).optional(),
    hint: z.string().optional(),
    images: z
      .array(
        z
          .object({
            url: z.string().optional(),
            source: z.string(),
            description: z.string(),
            type: z.string(),
            era: z.string(),
            fragments: z.array(z.array(z.number())).optional(),
            data: z
              .object({
                strokes: z.array(z.string()),
                medians: z.array(z.array(z.tuple([z.number(), z.number()]))),
              })
              .strict()
              .optional(),
          })
          .strict(),
      )
      .nullable()
      .optional(),
    shuowen: z.string().optional(),
    comments: z
      .array(
        z
          .object({
            source: z.string(),
            text: z.string(),
          })
          .strict(),
      )
      .optional(),
    variants: z
      .array(
        z
          .object({
            char: z.string().nullable(),
            parts: z.string().nullable(),
            source: z.string(),
          })
          .strict(),
      )
      .optional(),
    gloss: z.string().optional(),
    oldPronunciations: z
      .array(
        z
          .object({
            pinyin: z.string().optional(),
            MC: z.string().optional(),
            OC: z.string().optional(),
            gloss: z.string().optional(),
            source: z.string().optional(),
          })
          .strict(),
      )
      .nullable()
      .optional(),
    statistics: z
      .object({
        hskLevel: z.number().optional(),
        movieWordCount: z.number().optional(),
        movieWordCountPercent: z.number().optional(),
        movieWordRank: z.number().optional(),
        movieWordContexts: z.number().optional(),
        movieWordContextsPercent: z.number().optional(),
        bookWordCount: z.number().optional(),
        bookWordCountPercent: z.number().optional(),
        bookWordRank: z.number().optional(),
        bookCharCount: z.number().optional(),
        bookCharCountPercent: z.number().optional(),
        bookCharRank: z.number().optional(),
        movieCharCount: z.number().optional(),
        movieCharCountPercent: z.number().optional(),
        movieCharRank: z.number().optional(),
        movieCharContexts: z.number().optional(),
        movieCharContextsPercent: z.number().optional(),
        pinyinFrequency: z.number().optional(),
        topWords: z
          .array(
            z
              .object({
                word: z.string(),
                share: z.number(),
                trad: z.string({ description: `Traditional Chinese` }),
                gloss: z.string(),
              })
              .strict(),
          )
          .optional(),
      })
      .strict()
      .optional(),
    isVerified: z.boolean().optional(),
    originalMeaning: z.string().optional(),
    variantOf: z.string().optional(),
    customSources: z.array(z.string()).optional(),
    simpVariants: z.array(z.string()).optional(),
    components: z
      .array(
        z
          .object({
            character: z.string(),
            type: z.array(z.string()),
            hint: z.string().nullable().optional(),
            isOldPronunciation: z.boolean().optional(),
            isGlyphChanged: z.boolean().optional(),
            isFromOriginalMeaning: z.boolean().optional(),
          })
          .strict(),
      )
      .nullable()
      .optional(),
    data: z
      .object({
        character: z.string().optional(),
        strokes: z.array(z.string()),
        medians: z.array(z.array(z.tuple([z.number(), z.number()]))),
      })
      .strict()
      .nullable()
      .optional(),
    fragments: z.array(z.array(z.number())).nullable().optional(),
    tradVariants: z.array(z.string()).optional(),
    simp: z.string().optional(),
    trad: z.string().optional(),
    items: z
      .array(
        z
          .object({
            source: z.string().optional(),
            pinyin: z.string(),
            simpTrad: z.string().optional(),
            definitions: z.array(z.string()),
          })
          .strict(),
      )
      .optional(),
    pinyinSearchString: z.string().optional(),
  })
  .strict();

export type DongChineseRecord = z.infer<typeof dongChineseSchema>;

const empty = [] as const;

export function getDongChinesePinyin(record: DongChineseRecord) {
  let result: PinyinText[] | undefined;

  const useCountComparator =
    record.pinyinFrequencies?.some((x) => `count` in x) ?? false;
  const useFrequencyComparator =
    record.pinyinFrequencies?.some((x) => `frequency` in x) ?? false;

  for (const x of record.pinyinFrequencies?.sort(
    useCountComparator
      ? inverseSortComparator(
          sortComparatorNumber(
            (x) => x.count ?? record.pinyinFrequencies?.indexOf(x) ?? 0,
          ),
        )
      : useFrequencyComparator
        ? sortComparatorNumber(
            (x) => x.frequency ?? record.pinyinFrequencies?.indexOf(x) ?? 0,
          )
        : sortComparatorNumber(() => 0),
  ) ?? empty) {
    (result ??= []).push(x.pinyin as PinyinText);
  }

  if (result == null) {
    for (const x of record.oldPronunciations ?? empty) {
      const pinyin = x.pinyin as PinyinText | undefined;
      // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
      if (pinyin != null && (result == null || !result.includes(pinyin))) {
        (result ??= []).push(pinyin);
      }
    }
  }

  return result;
}

function cleanGloss(gloss: string): string {
  return gloss.replaceAll(/^to /g, ``);
}

export function getDongChineseMeaningKey(
  record: DongChineseRecord,
): string | undefined {
  return getDongChineseGloss(record)?.[0]
    ?.replace(/^a /g, ``)
    .replaceAll(/ ([a-z])/g, (_, c: string) => c.toUpperCase());
}

export function getDongChineseGloss(
  record: DongChineseRecord,
): string[] | undefined {
  return record.gloss?.split(/[,;] ?/g).map((x) => cleanGloss(x));
}
