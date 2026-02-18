import {
    isHanziCharacter,
    parseIds,
    splitHanziText,
    strokeCountPlaceholderOrNull,
    walkIdsNodeLeafs,
} from "@/data/hanzi";
import type { HanziCharacter, HanziText, HanziWord, PinyinText, PinyinUnit } from '@/data/model';
import { hanziCharacterSchema, hanziWordSchema, HskLevel, hskLevelSchema, PartOfSpeech, pinyinSoundIdSchema, pinyinTextSchema } from '@/data/model';
import { matchAllPinyinUnits } from "@/data/pinyin";
import {
    deepReadonly,
    emptyArray,
    mapArrayAdd,
    memoize0,
    memoize1,
} from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";
import { UnexpectedValueError } from "@pinyinly/lib/types";
import type { DeepReadonly } from "ts-essentials";
import { z } from "zod/v4";

export const loadPinyinWords = memoize0(async function loadPinyinWords() {
  return z
    .array(z.string())
    .transform(deepReadonly)
    .parse(
      await import(`./data/pinyinWords.asset.json`).then((x) => x.default),
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
        await import(`./data/pinyinSoundThemeDetails.asset.json`).then(
          (x) => x.default,
        ),
      );
  },
);

export const pinyinSoundNameSuggestionsSchema = z
  .record(
    z.string(), // theme name
    z.record(pinyinSoundIdSchema, z.record(z.string(), z.string())),
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
        await import(`./data/pinyinSoundNameSuggestions.asset.json`).then(
          (x) => x.default,
        ),
      );
  },
);

export const loadFinalToneFrequencies = memoize0(
  async function loadFinalToneFrequencies() {
    return z
      .record(
        pinyinSoundIdSchema, // (final)
        z.record(pinyinSoundIdSchema, z.number()), // tone (as string) -> count
      )
      .transform((x) => {
        const result = new Map<string, Map<number, number>>();
        for (const [finalId, toneMap] of Object.entries(x)) {
          result.set(
            finalId,
            new Map(Object.entries(toneMap).map(([t, c]) => [Number(t), c])),
          );
        }
        return result;
      })
      .transform(deepReadonly)
      .parse(
        await import(`./data/finalToneFrequencies.asset.json`).then(
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
    .parse(await import(`./data/characters.asset.json`).then((x) => x.default));
});

export const wordListSchema = z.array(hanziWordSchema);

export const loadKangXiRadicalsHanziWords = memoize0(
  async function loadKangXiRadicalsHanziWords() {
    return wordListSchema
      .transform(deepReadonly)
      .parse(
        await import(`./data/kangXiRadicalsHanziWords.asset.json`).then(
          (x) => x.default,
        ),
      );
  },
);

const parsePosPattern = new RegExp(
  `^(?:` +
    [
      `(?<noun>noun|名|n)`,
      `(?<verb>verb|动|v)`,
      `(?<adjective>adjective|形|adj|vs)`,
      `(?<adverb>adverb|副|adv)`,
      `(?<pronoun>pronoun|代|pron|det)`,
      `(?<numeral>numeral|数|num)`,
      `(?<measureWord>measureWord|量|m|mw)`,
      `(?<preposition>preposition|介|prep)`,
      `(?<conjunction>conjunction|连|conj)`,
      `(?<auxiliaryWord>particle|助|aux|ptc)`,
      `(?<interjection>interjection|叹|int)`,
      `(?<prefix>prefix|前缀|pre)`,
      `(?<suffix>suffix|后缀|suf)`,
      `(?<phonetic>Phonetic|拟声|pho)`,
    ].join(`|`) +
    `)$`,
  `i`,
);

export function parsePartOfSpeech(pos: string): PartOfSpeech | undefined {
  const match = parsePosPattern.exec(pos);
  if (match?.groups?.[`noun`] != null) {
    return PartOfSpeech.Noun;
  } else if (match?.groups?.[`verb`] != null) {
    return PartOfSpeech.Verb;
  } else if (match?.groups?.[`adjective`] != null) {
    return PartOfSpeech.Adjective;
  } else if (match?.groups?.[`adverb`] != null) {
    return PartOfSpeech.Adverb;
  } else if (match?.groups?.[`pronoun`] != null) {
    return PartOfSpeech.Pronoun;
  } else if (match?.groups?.[`numeral`] != null) {
    return PartOfSpeech.Numeral;
  } else if (match?.groups?.[`measureWord`] != null) {
    return PartOfSpeech.MeasureWordOrClassifier;
  } else if (match?.groups?.[`preposition`] != null) {
    return PartOfSpeech.Preposition;
  } else if (match?.groups?.[`conjunction`] != null) {
    return PartOfSpeech.Conjunction;
  } else if (match?.groups?.[`auxiliaryWord`] != null) {
    return PartOfSpeech.AuxiliaryWordOrParticle;
  } else if (match?.groups?.[`interjection`] != null) {
    return PartOfSpeech.Interjection;
  } else if (match?.groups?.[`prefix`] != null) {
    return PartOfSpeech.Prefix;
  } else if (match?.groups?.[`suffix`] != null) {
    return PartOfSpeech.Suffix;
  } else if (match?.groups?.[`phonetic`] != null) {
    return PartOfSpeech.Phonetic;
  }
  return undefined;
}

export const hanziWordMeaningSchema = z
  .object({
    gloss: z.array(z.string()),
    pinyin: z
      .array(pinyinTextSchema)
      .describe(
        `all valid pinyin variations for this meaning (might be omitted for radicals without pronunciation)`,
      )
      .nullable()
      .optional(),
    pos: z
      .string()
      .transform((x) => parsePartOfSpeech(x))
      .optional(),
    hsk: hskLevelSchema.optional(),
  })
  .strict();

export type HanziWordMeaning = z.infer<typeof hanziWordMeaningSchema>;
export type HanziWordWithMeaning = [HanziWord, HanziWordMeaning];

export const dictionaryJsonSchema = z
  .array(z.tuple([hanziWordSchema, hanziWordMeaningSchema]))
  .transform((x) => new Map(x));

export type DictionaryJson = z.infer<typeof dictionaryJsonSchema>;

export const loadDictionaryJson = memoize0(async () =>
  dictionaryJsonSchema
    .transform(deepReadonly)
    .parse(await import(`./data/dictionary.asset.json`).then((x) => x.default)),
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
        await import(`./data/hanziWordMigrations.asset.json`).then(
          (x) => x.default,
        ),
      );
  },
);

