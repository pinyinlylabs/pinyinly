import { parseIds, splitHanziText, walkIdsNode } from "@/data/hanzi";
import type { HanziChar, HanziText, HanziWord, PinyinText } from "@/data/model";
import { PartOfSpeech } from "@/data/model";
import { parsePinyinWithChart } from "@/data/pinyin";
import { rMnemonicThemeId, rPinyinInitialGroupId } from "@/data/rizzleSchema";
import {
  deepReadonly,
  emptyArray,
  mapArrayAdd,
  memoize0,
  memoize1,
} from "@/util/collections";
import { invariant } from "@haohaohow/lib/invariant";
import type { DeepReadonly } from "ts-essentials";
import { z } from "zod";

export const hhhMarkSchema = z.string();
export const hanziWordSchema = z.string().transform((x) => x as HanziWord);
export const hanziTextSchema = z.string().transform((x) => x as HanziText);
export const hanziCharSchema = z.string().transform((x) => x as HanziChar);
export const pinyinTextSchema = z
  .string({ description: `space separated pinyin for each word` })
  .transform((x) => x as PinyinText);

export const parsePinyinOrThrow = memoize1(function parsePinyinOrThrow(
  pinyin: string,
) {
  const chart = loadHhhPinyinChart();
  const parsed = parsePinyinWithChart(pinyin, chart);
  invariant(parsed != null, `Could not parse pinyin ${pinyin}`);
  return deepReadonly(parsed);
});

export const loadPinyinWords = memoize0(async () =>
  z
    .array(z.string())
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./pinyinWords.asset.json`)).default),
);

export const loadMissingFontGlyphs = memoize0(async () =>
  z
    .record(z.array(z.string()))
    .transform(
      (x) => new Map(Object.entries(x).map(([k, v]) => [k, new Set(v)])),
    )
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./missingFontGlyphs.asset.json`)).default),
);

export const loadMnemonicThemes = memoize0(async () =>
  z
    .record(
      z.string(), // themeId
      z.object({
        noun: z.string(),
        description: z.string(),
      }),
    )
    .transform(
      (x) =>
        new Map(
          Object.entries(x).map(
            ([k, v]) => [rMnemonicThemeId().unmarshal(k), v] as const,
          ),
        ),
    )
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./mnemonicThemes.asset.json`)).default),
);

export const loadMnemonicThemeChoices = memoize0(async () =>
  z
    .record(
      z.string(), // themeId
      z.record(
        z.string(), // initial
        z.record(z.string(), z.string()),
      ),
    )
    .transform(
      (x) =>
        new Map(
          Object.entries(x).map(([k, v]) => [
            rMnemonicThemeId().unmarshal(k),
            new Map(
              Object.entries(v).map(([k2, v2]) => [
                k2,
                new Map(Object.entries(v2)),
              ]),
            ),
          ]),
        ),
    )
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./mnemonicThemeChoices.asset.json`)).default),
);

export const loadHanziDecomposition = memoize0(async () =>
  z
    .array(z.tuple([z.string(), z.string()]))
    .transform((x) => new Map(x))
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hanziDecomposition.asset.json`)).default),
);

const pinyinChartSchema = z
  .object({
    initials: z.array(
      z.object({
        id: rPinyinInitialGroupId().getUnmarshal(),
        desc: z.string(),
        initials: z.array(z.union([z.string(), z.array(z.string())])),
      }),
    ),
    finals: z.array(z.union([z.string(), z.array(z.string())])),
    overrides: z.record(z.tuple([z.string(), z.string()])),
  })
  .transform(({ initials: initialGroups, finals, overrides }) => ({
    initials: initialGroups.map((group) => ({
      ...group,
      initials: group.initials.map((initial) =>
        typeof initial === `string` ? ([initial, initial] as const) : initial,
      ),
    })),
    finals: finals.map((x) => (typeof x === `string` ? ([x, x] as const) : x)),
    overrides,
  }));

export const loadStandardPinyinChart = memoize0(async () =>
  pinyinChartSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./standardPinyinChart.asset.json`)).default),
);

