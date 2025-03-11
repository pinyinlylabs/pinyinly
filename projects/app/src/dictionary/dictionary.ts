import { HanziWord, PartOfSpeech, PinyinInitialGroupId } from "@/data/model";
import { rMnemonicThemeId, rPinyinInitialGroupId } from "@/data/rizzleSchema";
import { deepReadonly, sortComparatorNumber } from "@/util/collections";
import { invariant } from "@haohaohow/lib/invariant";
import memoize from "lodash/memoize";
import { DeepReadonly, StrictExtract } from "ts-essentials";
import { z } from "zod";

/**
 * `[label, match1, match2, ...]`
 */
export type PinyinProduction = readonly string[];

export interface PinyinChart {
  initials: DeepReadonly<
    { id: PinyinInitialGroupId; desc: string; initials: string[][] }[]
  >;
  finals: readonly PinyinProduction[];
  overrides?: DeepReadonly<Record<string, [initial: string, final: string]>>;
}

function expandCombinations(
  rules: readonly PinyinProduction[],
): [string, string][] {
  return rules.flatMap(([label, ...xs]): [string, string][] =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    xs.map((x) => [label!, x] as const),
  );
}

/**
 * Given a toneless pinyin (i.e. `hao` not `hǎo`) split into an initial and
 * final using a given chart.
 */
export function splitTonelessPinyin(
  pinyin: string,
  chart: PinyinChart,
): readonly [initial: string, final: string] | null {
  const initialsList = expandCombinations(
    chart.initials.flatMap((x) => x.initials),
  )
    // There's some overlap with initials and finals, the algorithm should use
    // the longest possible initial.
    .sort(sortComparatorNumber(([, x]) => x.length))
    .reverse();

  const finalsList = expandCombinations(chart.finals)
    // There's some overlap with initials and finals, the algorithm should use
    // the longest possible initial.
    .sort(sortComparatorNumber((x) => x.length))
    .reverse();

  const override = chart.overrides?.[pinyin];
  if (override) {
    return override;
  }

  for (const [initialLabel, initial] of initialsList) {
    if (pinyin.startsWith(initial)) {
      const final = pinyin.slice(initial.length);
      for (const [finalLabel, finalCandiate] of finalsList) {
        if (final === finalCandiate) {
          return [initialLabel, finalLabel];
        }
      }
    }
  }

  return null;
}

export function parsePinyinTone(
  pinyin: string,
): [tonelessPinyin: string, tone: number] | null {
  for (const [key, value] of Object.entries(toneMap)) {
    for (let tone = 1; tone <= 4; tone++) {
      const char = value[tone];
      invariant(char != null);

      const index = pinyin.indexOf(char);
      if (index !== -1) {
        const withoutTone = pinyin.replace(char, key);
        return [withoutTone, tone];
      }
    }
  }

  return [pinyin, 5];
}

export function splitPinyin(
  pinyin: string,
  chart: PinyinChart,
): { initial: string; final: string; tone: number } | null {
  const toneResult = parsePinyinTone(pinyin);
  invariant(toneResult != null, `Could not parse tone for pinyin ${pinyin}`);
  const [tonelessPinyin, tone] = toneResult;

  const initialFinalResult = splitTonelessPinyin(tonelessPinyin, chart);
  invariant(
    initialFinalResult != null,
    `Could not split pinyin ${tonelessPinyin}`,
  );

  const [initial, final] = initialFinalResult;

  return { initial, final, tone };
}

export const loadPinyinWords = memoize(async () =>
  z
    .array(z.string())
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./pinyinWords.asset.json`)).default),
);

export const loadMissingFontGlyphs = memoize(async () =>
  z
    .record(z.array(z.string()))
    .transform(
      (x) => new Map(Object.entries(x).map(([k, v]) => [k, new Set(v)])),
    )
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./missingFontGlyphs.asset.json`)).default),
);

export const loadMnemonicThemes = memoize(async () =>
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
            ([k, v]) => [rMnemonicThemeId.unmarshal(k), v] as const,
          ),
        ),
    )
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./mnemonicThemes.asset.json`)).default),
);

export const loadMnemonicThemeChoices = memoize(async () =>
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
            rMnemonicThemeId.unmarshal(k),
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

export const loadHanziDecomposition = memoize(async () =>
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
        id: rPinyinInitialGroupId.getUnmarshal(),
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

export const loadStandardPinyinChart = memoize(async () =>
  pinyinChartSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./standardPinyinChart.asset.json`)).default),
);

