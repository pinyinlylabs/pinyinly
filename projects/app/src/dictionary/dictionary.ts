import {
  parseIds,
  splitHanziText,
  strokeCountPlaceholderOrNull,
  walkIdsNodeLeafs,
} from "@/data/hanzi";
import type {
  HanziGrapheme,
  HanziText,
  HanziWord,
  PinyinPronunciation,
  PinyinSyllable,
} from "@/data/model";
import {
  hanziGraphemeSchema,
  hanziWordSchema,
  PartOfSpeech,
} from "@/data/model";
import { rPinyinPronunciation } from "@/data/rizzleSchema";
import {
  deepReadonly,
  emptyArray,
  mapArrayAdd,
  memoize0,
  memoize1,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";
import type { DeepReadonly } from "ts-essentials";
import { z } from "zod/v4";

export const pinyinPronunciationSchema = rPinyinPronunciation()
  .getUnmarshal()
  .describe(`space separated pinyin for each word`);

export const loadPinyinWords = memoize0(async function loadPinyinWords() {
  return z
    .array(z.string())
    .transform(deepReadonly)
    .parse(await import(`./pinyinWords.asset.json`).then((x) => x.default));
});

export const loadPinyinSoundThemeDetails = memoize0(
  async function loadPinyinSoundThemeDetails() {
    return z
      .record(
        z.string(), // theme name
        z.object({
          noun: z.string(),
          description: z.string(),
        }),
      )
      .transform((x) => new Map(Object.entries(x)))
      .transform(deepReadonly)
      .parse(
        await import(`./pinyinSoundThemeDetails.asset.json`).then(
          (x) => x.default,
        ),
      );
  },
);

export const pinyinSoundNameSuggestionsSchema = z
  .record(
    z.string(), // theme name
    z.record(
      z.string(), // PinyinSoundId
      z.record(z.string(), z.string()),
    ),
  )
  .transform(
    (x) =>
      new Map(
        Object.entries(x).map(([k, v]) => [
          k,
          new Map(
            Object.entries(v).map(([k2, v2]) => [
              k2,
              new Map(Object.entries(v2)),
            ]),
          ),
        ]),
      ),
  );

export const loadPinyinSoundNameSuggestions = memoize0(
  async function loadPinyinSoundNameSuggestions() {
    return pinyinSoundNameSuggestionsSchema
      .transform(deepReadonly)
      .parse(
        await import(`./pinyinSoundNameSuggestions.asset.json`).then(
          (x) => x.default,
        ),
      );
  },
);

export const charactersSchema = z.array(
  z.tuple([
    hanziGraphemeSchema,
    z.object({
      decomposition: z.string().optional(),
      componentFormOf: hanziGraphemeSchema
        .describe(
          `the primary form of this hanzi (only relevant for component-form hanzi)`,
        )
        .optional(),
      isStructural: z
        .literal(true)
        .optional()
        .describe(
          `is used as a component in regular Hanzi characters (e.g. parts of 兰, 兴, etc.), but never used independently as a full word or character in modern Mandarin.`,
        ),
      canonicalForm: hanziGraphemeSchema.optional(),
    }),
  ]),
);

export type CharactersKey = z.infer<typeof charactersSchema.element>[0];
export type CharactersValue = z.infer<typeof charactersSchema.element>[1];

export const loadCharacters = memoize0(async function loadCharacters() {
  return charactersSchema
    .transform((x) => new Map(x))
    .transform(deepReadonly)
    .parse(await import(`./characters.asset.json`).then((x) => x.default));
});

export const wordListSchema = z.array(hanziWordSchema);

export const allRadicalHanziWords = memoize0(
  async function allRadicalHanziWords() {
    return wordListSchema
      .transform(deepReadonly)
      .parse(
        await import(`./radicalsHanziWords.asset.json`).then((x) => x.default),
      );
  },
);

export const allHsk1HanziWords = memoize0(async function allHsk1HanziWords() {
  return wordListSchema
    .transform(deepReadonly)
    .parse(await import(`./hsk1HanziWords.asset.json`).then((x) => x.default));
});

export const allHsk2HanziWords = memoize0(async function allHsk2HanziWords() {
  return wordListSchema
    .transform(deepReadonly)
    .parse(await import(`./hsk2HanziWords.asset.json`).then((x) => x.default));
});

export const allHsk3HanziWords = memoize0(async function allHsk3HanziWords() {
  return wordListSchema
    .transform(deepReadonly)
    .parse(await import(`./hsk3HanziWords.asset.json`).then((x) => x.default));
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
]);

export const hanziWordMeaningSchema = z
  .object({
    gloss: z.array(z.string()),
    pinyin: z
      .array(pinyinPronunciationSchema)
      .describe(
        `all valid pinyin variations for this meaning (might be omitted for radicals without pronunciation)`,
      )
      .nullable()
      .optional(),
    partOfSpeech: partOfSpeechSchema.optional(),
  })
  .strict();

export type HanziWordMeaning = z.infer<typeof hanziWordMeaningSchema>;
export type HanziWordWithMeaning = [HanziWord, HanziWordMeaning];

export const dictionarySchema = z
  .array(z.tuple([hanziWordSchema, hanziWordMeaningSchema]))
  .transform((x) => new Map(x));

export type Dictionary = z.infer<typeof dictionarySchema>;

export const loadDictionary = memoize0(async () =>
  dictionarySchema
    .transform(deepReadonly)
    .parse(await import(`./dictionary.asset.json`).then((x) => x.default)),
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

export const loadHanziWordMigrations = memoize0(
  async function loadHanziWordMigrations() {
    return hanziWordMigrationsSchema
      .transform(deepReadonly)
      .parse(
        await import(`./hanziWordMigrations.asset.json`).then((x) => x.default),
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
    .parse(await import(`./radicalStrokes.asset.json`).then((x) => x.default)),
);

export const allRadicalsByStrokes = async () => await loadRadicalStrokes();

/**
 * Build an inverted index of hanzi words to hanzi word meanings and glosses to
 * hanzi word meanings. Useful when building learning graphs.
 */
export const hanziToHanziWordMap = memoize0(
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

export const lookupRadicalsByStrokes = async (strokes: number) =>
  await loadRadicalStrokes().then((x) => x.get(strokes) ?? null);

export const allHanziWordsHanzi = memoize0(
  async function allHanziWordsHanzi2() {
    return new Set<HanziText>(
      [
        ...(await allRadicalHanziWords()),
        ...(await loadDictionary().then((x) => [...x.keys()])),
      ].map((x) => hanziFromHanziWord(x)),
    );
  },
);

export const allHanziGraphemes = memoize0(async function allHanziGraphemes() {
  return new Set(
    [...(await allHanziWordsHanzi())]
      // Split words into graphemes because decomposition is per-grapheme.
      .flatMap((x) => splitHanziText(x)),
  );
});

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

export function hanziTextFromHanziGrapheme(grapheme: HanziGrapheme): HanziText {
  return grapheme as unknown as HanziText;
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

export const hanziGraphemesFromHanziWord = memoize1(
  function hanziGraphemesFromHanziWord(hanziWord: HanziWord): HanziGrapheme[] {
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
 * Break apart a hanzi text into its constituent graphemes that should be
 * learned in a "bottom up" learning strategy.
 *
 * This first splits up into each graphemes, and then splits each graphemes down
 * further into its constituent parts (radicals).
 */
export async function decomposeHanzi(
  hanzi: HanziText,
): Promise<HanziGrapheme[]> {
  const charactersData = await loadCharacters();
  const hanziGraphemes = splitHanziText(hanzi);

  // For multi-grapheme hanzi, learn each grapheme, but for for
  // single-grapheme hanzi, decompose it into radicals and learn those.
  const result: HanziGrapheme[] = [];
  if (hanziGraphemes.length > 1) {
    for (const char of hanziGraphemes) {
      result.push(char);
    }
  } else {
    for (const char of hanziGraphemes) {
      const ids = charactersData.get(char)?.decomposition;
      if (ids != null) {
        const idsNode = parseIds(ids);
        for (const leaf of walkIdsNodeLeafs(idsNode)) {
          if (
            strokeCountPlaceholderOrNull(leaf) == null &&
            leaf !== char // todo turn into invariant?
          ) {
            result.push(leaf as HanziGrapheme);
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

export const allHanziGraphemePronunciationsForHanzi = memoize1(
  async function allHanziGraphemePronunciationsForHanzi(
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
    .map(([hanziWord, meaning]): z.input<typeof dictionarySchema>[number] => {
      return [
        hanziWord,
        {
          ...meaning,
          pinyin:
            meaning.pinyin?.map((p) => rPinyinPronunciation().marshal(p)) ??
            undefined,
        } satisfies z.input<typeof hanziWordMeaningSchema>,
      ];
    })
    .sort(sortComparatorString((x) => x[0]));
}

export const getIsStructuralHanzi = memoize0(async () => {
  const characters = await loadCharacters();

  const structuralHanzi = new Set<HanziText>();

  for (const [character, data] of characters.entries()) {
    if (data.isStructural != null) {
      structuralHanzi.add(character);
    }
  }

  const isStructuralHanzi = (hanzi: HanziText) => structuralHanzi.has(hanzi);

  return isStructuralHanzi;
});

export const getIsComponentFormHanzi = memoize0(async () => {
  const characters = await loadCharacters();
  const componentFormHanzi = new Set<HanziText>();

  for (const [character, data] of characters.entries()) {
    if (data.componentFormOf != null) {
      componentFormHanzi.add(character);
    }
  }

  const isComponentFormHanzi = (hanzi: HanziText) =>
    componentFormHanzi.has(hanzi);

  return isComponentFormHanzi;
});