export const loadMmPinyinChart = memoize0(async () =>
  pinyinChartSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./mmPinyinChart.asset.json`)).default),
);

export const loadHhPinyinChart = memoize0(async () =>
  pinyinChartSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hhPinyinChart.asset.json`)).default),
);

export const loadHmmPinyinChart = memoize0(async () =>
  pinyinChartSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hmmPinyinChart.asset.json`)).default),
);

export const loadHhhPinyinChart = memoize0(() =>
  pinyinChartSchema.transform(deepReadonly).parse({
    initials: [
      {
        id: `basic`,
        desc: `basic distinct sounds`,
        initials: [
          `b`,
          `p`,
          `m`,
          `f`,
          `d`,
          `t`,
          `n`,
          `l`,
          `g`,
          `k`,
          `h`,
          `zh`,
          [`ch`, `ch`, `chi`],
          `sh`,
          `r`,
          `z`,
          [`c`, `c`, `ci`],
          `s`,
        ],
      },
      {
        id: `-i`,
        desc: `ends with an 'i' (ee) sound`,
        initials: [
          [`y`, `y`, `yi`],
          `bi`,
          `pi`,
          `mi`,
          `di`,
          `ti`,
          `ni`,
          `li`,
          `ji`,
          `qi`,
          `xi`,
        ],
      },
      {
        id: `-u`,
        desc: `ends with an 'u' (oo) sound`,
        initials: [
          `w`,
          `bu`,
          `pu`,
          `mu`,
          `fu`,
          `du`,
          `tu`,
          `nu`,
          `lu`,
          `gu`,
          `ku`,
          `hu`,
          [`zhu`, `zhu`, `zho`],
          [`chu`, `chu`, `cho`],
          `shu`,
          `ru`,
          `zu`,
          [`cu`, `cu`, `co`],
          `su`,
        ],
      },
      {
        id: `-ü`,
        desc: `ends with an 'ü' (ü) sound`,
        initials: [`yu`, `nü`, `lü`, `ju`, `qu`, `xu`],
      },
      {
        id: `∅`,
        desc: `null special case`,
        initials: [[`∅`, ``]],
      },
    ],
    finals: [
      [`∅`, ``, `er`],
      `a`,
      `o`,
      [`e`, `e`, `ê`],
      `ai`,
      [`ei`, `ei`, `i`],
      `ao`,
      [`ou`, `ou`, `u`],
      `an`,
      [`(e)n`, `n`, `en`],
      `ang`,
      [`(e)ng`, `ng`, `eng`, `ong`],
    ],
    overrides: {},
  }),
);

export const loadHanziWordGlossMnemonics = memoize0(async () =>
  z
    .array(
      z.tuple([
        hanziWordSchema,
        z.array(z.object({ mnemonic: z.string(), rationale: z.string() })),
      ]),
    )
    .transform((x) => new Map(x))
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hanziWordGlossMnemonics.asset.json`)).default),
);

export const wordListSchema = z.array(hanziWordSchema);

export const allRadicalHanziWords = memoize0(async () =>
  wordListSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./radicalsHanziWords.asset.json`)).default),
);

export const allHsk1HanziWords = memoize0(async () =>
  wordListSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hsk1HanziWords.asset.json`)).default),
);

export const allHsk2HanziWords = memoize0(async () =>
  wordListSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hsk2HanziWords.asset.json`)).default),
);

export const allHsk3HanziWords = memoize0(async () =>
  wordListSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hsk3HanziWords.asset.json`)).default),
);

export const partOfSpeechSchema = z.enum([
  `noun`,
  `verb`,
  `adjective`,
  `adverb`,
  `pronoun`,
  `preposition`,
  `conjunction`,
  `interjection`,
  `measureWord`,
  `particle`,
  `radical`,
  `unknown`,
]);