export const loadMmPinyinChart = memoize(async () =>
  pinyinChartSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./mmPinyinChart.asset.json`)).default),
);

export const loadHhPinyinChart = memoize(async () =>
  pinyinChartSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hhPinyinChart.asset.json`)).default),
);

export const loadHmmPinyinChart = memoize(async () =>
  pinyinChartSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hmmPinyinChart.asset.json`)).default),
);

export const loadHanziWordGlossMnemonics = memoize(async () =>
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

export const hanziWordSchema = z.string().transform((x) => x as HanziWord);

export const wordListSchema = z.array(hanziWordSchema);

export const allRadicalHanziWords = memoize(async () =>
  wordListSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./radicalsHanziWords.asset.json`)).default),
);

export const allHsk1HanziWords = memoize(async () =>
  wordListSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hsk1HanziWords.asset.json`)).default),
);

export const allHsk2HanziWords = memoize(async () =>
  wordListSchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./hsk2HanziWords.asset.json`)).default),
);

export const allHsk3HanziWords = memoize(async () =>
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
  pinyin: z
    .array(z.string({ description: `space separated pinyin for each word` }), {
      description: `all valid pinyin variations for this meaning (might be omitted for radicals without pronunciation)`,
    })
    .optional(),
  example: z
    .string({
      description: `a Chinese sentence that includes this hanzi`,
    })
    .optional(),
  partOfSpeech: partOfSpeechSchema,
  visualVariants: z
    .array(
      z.string({
        description: `Hanzi with the same meaning but visually different.`,
      }),
      {
        description: `Only included in rare cases (e.g. radicals with multiple visual forms). `,
      },
    )
    .optional(),
  definition: z.string(),
});

export type HanziWordMeaning = z.infer<typeof hanziWordMeaningSchema>;

export const hanziWordsSchema = z
  .array(
    z.tuple([
      z.string(), // hanzi
      z.array(
        z.tuple([
          z.string(), // meaning key
          hanziWordMeaningSchema,
        ]),
      ),
    ]),
  )
  .transform((x) => new Map(x.map(([k, v]) => [k, new Map(v)])));

export const dictionarySchema = z
  .array(
    z.tuple([
      z.string().transform((x) => x as HanziWord),
      hanziWordMeaningSchema,
    ]),
  )
  .transform((x) => new Map(x));

export const loadDictionary = memoize(async () =>
  dictionarySchema
    .transform(deepReadonly)
    // eslint-disable-next-line unicorn/no-await-expression-member
    .parse((await import(`./dictionary.asset.json`)).default),
);

