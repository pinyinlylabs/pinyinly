import {
  parseIds,
  splitHanziText,
  strokeCountPlaceholderOrNull,
  walkIdsNodeLeafs,
} from "@/data/hanzi";
import type {
  HanziCharacter,
  HanziText,
  HanziWord,
  PinyinPronunciation,
  PinyinSyllable,
} from "@/data/model";
import {
  hanziCharacterSchema,
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
    .parse(
      await import(`./dictionary/pinyinWords.asset.json`).then(
        (x) => x.default,
      ),
    );
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
        await import(`./dictionary/pinyinSoundThemeDetails.asset.json`).then(
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
        await import(`./dictionary/pinyinSoundNameSuggestions.asset.json`).then(
          (x) => x.default,
        ),
      );
  },
);

export const charactersSchema = z.array(
  z.tuple([
    hanziCharacterSchema,
    z.object({
      decomposition: z.string().optional(),
      componentFormOf: hanziCharacterSchema
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
      canonicalForm: hanziCharacterSchema.optional(),
    }),
  ]),
);

export type CharactersKey = z.infer<typeof charactersSchema.element>[0];
export type CharactersValue = z.infer<typeof charactersSchema.element>[1];

export const loadCharacters = memoize0(async function loadCharacters() {
  return charactersSchema
    .transform((x) => new Map(x))
    .transform(deepReadonly)
    .parse(
      await import(`./dictionary/characters.asset.json`).then((x) => x.default),
    );
});

export const wordListSchema = z.array(hanziWordSchema);

export const allRadicalHanziWords = memoize0(
  async function allRadicalHanziWords() {
    return wordListSchema
      .transform(deepReadonly)
      .parse(
        await import(`./dictionary/radicalsHanziWords.asset.json`).then(
          (x) => x.default,
        ),
      );
  },
);

export const allHsk1HanziWords = memoize0(async function allHsk1HanziWords() {
  return wordListSchema
    .transform(deepReadonly)
    .parse(
      await import(`./dictionary/hsk1HanziWords.asset.json`).then(
        (x) => x.default,
      ),
    );
});

export const allHsk2HanziWords = memoize0(async function allHsk2HanziWords() {
  return wordListSchema
    .transform(deepReadonly)
    .parse(
      await import(`./dictionary/hsk2HanziWords.asset.json`).then(
        (x) => x.default,
      ),
    );
});

export const allHsk3HanziWords = memoize0(async function allHsk3HanziWords() {
  return wordListSchema
    .transform(deepReadonly)
    .parse(
      await import(`./dictionary/hsk3HanziWords.asset.json`).then(
        (x) => x.default,
      ),
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

export const loadDictionaryJson = memoize0(async () =>
  dictionarySchema
    .transform(deepReadonly)
    .parse(
      await import(`./dictionary/dictionary.asset.json`).then((x) => x.default),
    ),
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
        await import(`./dictionary/hanziWordMigrations.asset.json`).then(
          (x) => x.default,
        ),
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
    .parse(
      await import(`./dictionary/radicalStrokes.asset.json`).then(
        (x) => x.default,
      ),
    ),
);

export const allRadicalsByStrokes = async () => await loadRadicalStrokes();

/**
 * Build an inverted index of hanzi words to hanzi word meanings and glosses to
 * hanzi word meanings. Useful when building learning graphs.
 */
export const loadDictionary = memoize0(
  async (): Promise<
    Readonly<{
      lookupHanzi(hanzi: HanziText): readonly HanziWordWithMeaning[];
      lookupHanziWord(hanzi: HanziWord): DeepReadonly<HanziWordMeaning> | null;
      lookupGloss(gloss: string): readonly HanziWordWithMeaning[];
      allEntries: [HanziWord, DeepReadonly<HanziWordMeaning>][];
      allHanziWords: HanziWord[];
    }>
  > => {
    const hanziMap = new Map<string, HanziWordWithMeaning[]>();
    const glossMap = new Map<string, HanziWordWithMeaning[]>();
    const dictionaryJson = await loadDictionaryJson();

    for (const item of dictionaryJson) {
      const [hanziWord, meaning] = item;

      mapArrayAdd(hanziMap, hanziFromHanziWord(hanziWord), item);

      for (const gloss of meaning.gloss) {
        mapArrayAdd(glossMap, gloss, item);
      }
    }

    return {
      lookupHanzi(hanzi: HanziText) {
        return hanziMap.get(hanzi) ?? emptyArray;
      },
      lookupHanziWord(hanziWord: HanziWord) {
        return dictionaryJson.get(hanziWord) ?? null;
      },
      lookupGloss(gloss: string) {
        return glossMap.get(gloss) ?? emptyArray;
      },
      allEntries: [...dictionaryJson.entries()],
      allHanziWords: [...dictionaryJson.keys()],
    };
  },
);

export const lookupRadicalsByStrokes = async (strokes: number) =>
  await loadRadicalStrokes().then((x) => x.get(strokes) ?? null);

export const allHanziWordsHanzi = memoize0(
  async function allHanziWordsHanzi2() {
    return new Set<HanziText>(
      [
        ...(await allRadicalHanziWords()),
        ...(await loadDictionaryJson().then((x) => [...x.keys()])),
      ].map((x) => hanziFromHanziWord(x)),
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

export function hanziTextFromHanziCharacter(
  character: HanziCharacter,
): HanziText {
  return character as unknown as HanziText;
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

export const hanziCharactersFromHanziWord = memoize1(
  function hanziCharactersFromHanziWord(
    hanziWord: HanziWord,
  ): HanziCharacter[] {
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
 * This first splits up into each characters, and then splits each characters down
 * further into its constituent parts (radicals).
 */
export async function decomposeHanzi(
  hanzi: HanziText,
): Promise<HanziCharacter[]> {
  const charactersData = await loadCharacters();
  const hanziCharacters = splitHanziText(hanzi);

  // For multi-character hanzi, learn each character, but for for
  // single-character hanzi, decompose it into radicals and learn those.
  const result: HanziCharacter[] = [];
  if (hanziCharacters.length > 1) {
    for (const char of hanziCharacters) {
      result.push(char);
    }
  } else {
    for (const character of hanziCharacters) {
      const ids = charactersData.get(character)?.decomposition;
      if (ids != null) {
        const idsNode = parseIds(ids);
        for (const leaf of walkIdsNodeLeafs(idsNode)) {
          if (
            strokeCountPlaceholderOrNull(leaf) == null &&
            leaf !== character // todo turn into invariant?
          ) {
            result.push(leaf as HanziCharacter);
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
    const dictionary = await loadDictionary();
    const hanziWordMeanings = dictionary.lookupHanzi(hanzi);
    const pronunciations = new Set<Readonly<PinyinPronunciation>>();

    for (const [, meaning] of hanziWordMeanings) {
      for (const pronunciation of meaning.pinyin ?? emptyArray) {
        pronunciations.add(pronunciation);
      }
    }

    return pronunciations;
  },
);

export const allHanziCharacterPronunciationsForHanzi = memoize1(
  async function allHanziCharacterPronunciationsForHanzi(
    hanzi: HanziText,
  ): Promise<Set<PinyinSyllable>> {
    const dictionary = await loadDictionary();
    const hanziWordMeanings = dictionary.lookupHanzi(hanzi);
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