export const hanziWordMeaningSchema = z.object({
  gloss: z.array(z.string()),
  glossHint: z.string().optional().nullable(),
  pinyin: z
    .array(pinyinTextSchema, {
      description: `all valid pinyin variations for this meaning (might be omitted for radicals without pronunciation)`,
    })
    .optional()
    .nullable(),
  example: z
    .string({
      description: `a Chinese sentence that includes this hanzi`,
    })
    .optional()
    .nullable(),
  partOfSpeech: partOfSpeechSchema,
  componentFormOf: hanziCharSchema
    .describe(
      `the primary form of this hanzi (only relevant for component-form hanzi)`,
    )
    .optional()
    .nullable(),
  visualVariants: z
    .array(hanziTextSchema, {
      description: `Hanzi with the same meaning but visually different. Only included in rare cases (e.g. radicals with multiple visual forms). `,
    })
    .optional()
    .nullable(),
  definition: z.string(),
});

export type HanziWordMeaning = z.infer<typeof hanziWordMeaningSchema>;
export type HanziWordWithMeaning = [HanziWord, HanziWordMeaning];

export const dictionarySchema = z
  .array(z.tuple([hanziWordSchema, hanziWordMeaningSchema]))
  .transform((x) => new Map(x));

export type Dictionary = z.infer<typeof dictionarySchema>;

export const loadDictionary = memoize0(async () =>
  dictionarySchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./dictionary.asset.json`)).default),
);

export const wikiEntrySchema = z.object({
  componentsIdc: z
    .string()
    .describe(`Ideographic Description Character for the components, e.g. ⿰`)
    .optional(),
  components: z
    .array(
      z.object({
        hanziWord: hanziWordSchema
          .describe(`Optional link to a specific hanzi word`)
          .optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .optional(),
  interpretation: z
    .string()
    .describe(`Interpretation of the character`)
    .optional(),
  mnemonics: z
    .array(
      z.object({
        hanziWord: hanziWordSchema,
        mnemonic: hhhMarkSchema,
      }),
    )
    .optional(),
  relatedMeaning: z
    .array(
      z.object({
        gloss: z.string(),
        hanziWords: z.array(hanziWordSchema),
      }),
    )
    .optional()
    .nullable(),
  visuallySimilar: z.array(hanziTextSchema).optional().nullable(),
});

export type WikiEntry = z.infer<typeof wikiEntrySchema>;

export const wikiSchema = z
  .array(z.tuple([hanziTextSchema, wikiEntrySchema]))
  .transform((x) => new Map(x));

export type Wiki = z.infer<typeof wikiSchema>;

export const loadWiki = memoize0(async () =>
  wikiSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./wiki.asset.json`)).default),
);

export const hanziWordMigrationsSchema = z
  .array(
    z.tuple([
      hanziWordSchema,
      hanziWordSchema
        .nullable()
        .describe(`the new hanzi word, or null when it should be deleted`),
    ]),
  )
  .transform((x) => new Map(x));

export const loadHanziWordMigrations = memoize0(async () =>
  hanziWordMigrationsSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hanziWordMigrations.asset.json`)).default),
);

const loadRadicalStrokes = memoize0(async () =>
  z
    .array(
      z.object({
        strokes: z.number(),
        range: z.tuple([z.number(), z.number()]),
        characters: z.array(z.string()),
      }),
    )
    .transform((x) => new Map(x.map((r) => [r.strokes, r])))
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./radicalStrokes.asset.json`)).default),
);