const loadRadicalStrokes = memoize(async () =>
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

export const loadHanziWordPinyinMnemonics = memoize(async () =>
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

export const lookupHanzi = async (
  hanzi: string,
): Promise<DeepReadonly<[HanziWord, HanziWordMeaning][]>> =>
  [...(await loadDictionary())].filter(
    ([hanziWord, meaning]) =>
      hanziFromHanziWord(hanziWord) === hanzi ||
      meaning.visualVariants?.includes(hanzi) === true,
  );

export const lookupHanziWord = async (
  hanziWord: HanziWord,
): Promise<DeepReadonly<HanziWordMeaning> | null> =>
  await loadDictionary().then((x) => x.get(hanziWord) ?? null);

export const lookupRadicalsByStrokes = async (strokes: number) =>
  await loadRadicalStrokes().then((x) => x.get(strokes) ?? null);

export const allHanziWordsHanzi = async () =>
  new Set(
    [
      ...(await allRadicalHanziWords()),
      ...(await allHsk1HanziWords()),
      ...(await allHsk2HanziWords()),
      ...(await allHsk3HanziWords()),
    ].map((x) => hanziFromHanziWord(x)),
  );

export const allHanziCharacters = async () =>
  new Set(
    [...(await allHanziWordsHanzi())]
      // Split words into characters because decomposition is per-character.
      .flatMap((x) => splitCharacters(x)),
  );

export const radicalStrokes = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
];

/**
 * Converts a single pinyin word written with a tone number suffix to use a tone
 * mark instead (also converts v to ü).
 */
export function convertPinyinWithToneNumberToToneMark(pinyin: string): string {
  if (pinyin.length === 0) {
    return pinyin;
  }

  // An algorithm to find the correct vowel letter (when there is more than one) is as follows:
  //
  // 1. If there is an a or an e, it will take the tone mark
  // 2. If there is an ou, then the o takes the tone mark
  // 3. Otherwise, the second vowel takes the tone mark

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  let tone = `012345`.indexOf(pinyin.at(-1)!);

  const pinyinLengthWithoutTone = tone > 0 ? pinyin.length - 1 : pinyin.length;

  let result = ``;
  for (let i = 0; i < pinyinLengthWithoutTone; i++) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const char = pinyin[i]!;

    if (tone > 0) {
      const nextChar = pinyin[i + 1];

      if (char === `a` || char === `e`) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result += toneMap[char][tone]!;
        tone = -1;
        continue;
      } else if (char === `o` && nextChar === `u`) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        result += toneMap[char][tone]!;
        tone = -1;
        continue;
      } else if (isPinyinVowel(char)) {
        if (isPinyinVowel(nextChar)) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          result += toneMap[char][5]! + toneMap[nextChar][tone]!;
          i++;
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          result += toneMap[char][tone]!;
        }
        tone = -1;
        continue;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    result += isPinyinVowel(char) ? toneMap[char][5]! : char;
  }
  return result;
}

const toneMap = {
  a: `_āáǎàa`,
  e: `_ēéěèe`,
  i: `_īíǐìi`,
  o: `_ōóǒòo`,
  u: `_ūúǔùu`,
  // The order of `ü` and `v` is significant.
  ü: `_ǖǘǚǜü`,
  v: `_ǖǘǚǜü`,
} as const;

const isPinyinVowel = (
  char: string | null | undefined,
): char is `a` | `e` | `i` | `o` | `u` | `ü` => char != null && char in toneMap;

export type IdsNode =
  | {
      type: IdsOperator.LeftToRight;
      left: IdsNode;
      right: IdsNode;
    }
  | {
      type: IdsOperator.AboveToBelow;
      above: IdsNode;
      below: IdsNode;
    }
  | {
      type: IdsOperator.LeftToMiddleToRight;
      left: IdsNode;
      middle: IdsNode;
      right: IdsNode;
    }
  | {
      type: IdsOperator.AboveToMiddleAndBelow;
      above: IdsNode;
      middle: IdsNode;
      below: IdsNode;
    }
  | {
      type: IdsOperator.FullSurround;
      surrounding: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.SurroundFromAbove;
      above: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.SurroundFromBelow;
      below: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.SurroundFromLeft;
      left: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.SurroundFromRight;
      right: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.SurroundFromUpperLeft;
      upperLeft: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.SurroundFromUpperRight;
      upperRight: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.SurroundFromLowerLeft;
      lowerLeft: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.SurroundFromLowerRight;
      lowerRight: IdsNode;
      surrounded: IdsNode;
    }
  | {
      type: IdsOperator.Overlaid;
      overlay: IdsNode;
      underlay: IdsNode;
    }
  | {
      type: IdsOperator.HorizontalReflection;
      reflected: IdsNode;
    }
  | {
      type: IdsOperator.Rotation;
      rotated: IdsNode;
    }
  | {
      type: `LeafCharacter`;
      character: string;
    }
  | {
      type: `LeafUnknownCharacter`;
      strokeCount: number;
    };

export enum IdsOperator {
  LeftToRight = `⿰`,
  AboveToBelow = `⿱`,
  LeftToMiddleToRight = `⿲`,
  AboveToMiddleAndBelow = `⿳`,
  FullSurround = `⿴`,
  SurroundFromAbove = `⿵`,
  SurroundFromBelow = `⿶`,
  SurroundFromLeft = `⿷`,
  SurroundFromRight = `⿼`,
  SurroundFromUpperLeft = `⿸`,
  SurroundFromUpperRight = `⿹`,
  SurroundFromLowerLeft = `⿺`,
  SurroundFromLowerRight = `⿽`,
  Overlaid = `⿻`,
  HorizontalReflection = `⿾`,
  Rotation = `⿿`,
}

