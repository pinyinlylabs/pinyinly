import { mapStrokeSpec } from "@/util/strokeSpec";
import {
  isHanziCharacter,
  parseIds,
  parseIdsLeafs,
  splitHanziText,
  walkIdsNodeLeafs,
} from "@/data/hanzi";
import type {
  HanziCharacter,
  HanziWord,
  HanziIds,
  PinyinText,
  PinyinUnit,
  StrokeSpecString,
  HanziText,
  HanziIdsLeaf,
  CharacterDecompositionRow,
  CharacterComponentUsageRow,
} from "@/data/model";
import {
  charactersSchema,
  hanziWordSchema,
  HskLevel,
  hskLevelSchema,
  isHanziStrokeCountChar,
  PartOfSpeech,
  pinyinSoundIdSchema,
  pinyinTextSchema,
} from "@/data/model";
import { matchAllPinyinUnits, normalizePinyinUnit } from "@/data/pinyin";
import {
  arrayFilterUnique,
  deepReadonly,
  emptyArray,
  mapArrayAdd,
  mapSetAdd,
  memoize0,
  memoize1,
  weakMemoize1,
  zipStrict,
} from "@pinyinly/lib/collections";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import { UnexpectedValueError } from "@pinyinly/lib/types";
import type { DeepReadonly } from "ts-essentials";
import { z } from "zod";

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

export const loadCharactersJson = memoize0(async function loadCharactersJson() {
  return charactersSchema
    .transform((x) => new Map(x))
    .transform(deepReadonly)
    .parse(
      await import(`./data/characters.asset.json`).then(
        (x) => x.default as unknown[],
      ),
    );
});

export type CharactersJson = Awaited<ReturnType<typeof loadCharactersJson>>;

export const loadBuiltinCharacterDecompositionEntries = memoize0(
  async function loadBuiltinCharacterDecompositionEntries() {
    const charactersJson = await loadCharactersJson();
    const entries: CharacterDecompositionRow[] = [];

    for (const [hanzi, data] of charactersJson.entries()) {
      if (data.decompositions == null) {
        continue;
      }

      for (const [ids, strokeSpecs] of Object.entries(data.decompositions)) {
        entries.push({
          hanzi: hanzi,
          ids: ids as HanziIds,
          strokeSpecs,
        });
      }
    }

    entries.sort((a, b) => a.hanzi.localeCompare(b.hanzi));

    return deepReadonly(
      entries as unknown[],
    ) as readonly CharacterDecompositionRow[];
  },
);

/**
 * Same as @see loadBuiltinCharacterDecompositionEntries but only includes
 * decompositions used by mnemonics.
 */
export const loadBuiltinCharacterDecompositionForMnemonicsEntries = memoize0(
  async function loadBuiltinCharacterDecompositionForMnemonicsEntries() {
    const charactersJson = await loadCharactersJson();
    const entries: CharacterDecompositionRow[] = [];

    for (const [hanzi, data] of charactersJson.entries()) {
      if (data.decompositions == null) {
        continue;
      }

      const decompositionEntries = Object.entries(data.decompositions);

      if (data.mnemonic === null) {
        continue;
      } else if (data.mnemonic === undefined) {
        invariant(
          !(decompositionEntries.length > 1),
          `%s has more than one decomposition causing ambiguous learning dependencies`,
          hanzi,
        );
      }

      for (const [ids, strokeSpecs] of Object.entries(data.decompositions)) {
        if (data.mnemonic != null && ids !== data.mnemonic) {
          continue;
        }

        entries.push({
          hanzi,
          ids: ids as HanziIds,
          strokeSpecs,
        });
        break; // only include the first decomposition to avoid duplicates
      }
    }

    entries.sort((a, b) => a.hanzi.localeCompare(b.hanzi));

    return deepReadonly(
      entries as unknown[],
    ) as readonly CharacterDecompositionRow[];
  },
);

const groupByHanzi = weakMemoize1(
  <H extends HanziCharacter, T extends Readonly<{ hanzi: H }>>(
    decompositionData: readonly T[],
  ): ReadonlyMap<H, readonly T[]> => {
    const result = new Map<H, T[]>();
    for (const entry of decompositionData) {
      mapArrayAdd(result, entry.hanzi, entry);
    }
    return result;
  },
);

