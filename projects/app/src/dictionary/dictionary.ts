import {
  isHanziChar,
  parseIds,
  splitHanziText,
  walkIdsNode,
} from "@/data/hanzi";
import type {
  HanziChar,
  HanziText,
  HanziWord,
  PinyinPronunciation,
  PinyinSyllable,
} from "@/data/model";
import { PartOfSpeech } from "@/data/model";
import { rMnemonicThemeId, rPinyinPronunciation } from "@/data/rizzleSchema";
import {
  deepReadonly,
  emptyArray,
  mapArrayAdd,
  memoize0,
  memoize1,
  sortComparatorString,
} from "@/util/collections";
import { invariant } from "@pinyinly/lib/invariant";
import type { DeepReadonly } from "ts-essentials";
import { z } from "zod/v4";

export const hhhMarkSchema = z.string();
export const hanziWordSchema = z.string().pipe(z.custom<HanziWord>());
export const hanziTextSchema = z.string().pipe(z.custom<HanziText>());
export const hanziCharSchema = z.string().pipe(z.custom<HanziChar>());
export const pinyinPronunciationSchema = rPinyinPronunciation()
  .getUnmarshal()
  .describe(`space separated pinyin for each word`);

export const loadPinyinWords = memoize0(async function loadPinyinWords() {
  return (
    z
      .array(z.string())
      .transform(deepReadonly)
      // eslint-disable-next-line unicorn/no-await-expression-member
      .parse((await import(`./pinyinWords.asset.json`)).default)
  );
});

export const loadMissingFontGlyphs = memoize0(
  async function loadMissingFontGlyphs() {
    return (
      z
        .record(z.string(), z.array(z.string()))
        .transform(
          (x) => new Map(Object.entries(x).map(([k, v]) => [k, new Set(v)])),
        )
        .transform(deepReadonly)
        // eslint-disable-next-line unicorn/no-await-expression-member
        .parse((await import(`./missingFontGlyphs.asset.json`)).default)
    );
  },
);

export const loadMnemonicThemes = memoize0(async function loadMnemonicThemes() {
  return (
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
      .parse((await import(`./mnemonicThemes.asset.json`)).default)
  );
});

export const mnemonicThemeChoicesSchema = z
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
  );

export const loadMnemonicThemeChoices = memoize0(
  async function loadMnemonicThemeChoices() {
    return (
      mnemonicThemeChoicesSchema
        .transform(deepReadonly)
        // eslint-disable-next-line unicorn/no-await-expression-member
        .parse((await import(`./mnemonicThemeChoices.asset.json`)).default)
    );
  },
);

export const loadHanziDecomposition = memoize0(
  async function loadHanziDecomposition() {
    return (
      z
        .array(z.tuple([z.string(), z.string()]))
        .transform((x) => new Map(x))
        .transform(deepReadonly)
        // eslint-disable-next-line unicorn/no-await-expression-member
        .parse((await import(`./hanziDecomposition.asset.json`)).default)
    );
  },
);

export const loadHanziWordGlossMnemonics = memoize0(
  async function loadHanziWordGlossMnemonics() {
    return (
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
        .parse((await import(`./hanziWordGlossMnemonics.asset.json`)).default)
    );
  },
);

export const wordListSchema = z.array(hanziWordSchema);

export const allRadicalHanziWords = memoize0(
  async function allRadicalHanziWords() {
    return (
      wordListSchema
        .transform(deepReadonly)
        // eslint-disable-next-line unicorn/no-await-expression-member
        .parse((await import(`./radicalsHanziWords.asset.json`)).default)
    );
  },
);

export const allHsk1HanziWords = memoize0(async function allHsk1HanziWords() {
  return (
    wordListSchema
      .transform(deepReadonly)
      // eslint-disable-next-line unicorn/no-await-expression-member
      .parse((await import(`./hsk1HanziWords.asset.json`)).default)
  );
});

export const allHsk2HanziWords = memoize0(async function allHsk2HanziWords() {
  return (
    wordListSchema
      .transform(deepReadonly)
      // eslint-disable-next-line unicorn/no-await-expression-member
      .parse((await import(`./hsk2HanziWords.asset.json`)).default)
  );
});