export const loadHanziWordPinyinMnemonics = memoize0(async () =>
  z
    .array(
      z.tuple([
        z.string(),
        z.array(
          z.object({
            mnemonic: z.string(),
            strategy: z.string(),
          }),
        ),
      ]),
    )
    .transform((x) => new Map(x))
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./radicalPinyinMnemonics.asset.json`)).default),
);

export const allRadicalsByStrokes = async () => await loadRadicalStrokes();

export const lookupHanziWordGlossMnemonics = async (hanziWord: HanziWord) =>
  await loadHanziWordGlossMnemonics().then((x) => x.get(hanziWord) ?? null);

export const lookupHanziWordPinyinMnemonics = async (hanziWord: HanziWord) =>
  await loadHanziWordPinyinMnemonics().then((x) => x.get(hanziWord) ?? null);

/**
 * Build an inverted index of hanzi words to hanzi word meanings and glosses to
 * hanzi word meanings. Useful when building learning graphs.
 */
const hanziToHanziWordMap = memoize0(
  async (): Promise<
    DeepReadonly<{
      hanziMap: Map<string, HanziWordWithMeaning[]>;
      glossMap: Map<string, HanziWordWithMeaning[]>;
    }>
  > => {
    const hanziMap = new Map<string, HanziWordWithMeaning[]>();
    const glossMap = new Map<string, HanziWordWithMeaning[]>();

    for (const item of await loadDictionary()) {
      const [hanziWord, meaning] = item;

      mapArrayAdd(hanziMap, hanziFromHanziWord(hanziWord), item);

      for (const gloss of meaning.gloss) {
        mapArrayAdd(glossMap, gloss, item);
      }
    }

    return { hanziMap, glossMap };
  },
);

export const lookupHanzi = async (
  hanzi: string,
): Promise<DeepReadonly<HanziWordWithMeaning[]>> => {
  const { hanziMap } = await hanziToHanziWordMap();
  return hanziMap.get(hanzi) ?? emptyArray;
};

export const lookupGloss = async (
  gloss: string,
): Promise<DeepReadonly<HanziWordWithMeaning[]>> => {
  const { glossMap } = await hanziToHanziWordMap();
  return glossMap.get(gloss) ?? emptyArray;
};

export const lookupHanziWord = async (
  hanziWord: HanziWord,
): Promise<DeepReadonly<HanziWordMeaning> | null> =>
  await loadDictionary().then((x) => x.get(hanziWord) ?? null);

export const lookupHanziWikiEntry = async (
  hanzi: HanziText,
): Promise<DeepReadonly<WikiEntry> | null> =>
  await loadWiki().then((x) => x.get(hanzi) ?? null);

export const lookupRadicalsByStrokes = async (strokes: number) =>
  await loadRadicalStrokes().then((x) => x.get(strokes) ?? null);

export const allHanziWordsHanzi = memoize0(
  async () =>
    new Set(
      [
        ...(await allRadicalHanziWords()),
        ...(await allHsk1HanziWords()),
        ...(await allHsk2HanziWords()),
        ...(await allHsk3HanziWords()),
      ].map((x) => hanziFromHanziWord(x)),
    ),
);

export const allOneCharacterHanzi = memoize0(
  async () =>
    new Set<string>(
      [
        ...(await allRadicalHanziWords()),
        ...(await allHsk1HanziWords()),
        ...(await allHsk2HanziWords()),
        ...(await allHsk3HanziWords()),
      ]
        .map((x) => hanziFromHanziWord(x))
        .filter((x) => characterCount(x) === 1),
    ),
);

export const allHanziCharacters = memoize0(
  async () =>
    new Set(
      [...(await allHanziWordsHanzi())]
        // Split words into characters because decomposition is per-character.
        .flatMap((x) => splitHanziText(x)),
    ),
);

/**
 * Return true if the character can be rendered (i.e. it has a font glyph).
 */
export async function characterHasGlyph(character: string): Promise<boolean> {
  const missingFontGlyphs = await loadMissingFontGlyphs();
  for (const [_platform, missingGlyphs] of missingFontGlyphs.entries()) {
    if (missingGlyphs.has(character)) {
      return false;
    }
  }
  return true;
}

export function shorthandPartOfSpeech(partOfSpeech: PartOfSpeech) {
  switch (partOfSpeech) {
    case PartOfSpeech.Adjective: {
      return `adj.`;
    }
    case PartOfSpeech.Adverb: {
      return `adv.`;
    }
    case PartOfSpeech.Noun: {
      return `noun`;
    }
    case PartOfSpeech.Verb: {
      return `verb`;
    }
    case PartOfSpeech.Pronoun: {
      return `pron.`;
    }
    case PartOfSpeech.Preposition: {
      return `prep.`;
    }
    case PartOfSpeech.Conjunction: {
      return `conj.`;
    }
    case PartOfSpeech.Interjection: {
      return `intj.`;
    }
    case PartOfSpeech.MeasureWord: {
      return `mw.`;
    }
    case PartOfSpeech.Particle: {
      return `part.`;
    }
  }
}

export function hanziTextFromHanziChar(hanziChar: HanziChar): HanziText {
  return hanziChar as unknown as HanziText;
}

export function hanziFromHanziWord(hanziWord: HanziWord): HanziText {
  const result = /^(.+?):/.exec(hanziWord);
  invariant(result != null, `couldn't parse HanziWord ${hanziWord}`);

  const [, hanzi] = result;
  invariant(hanzi != null, `couldn't parse hanzi (before :)`);

  return hanzi as HanziText;
}