export const loadKangXiRadicalsStrokes = memoize0(async () =>
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
      await import(`./data/kangXiRadicalsStrokes.asset.json`).then(
        (x) => x.default,
      ),
    ),
);

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
      allEntries: readonly [HanziWord, DeepReadonly<HanziWordMeaning>][];
      allHanziWords: readonly HanziWord[];
      hsk1HanziWords: readonly HanziWord[];
      hsk2HanziWords: readonly HanziWord[];
      hsk3HanziWords: readonly HanziWord[];
      hsk4HanziWords: readonly HanziWord[];
      hsk5HanziWords: readonly HanziWord[];
      hsk6HanziWords: readonly HanziWord[];
      hsk7To9HanziWords: readonly HanziWord[];
    }>
  > => {
    const hanziMap = new Map<string, HanziWordWithMeaning[]>();
    const glossMap = new Map<string, HanziWordWithMeaning[]>();
    const dictionaryJson = await loadDictionaryJson();
    const hsk1HanziWords: HanziWord[] = [];
    const hsk2HanziWords: HanziWord[] = [];
    const hsk3HanziWords: HanziWord[] = [];
    const hsk4HanziWords: HanziWord[] = [];
    const hsk5HanziWords: HanziWord[] = [];
    const hsk6HanziWords: HanziWord[] = [];
    const hsk7To9HanziWords: HanziWord[] = [];

    for (const item of dictionaryJson) {
      const [hanziWord, meaning] = item;

      mapArrayAdd(hanziMap, hanziFromHanziWord(hanziWord), item);

      for (const gloss of meaning.gloss) {
        mapArrayAdd(glossMap, gloss, item);
      }

      switch (meaning.hsk) {
        case undefined: {
          break;
        }
        case HskLevel[1]: {
          hsk1HanziWords.push(hanziWord);
          break;
        }
        case HskLevel[2]: {
          hsk2HanziWords.push(hanziWord);
          break;
        }
        case HskLevel[3]: {
          hsk3HanziWords.push(hanziWord);
          break;
        }
        case HskLevel[4]: {
          hsk4HanziWords.push(hanziWord);
          break;
        }
        case HskLevel[5]: {
          hsk5HanziWords.push(hanziWord);
          break;
        }
        case HskLevel[6]: {
          hsk6HanziWords.push(hanziWord);
          break;
        }
        case HskLevel[`7-9`]: {
          hsk7To9HanziWords.push(hanziWord);
          break;
        }
        default: {
          throw new UnexpectedValueError(meaning.hsk);
        }
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
      hsk1HanziWords,
      hsk2HanziWords,
      hsk3HanziWords,
      hsk4HanziWords,
      hsk5HanziWords,
      hsk6HanziWords,
      hsk7To9HanziWords,
    };
  },
);

/**
 * The type of the dictionary index returned by {@link loadDictionary}.
 */
export type Dictionary = Awaited<ReturnType<typeof loadDictionary>>;

export const lookupRadicalsByStrokes = async (strokes: number) =>
  loadKangXiRadicalsStrokes().then((x) => x.get(strokes) ?? null);

export const allHanziCharacters = memoize0(async function allHanziCharacters() {
  const characters = await loadCharacters();

  return new Set([...characters].map(([char]) => char));
});

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

export function hanziFromHanziOrHanziWord(
  hanziOrHanziWord: HanziText | HanziWord,
): HanziText {
  if (isHanziWord(hanziOrHanziWord)) {
    return hanziFromHanziWord(hanziOrHanziWord);
  }
  return hanziOrHanziWord;
}

export function oneUnitPinyinOrNull(
  meaning: DeepReadonly<HanziWordMeaning> | null,
): PinyinUnit | null {
  const pinyin = meaning?.pinyin?.[0];

  if (pinyin != null) {
    const units = matchAllPinyinUnits(pinyin);
    if (units.length === 1 && units[0] === pinyin) {
      // It's safe to cast here, because all pinyin in the dictionary are
      // already normalized.
      return pinyin as PinyinUnit;
    }
  }

  return null;
}

export const allHanziCharacterPronunciationsForHanzi = memoize1(
  async function allHanziCharacterPronunciationsForHanzi(
    hanzi: HanziText,
  ): Promise<Set<PinyinUnit>> {
    const dictionary = await loadDictionary();
    const hanziWordMeanings = dictionary.lookupHanzi(hanzi);
    const pronunciations = new Set<PinyinUnit>();

    invariant(
      isHanziCharacter(hanzi),
      `expected %s to be a single-character hanzi`,
      hanzi,
    );

    for (const [, meaning] of hanziWordMeanings) {
      for (const pinyin of meaning.pinyin ?? emptyArray) {
        pronunciations.add(pinyin as PinyinUnit);
      }
    }

    return pronunciations;
  },
);

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