export const allHsk3HanziWords = memoize0(async function allHsk3HanziWords() {
  return (
    wordListSchema
      .transform(deepReadonly)
      // eslint-disable-next-line unicorn/no-await-expression-member
      .parse((await import(`./hsk3HanziWords.asset.json`)).default)
  );
});

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
  glossHint: z.string().nullable().optional(),
  pinyin: z
    .array(pinyinPronunciationSchema)
    .describe(
      `all valid pinyin variations for this meaning (might be omitted for radicals without pronunciation)`,
    )
    .nullable()
    .optional(),
  example: z
    .string()
    .describe(`a Chinese sentence that includes this hanzi`)
    .nullable()
    .optional(),
  partOfSpeech: partOfSpeechSchema,
  componentFormOf: hanziCharSchema
    .describe(
      `the primary form of this hanzi (only relevant for component-form hanzi)`,
    )
    .nullable()
    .optional(),
  visualVariants: z
    .array(hanziTextSchema)
    .describe(
      `Hanzi with the same meaning but visually different. Only included in rare cases (e.g. radicals with multiple visual forms).`,
    )
    .nullable()
    .optional(),
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

export const loadWiki = memoize0(async function loadWiki() {
  return (
    wikiSchema
      .transform(deepReadonly)
      // eslint-disable-next-line unicorn/no-await-expression-member
      .parse((await import(`./wiki.asset.json`)).default)
  );
});

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