export async function buildCharacterComponentUsageEntries(
  decompositionData: readonly CharacterDecompositionRow[],
): Promise<readonly CharacterComponentUsageRow[]> {
  const charactersJson = await loadCharactersJson();

  const canonicalizeCharacter = (character: HanziCharacter) => {
    let canonical = character;
    let characterData = charactersJson.get(canonical);

    while (characterData?.canonicalForm != null) {
      canonical = characterData.canonicalForm;
      characterData = charactersJson.get(canonical);
    }

    return canonical;
  };

  const componentUsage = new Map<HanziCharacter, Set<HanziCharacter>>();

  for (const { hanzi, ids } of decompositionData) {
    for (const leaf of walkIdsNodeLeafs(parseIds(ids))) {
      if (!isHanziCharacter(leaf as HanziCharacter)) {
        continue;
      }
      const leafCharacter = leaf as HanziCharacter;
      const canonicalLeaf = canonicalizeCharacter(leafCharacter);

      mapSetAdd(componentUsage, leafCharacter, hanzi);
      mapSetAdd(componentUsage, canonicalLeaf, hanzi);
    }
  }

  return deepReadonly(
    [...componentUsage]
      .map(([component, usedIn]) => ({
        component,
        usedInHanzi: [...usedIn].sort((a, b) => a.localeCompare(b)),
      }))
      .sort((a, b) => a.component.localeCompare(b.component)),
  );
}

export const loadCharacterComponentUsageEntries = memoize0(
  async function loadCharacterComponentUsageEntries() {
    const decompositionData = await loadBuiltinCharacterDecompositionEntries();
    // Avoid TS2589 from deeply expanding recursive IDS node types at this boundary.
    return buildCharacterComponentUsageEntries(decompositionData);
  },
);

export const wordListSchema = z.array(hanziWordSchema);

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
  `iu`,
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

const cedictCompactReferenceRe = /^\S+\s+\S+\s+\[\[.*?\]\]\s+[A-Za-z0-9]{5}$/u;

export const cedictReferenceSchema = z
  .string()
  .regex(cedictCompactReferenceRe, {
    message: `CE-DICT reference must follow this format: traditional simplified [[pinyin]] NANOID`,
  });

export type CedictReference = z.infer<typeof cedictReferenceSchema>;

export const hanziWordMeaningSchema = z
  .object({
    gloss: z.array(z.string()),
    freq: z
      .number()
      .min(0)
      .max(1)
      .describe(
        `normalized meaning frequency where higher means more common usage`,
      )
      .optional(),
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
    cedict: cedictReferenceSchema
      .describe(`reference to the corresponding CE-DICT entry and sense`)
      .optional(),
    /**
     * Character-by-character semantic decomposition of this word.
     *
     * Each entry references the dictionary sense used to explain the
     * corresponding character's meaning within this word.
     */
    charSenses: z.array(hanziWordSchema.nullable()).optional(),
  })
  .strict();

export type HanziWordMeaning = z.infer<typeof hanziWordMeaningSchema>;
export type HanziWordWithMeaning = [HanziWord, HanziWordMeaning];

export const dictionaryJsonSchema = z
  .array(z.tuple([hanziWordSchema, hanziWordMeaningSchema]))
  .transform((x) => new Map(x));

export const loadDictionaryJson = memoize0(async () =>
  dictionaryJsonSchema
    .transform(deepReadonly)
    .parse(await import(`./data/dictionary.asset.json`).then((x) => x.default)),
);

export type DictionaryJson = Awaited<ReturnType<typeof loadDictionaryJson>>;

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
 * The type of the dictionary index returned by {@link loadDictionary}.
 */
export interface Dictionary {
  lookupHanzi(hanzi: HanziText): readonly HanziWordWithMeaning[];
  lookupHanziWord(hanzi: HanziWord): DeepReadonly<HanziWordMeaning> | null;
  lookupGloss(gloss: string): readonly HanziWordWithMeaning[];
  lookupPinyinUnit(pinyinUnit: PinyinUnit): readonly HanziCharacter[];
  isStructuralHanzi(hanzi: HanziCharacter): boolean;
  allEntries: readonly [HanziWord, DeepReadonly<HanziWordMeaning>][];
  allHanziWords: readonly HanziWord[];
  hsk1HanziWords: readonly HanziWord[];
  hsk2HanziWords: readonly HanziWord[];
  hsk3HanziWords: readonly HanziWord[];
  hsk4HanziWords: readonly HanziWord[];
  hsk5HanziWords: readonly HanziWord[];
  hsk6HanziWords: readonly HanziWord[];
  hsk7To9HanziWords: readonly HanziWord[];
}