export function meaningKeyFromHanziWord(hanziWord: HanziWord): string {
  const hanzi = hanziFromHanziWord(hanziWord);
  return hanziWord.slice(hanzi.length + 1 /* skip the : */);
}

export function buildHanziWord(hanzi: string, meaningKey: string): HanziWord {
  return `${hanzi}:${meaningKey}`;
}

/**
 * Break apart a hanzi text into its constituent characters that should be
 * learned in a "bottom up" learning strategy.
 *
 * This first splits up into each character, and then splits each character down
 * further into its constituent parts (radicals).
 */
export async function decomposeHanzi(
  hanzi: HanziText | HanziChar,
): Promise<HanziChar[]> {
  const decompositions = await loadHanziDecomposition();
  const hanziChars = splitHanziText(hanzi);

  // For multi-character hanzi, learn each character, but for for
  // single-character hanzi, decompose it into radicals and learn those.
  const result: HanziChar[] = [];
  if (hanziChars.length > 1) {
    for (const char of hanziChars) {
      result.push(char);
    }
  } else {
    for (const char of hanziChars) {
      const ids = decompositions.get(char);
      if (ids != null) {
        const idsNode = parseIds(ids);
        for (const leaf of walkIdsNode(idsNode)) {
          if (
            leaf.type === `LeafCharacter` &&
            leaf.character !== char // todo turn into invariant?
          ) {
            result.push(leaf.character);
          }
        }
      }
    }
  }

  return result;
}

/**
 * Calculate the number of characters in a string.
 */
export function characterCount(text: string): number {
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  return [...text].length;
}

export function pinyinOrThrow(
  hanziWord: HanziWord,
  meaning: DeepReadonly<HanziWordMeaning> | null,
): PinyinText {
  const pinyin = meaning?.pinyin?.[0];
  invariant(pinyin != null, `missing pinyin for hanzi word ${hanziWord}`);
  return pinyin;
}

export function glossOrThrow(
  hanziWord: HanziWord,
  meaning: DeepReadonly<HanziWordMeaning> | null,
): string {
  const gloss = meaning?.gloss[0];
  invariant(gloss != null, `missing gloss for hanzi word ${hanziWord}`);
  return gloss;
}

export const allPinyinForHanzi = memoize1(async function allPinyinForHanzi(
  hanzi: string,
) {
  const hanziWordMeanings = await lookupHanzi(hanzi);
  const pinyins = new Set<string>();

  for (const [, meaning] of hanziWordMeanings) {
    for (const pinyin of meaning.pinyin ?? emptyArray) {
      pinyins.add(pinyin);
    }
  }

  return pinyins;
});

/**
 * Non-existant pinyin used as distractors in quizes.
 */
export const fakePinyin = [
  // yu fake finals
  `yuen`,
  `yuo`,
  // qu fake finals
  `quan`,
  `quei`,
  `que`,
  // mu fake finals
  `muan`,
  `muei`,
  `mue`,
  `muo`,
  // ju fake finals
  `juan`,
  `juei`,
  `jue`,
  // bu fake finals
  `buan`,
  `buei`,
  `bue`,
  `buo`,
  // pu fake finals
  `puan`,
  `puei`,
  `pue`,
  `puo`,
  // xu fake finals
  `xuan`,
  `xuei`,
  // lü fake finals
  `lüan`,
  `lüei`,
  `lüo`,
  // nü fake finals
  `nüan`,
  `nüei`,
  `nüo`,
  // nu fake finals
  `nuan`,
  `nuei`,
  `nuo`,
  `nui`,
  // lu fake finals
  `luan`,
  `luei`,
  // fu fake finals
  `fuan`,
  `fuei`,
  `fui`,
  `fuo`,
];

export function isHanziChar(hanzi: string): hanzi is HanziChar {
  return characterCount(hanzi) === 1;
}