const idsOperatorSchema = z.nativeEnum(IdsOperator);

export function parseIds(
  ids: string,
  cursor: { index: number } = { index: 0 },
): IdsNode {
  const charCodePoint = ids.codePointAt(cursor.index);
  invariant(charCodePoint != null);
  const char = String.fromCodePoint(charCodePoint);
  cursor.index += char.length;

  if (charCodePoint >= /* ⿰ */ 12_272 && charCodePoint <= /* ⿿ */ 12_287) {
    const operator = idsOperatorSchema.parse(char);
    switch (operator) {
      case IdsOperator.LeftToRight: {
        const left = parseIds(ids, cursor);
        const right = parseIds(ids, cursor);
        return { type: IdsOperator.LeftToRight, left, right };
      }
      case IdsOperator.AboveToBelow: {
        const above = parseIds(ids, cursor);
        const below = parseIds(ids, cursor);
        return { type: IdsOperator.AboveToBelow, above, below };
      }
      case IdsOperator.LeftToMiddleToRight: {
        const left = parseIds(ids, cursor);
        const middle = parseIds(ids, cursor);
        const right = parseIds(ids, cursor);
        return { type: IdsOperator.LeftToMiddleToRight, left, middle, right };
      }
      case IdsOperator.AboveToMiddleAndBelow: {
        const above = parseIds(ids, cursor);
        const middle = parseIds(ids, cursor);
        const below = parseIds(ids, cursor);
        return {
          type: IdsOperator.AboveToMiddleAndBelow,
          above,
          middle,
          below,
        };
      }
      case IdsOperator.FullSurround: {
        const surrounding = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.FullSurround, surrounding, surrounded };
      }
      case IdsOperator.SurroundFromAbove: {
        const above = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.SurroundFromAbove, above, surrounded };
      }
      case IdsOperator.SurroundFromBelow: {
        const below = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.SurroundFromBelow, below, surrounded };
      }
      case IdsOperator.SurroundFromLeft: {
        const left = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.SurroundFromLeft, left, surrounded };
      }
      case IdsOperator.SurroundFromRight: {
        const right = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return { type: IdsOperator.SurroundFromRight, right, surrounded };
      }
      case IdsOperator.SurroundFromUpperLeft: {
        const upperLeft = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          type: IdsOperator.SurroundFromUpperLeft,
          upperLeft,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromUpperRight: {
        const upperRight = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          type: IdsOperator.SurroundFromUpperRight,
          upperRight,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromLowerLeft: {
        const lowerLeft = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          type: IdsOperator.SurroundFromLowerLeft,
          lowerLeft,
          surrounded,
        };
      }
      case IdsOperator.SurroundFromLowerRight: {
        const lowerRight = parseIds(ids, cursor);
        const surrounded = parseIds(ids, cursor);
        return {
          type: IdsOperator.SurroundFromLowerRight,
          lowerRight,
          surrounded,
        };
      }
      case IdsOperator.Overlaid: {
        const overlay = parseIds(ids, cursor);
        const underlay = parseIds(ids, cursor);
        return { type: IdsOperator.Overlaid, overlay, underlay };
      }
      case IdsOperator.HorizontalReflection: {
        const reflected = parseIds(ids, cursor);
        return { type: IdsOperator.HorizontalReflection, reflected };
      }
      case IdsOperator.Rotation: {
        const rotated = parseIds(ids, cursor);
        return { type: IdsOperator.Rotation, rotated };
      }
      default: {
        throw new Error(`unexpected combining character ${char}`);
      }
    }
  }

  const strokeCount = strokeCountPlaceholderOrNull(charCodePoint);
  if (strokeCount != null) {
    return { type: `LeafUnknownCharacter`, strokeCount };
  }

  return { type: `LeafCharacter`, character: char };
}

export function strokeCountPlaceholderOrNull(
  charOrCharPoint: string | number,
): number | undefined {
  const charCodePoint =
    typeof charOrCharPoint === `string`
      ? charOrCharPoint.codePointAt(0)
      : charOrCharPoint;
  invariant(charCodePoint != null);
  if (charCodePoint >= /* ① */ 9312 && charCodePoint <= /* ⑳ */ 9331) {
    return charCodePoint - 9311;
  }
}