export function buildDictionary(
  dictionaryJson: DictionaryJson,
  charactersJson: CharactersJson,
): Dictionary {
  const hanziMap = new Map<string, HanziWordWithMeaning[]>();
  const glossMap = new Map<string, HanziWordWithMeaning[]>();
  const hsk1HanziWords: HanziWord[] = [];
  const hsk2HanziWords: HanziWord[] = [];
  const hsk3HanziWords: HanziWord[] = [];
  const hsk4HanziWords: HanziWord[] = [];
  const hsk5HanziWords: HanziWord[] = [];
  const hsk6HanziWords: HanziWord[] = [];
  const hsk7To9HanziWords: HanziWord[] = [];
  const structuralHanzi = new Set<HanziCharacter>();

  for (const [character, data] of charactersJson.entries()) {
    if (data.isStructural) {
      structuralHanzi.add(character);
    }
  }

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

  const getPinyinUnitToHanziMap = memoize0(() => {
    const map = new Map<PinyinUnit, Set<HanziCharacter>>();

    for (const [hanziWord, meaning] of dictionaryJson) {
      if (meaning.pinyin == null) {
        continue;
      }

      const hanzi = hanziFromHanziWord(hanziWord);
      const hanziCharacters = splitHanziText(hanzi);

      for (const pinyin of meaning.pinyin) {
        const pinyinUnits = matchAllPinyinUnits(pinyin).map((p) =>
          normalizePinyinUnit(p),
        );

        invariant(
          hanziCharacters.length === pinyinUnits.length,
          `expected same number of hanzi characters as pinyin units: "%o" / "%o"`,
          hanzi,
          pinyin,
        );

        for (let i = 0; i < pinyinUnits.length; i++) {
          const hanziCharacter = nonNullable(hanziCharacters[i]);
          const pinyinUnit2 = nonNullable(pinyinUnits[i]);

          mapSetAdd(map, pinyinUnit2, hanziCharacter);
        }
      }
    }

    return new Map([...map.entries()].map(([k, v]) => [k, [...v]]));
  });

  return {
    lookupHanzi(hanzi: HanziCharacter) {
      return hanziMap.get(hanzi) ?? emptyArray;
    },
    lookupHanziWord(hanziWord: HanziWord) {
      return dictionaryJson.get(hanziWord) ?? null;
    },
    lookupGloss(gloss: string) {
      return glossMap.get(gloss) ?? emptyArray;
    },
    lookupPinyinUnit(pinyinUnit: PinyinUnit) {
      const pinyinUnitToHanziMap = getPinyinUnitToHanziMap();

      return pinyinUnitToHanziMap.get(pinyinUnit) ?? emptyArray;
    },
    isStructuralHanzi(hanzi: HanziCharacter) {
      return structuralHanzi.has(hanzi);
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
}

/**
 * Build an inverted index of hanzi words to hanzi word meanings and glosses to
 * hanzi word meanings. Useful when building learning graphs.
 */
export const loadDictionary = memoize0(
  async (): Promise<Readonly<Dictionary>> => {
    const [dictionaryJson, charactersJson] = await Promise.all([
      loadDictionaryJson(),
      loadCharactersJson(),
    ]);
    return buildDictionary(dictionaryJson, charactersJson);
  },
);

export const lookupRadicalsByStrokes = async (strokes: number) =>
  loadKangXiRadicalsStrokes().then((x) => x.get(strokes) ?? null);

export const allHanziCharacters = memoize0(async function allHanziCharacters() {
  const charactersJson = await loadCharactersJson();

  return new Set([...charactersJson].map(([char]) => char));
});

export const isHanziWord = memoize1(function isHanziWord(
  hanziOrHanziWord: HanziText | HanziWord,
): hanziOrHanziWord is HanziWord {
  return hanziOrHanziWord.includes(`:`);
});

export const hanziFromHanziWord = memoize1(function hanziFromHanziWord(
  hanziWord: HanziWord,
): HanziText {
  const result = /^(.+?):/u.exec(hanziWord);
  invariant(result != null, `couldn't parse HanziWord ${hanziWord}`);

  const [, hanzi] = result;
  invariant(hanzi != null, `couldn't parse hanzi (before :)`);

  return hanzi as HanziText;
});

export const meaningKeyFromHanziWord = memoize1(
  function meaningKeyFromHanziWord(hanziWord: HanziWord): string {
    const hanzi = hanziFromHanziWord(hanziWord);
    return hanziWord.slice(hanzi.length + 1 /* skip the : */);
  },
);

export function buildHanziWord(hanzi: string, meaningKey: string): HanziWord {
  return `${hanzi}:${meaningKey}`;
}

export function shallowDecomposeHanziCharacter<S extends HanziCharacter>(
  hanzi: HanziCharacter,
  decompositionData: readonly Readonly<
    Pick<CharacterDecompositionRow, `hanzi` | `ids`>
  >[],
  /**
   * Optional predicate to filter out branches of the decomposition. If the
   * predicate returns false for a given leaf, that leaf will not be added to
   * the result, and its children will not be descended into.
   */
  predicate: (value: HanziCharacter) => value is S = (_x): _x is S => true,
): readonly S[] {
  const decompositionsByHanzi = groupByHanzi(decompositionData);

  const result: Set<S> = new Set();

  const character = hanzi;
  if (predicate(character)) {
    const decompositions = decompositionsByHanzi.get(character);
    if (decompositions != null) {
      for (const decomposition of decompositions) {
        for (const idsLeaf of parseIdsLeafs(
          decomposition.ids,
        ) as HanziCharacter[]) {
          if (!predicate(idsLeaf)) {
            // If it fails the predicate, don't add it nor descend into it.
            continue;
          }

          result.add(idsLeaf);
        }
      }
    }
  }

  return [...result];
}

/**
 * Split a HanziWord into its constituent single-character HanziWords,
 * preserving the pinyin for each character. For example, the HanziWord `行业
 * :industry` will be split to include `行:row` (háng) rather than `行:walk`
 * (xíng).
 */
export function shallowDecomposeHanziWord(
  hanziWord: HanziWord,
  dictionary: Dictionary,
): readonly HanziWord[] {
  const hanzi = hanziFromHanziWord(hanziWord);
  if (isHanziCharacter(hanzi)) {
    return [];
  }

  const meaning = dictionary.lookupHanziWord(hanziWord);
  invariant(meaning != null, `missing meaning for hanzi word %s`, hanziWord);
  const pinyin = meaning.pinyin?.[0];
  invariant(pinyin != null, `missing pinyin for hanzi word %s`, hanziWord);

  const result: HanziWord[] = [];

  charLoop: for (const [i, [charHanzi, charPinyinRaw]] of zipStrict(
    splitHanziText(hanzi),
    matchAllPinyinUnits(pinyin),
  ).entries()) {
    const explicit = meaning.charSenses?.[i];
    if (explicit != null) {
      result.push(explicit);
      continue charLoop;
    }

    const charPinyin = normalizePinyinUnit(charPinyinRaw);
    const candidates = dictionary.lookupHanzi(charHanzi);
    for (const candidate of candidates) {
      if (candidate[1].pinyin?.includes(charPinyin)) {
        result.push(candidate[0]);
        continue charLoop;
      }
    }

    throw new Error(
      `couldn't find matching hanzi word for character ${charHanzi} with pinyin ${charPinyin}`,
    );
  }

  return result;
}

/**
 * Recursively decomposes a hanzi character into its IDS leaf components,
 * filtering by the given predicate, and then continues decomposing the leafs
 * recursively. Use @see shallowDecomposeHanziToIdsLeafs if you only want the
 * immediate level of decomposition.
 *
 * Use @see shallowDecomposeHanziWord if you want to preserve pinyin for each
 * character, for example 行业 uses 行 which has pinyin háng and xíng, but the
 * meaning of 行业 is háng yè.
 */
export function deepDecomposeHanzi<S extends HanziCharacter>(
  hanzi: HanziText,
  decompositionData: readonly Readonly<
    Pick<CharacterDecompositionRow, `hanzi` | `ids`>
  >[],
  /**
   * Optional predicate to filter out branches of the decomposition. If the
   * predicate returns false for a given leaf, that leaf will not be added to
   * the result, and its children will not be descended into.
   */
  predicate: (value: HanziCharacter) => value is S = (_x): _x is S => true,
): readonly S[] {
  const decompositionsByHanzi = groupByHanzi(decompositionData);
  const hanziCharacters = splitHanziText(hanzi);

  const result: Set<S> = new Set();

  const queue = [...hanziCharacters];
  while (queue.length > 0) {
    const character = queue.shift();
    if (character == null || !predicate(character)) {
      continue;
    }

    result.add(character);

    if (isHanziStrokeCountChar(character)) {
      // Can't decompose a stroke count character, so skip it.
      continue;
    }

    const decompositions = decompositionsByHanzi.get(character);
    if (decompositions == null) {
      continue;
    }

    for (const decomposition of decompositions) {
      for (const idsLeaf of parseIdsLeafs(
        decomposition.ids,
      ) as HanziCharacter[]) {
        if (!predicate(idsLeaf)) {
          // If it fails the predicate, don't add it nor descend into it.
          continue;
        }

        if (result.has(idsLeaf)) {
          continue;
        }

        queue.push(idsLeaf);
      }
    }
  }

  return [...result];
}

export function deepDecomposeHanziWithStrokeSpecs(
  hanziCharacter: HanziCharacter,
  decompositionData: readonly Readonly<CharacterDecompositionRow>[],
): { hanzi: HanziCharacter; strokeSpec: StrokeSpecString }[] {
  const decompositionsByHanzi = groupByHanzi(decompositionData);

  const items: {
    strokeSpec: StrokeSpecString;
    hanzi: HanziCharacter;
  }[] =
    decompositionsByHanzi
      .get(hanziCharacter)
      ?.flatMap((d) =>
        zipStrict(parseIdsLeafs(d.ids) as HanziIdsLeaf[], d.strokeSpecs),
      )
      .map(([hanzi, strokeSpec]) =>
        isHanziStrokeCountChar(hanzi) ? null : { strokeSpec, hanzi },
      )
      .filter((x) => x != null) ?? [];

  for (const item of items) {
    const { hanzi, strokeSpec } = item;

    const decompositions = decompositionsByHanzi.get(hanzi);
    if (decompositions == null) {
      continue;
    }

    for (const decomposition of decompositions) {
      for (const [idsLeaf, leafStrokeSpec] of zipStrict(
        parseIdsLeafs(decomposition.ids) as HanziIdsLeaf[],
        decomposition.strokeSpecs,
      )) {
        if (isHanziStrokeCountChar(hanzi) || !isHanziCharacter(idsLeaf)) {
          continue;
        }

        const mappedStrokeSpec = mapStrokeSpec(strokeSpec, leafStrokeSpec);
        if (mappedStrokeSpec == null) {
          continue;
        }

        items.push({
          hanzi: idsLeaf,
          strokeSpec: mappedStrokeSpec,
        });
      }
    }
  }

  return (
    items
      // Deduplicate because there could be identical items derived from
      // multiple different decomposition paths.
      .filter(arrayFilterUnique((x) => `${x.hanzi}\0${x.strokeSpec}`))
  );
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
  return oneUnitPinyinListOrNull(meaning?.pinyin);
}

export function oneUnitPinyinListOrNull(
  pinyinList: readonly PinyinText[] | null | undefined,
): PinyinUnit | null {
  const pinyin = pinyinList?.[0];

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
    hanzi: HanziCharacter,
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
  const charactersJson = await loadCharactersJson();

  const structuralHanzi = new Set<HanziCharacter>();

  for (const [character, data] of charactersJson.entries()) {
    if (data.isStructural != null) {
      structuralHanzi.add(character);
    }
  }

  const isStructuralHanzi = (hanzi: HanziCharacter) =>
    structuralHanzi.has(hanzi);

  return isStructuralHanzi;
});

export const getIsComponentFormHanzi = memoize0(async () => {
  const charactersJson = await loadCharactersJson();
  const componentFormHanzi = new Set<HanziCharacter>();

  for (const [character, data] of charactersJson.entries()) {
    if (data.componentFormOf != null) {
      componentFormHanzi.add(character);
    }
  }

  const isComponentFormHanzi = (hanzi: HanziCharacter) =>
    componentFormHanzi.has(hanzi);

  return isComponentFormHanzi;
});