export const loadHanziWordMigrations = memoize0(
  async function loadHanziWordMigrations() {
    return (
      hanziWordMigrationsSchema
        .transform(deepReadonly)
        // eslint-disable-next-line unicorn/no-await-expression-member
        .parse((await import(`./hanziWordMigrations.asset.json`)).default)
    );
  },
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

export const loadHanziWordPinyinMnemonics = memoize0(
  async function loadHanziWordPinyinMnemonics() {
    return (
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
        .parse((await import(`./radicalPinyinMnemonics.asset.json`)).default)
    );
  },
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
  hanzi: HanziText,
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

export const allHanziWordsHanzi = memoize0(async function allHanziWordsHanzi() {
  return new Set(
    [
      ...(await allRadicalHanziWords()),
      ...(await allHsk1HanziWords()),
      ...(await allHsk2HanziWords()),
      ...(await allHsk3HanziWords()),
    ].map((x) => hanziFromHanziWord(x)),
  );
});

export const allOneSyllableHanzi = memoize0(
  async function allOneSyllableHanzi() {
    return new Set<HanziChar>(
      [
        ...(await allRadicalHanziWords()),
        ...(await allHsk1HanziWords()),
        ...(await allHsk2HanziWords()),
        ...(await allHsk3HanziWords()),
      ]
        .map((x) => hanziFromHanziWord(x))
        .filter((x) => isHanziChar(x)) as unknown as HanziChar[],
    );
  },
);

export const allHanziCharacters = memoize0(async function allHanziCharacters() {
  return new Set(
    [...(await allHanziWordsHanzi())]
      // Split words into characters because decomposition is per-character.
      .flatMap((x) => splitHanziText(x)),
  );
});

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

export const isHanziWord = memoize1(function isHanziWord(
  hanziOrHanziWord: HanziText | HanziWord,
): hanziOrHanziWord is HanziWord {
  return hanziOrHanziWord.includes(`:`);
});

export const hanziFromHanziWord = memoize1(function hanziFromHanziWord(
  hanziWord: HanziWord,
): HanziText {
  const result = /^(.+?):/.exec(hanziWord);
  invariant(result != null, `couldn't parse HanziWord ${hanziWord}`);

  const [, hanzi] = result;
  invariant(hanzi != null, `couldn't parse hanzi (before :)`);

  return hanzi as HanziText;
});

export const hanziCharsFromHanziWord = memoize1(
  function hanziCharsFromHanziWord(hanziWord: HanziWord): HanziChar[] {
    const hanzi = hanziFromHanziWord(hanziWord);
    return splitHanziText(hanzi);
  },
);

export const meaningKeyFromHanziWord = memoize1(
  function meaningKeyFromHanziWord(hanziWord: HanziWord): string {
    const hanzi = hanziFromHanziWord(hanziWord);
    return hanziWord.slice(hanzi.length + 1 /* skip the : */);
  },
);

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
export async function decomposeHanzi(hanzi: HanziText): Promise<HanziChar[]> {
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
            leaf.operator === `LeafCharacter` &&
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

export function pinyinOrThrow(
  hanziWord: HanziWord,
  meaning: DeepReadonly<HanziWordMeaning> | null,
): Readonly<PinyinPronunciation> {
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

export function hanziFromHanziOrHanziWord(
  hanziOrHanziWord: HanziText | HanziWord,
): HanziText {
  if (isHanziWord(hanziOrHanziWord)) {
    return hanziFromHanziWord(hanziOrHanziWord);
  }
  return hanziOrHanziWord;
}

export function oneSyllablePinyinOrThrow(
  hanziWord: HanziWord,
  meaning: DeepReadonly<HanziWordMeaning> | null,
): PinyinSyllable {
  const pronunciation = pinyinOrThrow(hanziWord, meaning);
  const syllable = pronunciation[0];
  invariant(
    syllable != null && pronunciation.length === 1,
    `expected only one syllable`,
  );
  return syllable;
}

export const allPronunciationsForHanzi = memoize1(
  async function allPronunciationsForHanzi(
    hanzi: HanziText,
  ): Promise<Set<Readonly<PinyinPronunciation>>> {
    const hanziWordMeanings = await lookupHanzi(hanzi);
    const pronunciations = new Set<Readonly<PinyinPronunciation>>();

    for (const [, meaning] of hanziWordMeanings) {
      for (const pronunciation of meaning.pinyin ?? emptyArray) {
        pronunciations.add(pronunciation);
      }
    }

    return pronunciations;
  },
);

export const allOneSyllablePronunciationsForHanzi = memoize1(
  async function allOneSyllablePronunciationsForHanzi(
    hanzi: HanziText,
  ): Promise<Set<PinyinSyllable>> {
    const hanziWordMeanings = await lookupHanzi(hanzi);
    const pronunciations = new Set<PinyinSyllable>();

    for (const [, meaning] of hanziWordMeanings) {
      for (const pronunciation of meaning.pinyin ?? emptyArray) {
        if (pronunciation.length === 1) {
          const syllable = pronunciation[0];
          invariant(syllable != null);
          pronunciations.add(syllable);
        }
      }
    }

    return pronunciations;
  },
);

export function upsertHanziWordMeaning(
  dict: Dictionary,
  hanziWord: HanziWord,
  patch: Partial<HanziWordMeaning>,
): void {
  if (patch.pinyin?.length === 0) {
    patch.pinyin = undefined;
  }

  if (patch.definition?.trim().length === 0) {
    patch.definition = undefined;
  }

  if (patch.example?.trim().length === 0) {
    patch.example = undefined;
  }

  if (patch.glossHint?.trim().length === 0) {
    patch.glossHint = undefined;
  }

  if (patch.visualVariants?.length === 0) {
    patch.visualVariants = undefined;
  }

  if (patch.componentFormOf?.trim().length === 0) {
    patch.componentFormOf = undefined;
  }

  const meaning = dict.get(hanziWord);
  if (meaning == null) {
    dict.set(hanziWord, patch as HanziWordMeaning);
  } else {
    dict.set(hanziWord, { ...meaning, ...patch });
  }

  // Test the validity of the dictionary.
  dictionarySchema.parse(unparseDictionary(dict));
}

export function unparseDictionary(
  dict: Dictionary,
): z.input<typeof dictionarySchema> {
  return [...dict.entries()]
    .map(([hanziWord, meaning]): z.input<typeof dictionarySchema>[number] => [
      hanziWord,
      {
        gloss: meaning.gloss,
        glossHint: meaning.glossHint ?? undefined,
        pinyin:
          meaning.pinyin?.map((p) => rPinyinPronunciation().marshal(p)) ??
          undefined,
        example: meaning.example ?? undefined,
        partOfSpeech: meaning.partOfSpeech,
        componentFormOf: meaning.componentFormOf ?? undefined,
        visualVariants: meaning.visualVariants ?? undefined,
        definition: meaning.definition,
      } satisfies z.input<typeof hanziWordMeaningSchema>,
    ])
    .sort(sortComparatorString((x) => x[0]));
}