export function strokeCountToCharacter(strokeCount: number): string {
  return String.fromCodePoint(strokeCount + 9311);
}

export function* walkIdsNode(
  ids: IdsNode,
): Generator<
  StrictExtract<
    IdsNode,
    { type: `LeafCharacter` } | { type: `LeafUnknownCharacter` }
  >
> {
  switch (ids.type) {
    case IdsOperator.LeftToRight: {
      yield* walkIdsNode(ids.left);
      yield* walkIdsNode(ids.right);
      return;
    }
    case IdsOperator.AboveToBelow: {
      yield* walkIdsNode(ids.above);
      yield* walkIdsNode(ids.below);
      return;
    }
    case IdsOperator.LeftToMiddleToRight: {
      yield* walkIdsNode(ids.left);
      yield* walkIdsNode(ids.middle);
      yield* walkIdsNode(ids.right);
      return;
    }
    case IdsOperator.AboveToMiddleAndBelow: {
      yield* walkIdsNode(ids.above);
      yield* walkIdsNode(ids.middle);
      yield* walkIdsNode(ids.below);
      return;
    }
    case IdsOperator.FullSurround: {
      yield* walkIdsNode(ids.surrounding);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromAbove: {
      yield* walkIdsNode(ids.above);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromBelow: {
      yield* walkIdsNode(ids.below);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLeft: {
      yield* walkIdsNode(ids.left);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromRight: {
      yield* walkIdsNode(ids.right);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromUpperLeft: {
      yield* walkIdsNode(ids.upperLeft);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromUpperRight: {
      yield* walkIdsNode(ids.upperRight);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLowerLeft: {
      yield* walkIdsNode(ids.lowerLeft);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.SurroundFromLowerRight: {
      yield* walkIdsNode(ids.lowerRight);
      yield* walkIdsNode(ids.surrounded);
      return;
    }
    case IdsOperator.Overlaid: {
      yield* walkIdsNode(ids.underlay);
      yield* walkIdsNode(ids.overlay);
      return;
    }
    case IdsOperator.HorizontalReflection: {
      yield* walkIdsNode(ids.reflected);
      return;
    }
    case IdsOperator.Rotation: {
      yield* walkIdsNode(ids.rotated);
      return;
    }
    case `LeafCharacter`:
    case `LeafUnknownCharacter`: {
      yield ids;
      return;
    }
    default: {
      throw new Error(`unexpected ids node type: ${(ids as IdsNode).type}`);
    }
  }
}

export function unicodeShortIdentifier(character: string): string {
  const codePoint = character.codePointAt(0);
  invariant(
    codePoint != null,
    `could not get code point for: ${JSON.stringify(character)}`,
  );
  return `U+${codePoint.toString(16).toUpperCase()}`;
}
/**
 * Remove unnecessary nesting in an IDS tree.
 *
 * For example `⿰x⿰yz` can be flattened to `⿲xyz`.
 */
export function flattenIds(ids: IdsNode): IdsNode {
  if (ids.type === IdsOperator.AboveToBelow) {
    if (ids.above.type === IdsOperator.AboveToBelow) {
      return {
        type: IdsOperator.AboveToMiddleAndBelow,
        above: flattenIds(ids.above.above),
        middle: flattenIds(ids.above.below),
        below: flattenIds(ids.below),
      };
    } else if (ids.below.type === IdsOperator.AboveToBelow) {
      return {
        type: IdsOperator.AboveToMiddleAndBelow,
        above: flattenIds(ids.above),
        middle: flattenIds(ids.below.above),
        below: flattenIds(ids.below.below),
      };
    }
  } else if (ids.type === IdsOperator.LeftToRight) {
    if (ids.left.type === IdsOperator.LeftToRight) {
      return {
        type: IdsOperator.LeftToMiddleToRight,
        left: flattenIds(ids.left.left),
        middle: flattenIds(ids.left.right),
        right: flattenIds(ids.right),
      };
    } else if (ids.right.type === IdsOperator.LeftToRight) {
      return {
        type: IdsOperator.LeftToMiddleToRight,
        left: flattenIds(ids.left),
        middle: flattenIds(ids.right.left),
        right: flattenIds(ids.right.right),
      };
    }
  }
  return ids;
}

export function idsNodeToString(ids: IdsNode): string {
  switch (ids.type) {
    case IdsOperator.LeftToRight: {
      return `${ids.type}${idsNodeToString(ids.left)}${idsNodeToString(ids.right)}`;
    }
    case IdsOperator.AboveToBelow: {
      return `${ids.type}${idsNodeToString(ids.above)}${idsNodeToString(ids.below)}`;
    }
    case IdsOperator.LeftToMiddleToRight: {
      return `${ids.type}${idsNodeToString(ids.left)}${idsNodeToString(
        ids.middle,
      )}${idsNodeToString(ids.right)}`;
    }
    case IdsOperator.AboveToMiddleAndBelow: {
      return `${ids.type}${idsNodeToString(ids.above)}${idsNodeToString(
        ids.middle,
      )}${idsNodeToString(ids.below)}`;
    }
    case IdsOperator.FullSurround: {
      return `${ids.type}${idsNodeToString(ids.surrounding)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromAbove: {
      return `${ids.type}${idsNodeToString(ids.above)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromBelow: {
      return `${ids.type}${idsNodeToString(ids.below)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromLeft: {
      return `${ids.type}${idsNodeToString(ids.left)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromRight: {
      return `${ids.type}${idsNodeToString(ids.right)}${idsNodeToString(ids.surrounded)}`;
    }
    case IdsOperator.SurroundFromUpperLeft: {
      return `${ids.type}${idsNodeToString(ids.upperLeft)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromUpperRight: {
      return `${ids.type}${idsNodeToString(ids.upperRight)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromLowerLeft: {
      return `${ids.type}${idsNodeToString(ids.lowerLeft)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.SurroundFromLowerRight: {
      return `${ids.type}${idsNodeToString(ids.lowerRight)}${idsNodeToString(
        ids.surrounded,
      )}`;
    }
    case IdsOperator.Overlaid: {
      return `${ids.type}${idsNodeToString(ids.overlay)}${idsNodeToString(ids.underlay)}`;
    }
    case IdsOperator.HorizontalReflection: {
      return `${ids.type}${idsNodeToString(ids.reflected)}`;
    }
    case IdsOperator.Rotation: {
      return `${ids.type}${idsNodeToString(ids.rotated)}`;
    }
    case `LeafCharacter`: {
      return ids.character;
    }
    case `LeafUnknownCharacter`: {
      return strokeCountToCharacter(ids.strokeCount);
    }
  }
}

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

export function hanziFromHanziWord(hanziWord: HanziWord): string {
  const result = /^(.+?):/.exec(hanziWord);
  invariant(result != null, `couldn't parse HanziWord ${hanziWord}`);

  const [, hanzi] = result;
  invariant(hanzi != null, `couldn't parse hanzi (before :)`);

  return hanzi;
}

export function meaningKeyFromHanziWord(hanziWord: HanziWord): string {
  const hanzi = hanziFromHanziWord(hanziWord);
  return hanziWord.slice(hanzi.length + 1 /* skip the : */);
}

export function buildHanziWord(hanzi: string, meaningKey: string): HanziWord {
  return `${hanzi}:${meaningKey}`;
}

export async function hanziToLearnForHanzi(hanzi: string[]): Promise<string[]> {
  const decompositions = await loadHanziDecomposition();

  // For multi-character hanzi, learn each character, but for for
  // single-character hanzi, decompose it into radicals and learn those.
  const hanziToLearn = [];
  if (hanzi.length > 1) {
    for (const char of hanzi) {
      hanziToLearn.push(char);
    }
  } else {
    for (const char of hanzi) {
      const ids = decompositions.get(char);
      if (ids != null) {
        const idsNode = parseIds(ids);
        for (const leaf of walkIdsNode(idsNode)) {
          if (
            leaf.type === `LeafCharacter` &&
            leaf.character !== char // todo turn into invariant?
          ) {
            hanziToLearn.push(leaf.character);
          }
        }
      }
    }
  }

  return hanziToLearn;
}

export async function hanziToLearnForHanziWord(hanziWord: HanziWord) {
  return await hanziToLearnForHanzi(
    splitCharacters(hanziFromHanziWord(hanziWord)),
  );
}

export function splitCharacters(text: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-misused-spread
  return [...text];
}
