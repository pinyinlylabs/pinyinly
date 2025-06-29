import type { PinyinPronunciation, PinyinSyllable } from "@/data/model";
import { PinyinInitialGroupId } from "@/data/model";
import {
  deepReadonly,
  memoize0,
  memoize1,
  sortComparatorNumber,
  weakMemoize1,
} from "@/util/collections";
import { invariant } from "@pinyinly/lib/invariant";
import type { DeepReadonly } from "ts-essentials";
import z from "zod/v4";
import { rPinyinInitialGroupId } from "./rizzleSchema";

/**
 * `[label, match1, match2, ...]`
 */
export type PinyinChartProduction = readonly string[];

export interface PinyinChart {
  initials: DeepReadonly<
    {
      id: PinyinInitialGroupId;
      desc: string;
      initials: PinyinChartProduction[];
    }[]
  >;
  finals: readonly PinyinChartProduction[];
  overrides?: DeepReadonly<
    Record<
      string,
      [
        [initialChartLabel: string, initial: string],
        [finalChartLabel: string, final: string],
      ]
    >
  >;
}

/**
 * Converts a single pinyin word written with a tone number suffix to use a tone
 * mark instead (also converts v to ü).
 */
export const convertPinyinWithToneNumberToToneMark = memoize1(
  function convertPinyinWithToneNumberToToneMark(
    pinyin: string,
  ): PinyinSyllable {
    invariant(pinyin.length > 0, `pinyin must not be empty`);

    // An algorithm to find the correct vowel letter (when there is more than one) is as follows:
    //
    // 1. If there is an a or an e, it will take the tone mark
    // 2. If there is an ou, then the o takes the tone mark
    // 3. Otherwise, the second vowel takes the tone mark

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    let tone = `012345`.indexOf(pinyin.at(-1)!);

    const pinyinLengthWithoutTone =
      tone >= 0 ? pinyin.length - 1 : pinyin.length;

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
    return result as PinyinSyllable;
  },
);

const toneMap = {
  a: `_āáǎàa`,
  e: `_ēéěèe`,
  i: `_īíǐìi`,
  o: `_ōóǒòo`,
  u: `_ūúǔùu`,
  // The order of `ü` and `v` is significant.
  ü: `_ǖǘǚǜü`,
  v: `_ǖǘǚǜü`,
  // fake pinyin, but used for distractors
  ï: `_ïḯîìi`,
} as const;

const isPinyinVowel = (
  char: string | null | undefined,
): char is `a` | `e` | `i` | `ï` | `o` | `u` | `ü` =>
  char != null && char in toneMap;

export const parsePinyinSyllableTone = memoize1(function parsePinyinTone(
  pinyin: string,
): { tonelessPinyin: PinyinSyllable; tone: number } | null {
  for (const [key, value] of Object.entries(toneMap)) {
    for (let tone = 1; tone <= 4; tone++) {
      const char = value[tone];
      invariant(char != null);

      const index = pinyin.indexOf(char);
      if (index !== -1) {
        const tonelessPinyin = pinyin.replace(char, key) as PinyinSyllable;
        return { tonelessPinyin, tone };
      }
    }
  }

  return { tonelessPinyin: pinyin as PinyinSyllable, tone: 5 };
});

function expandCombinations(
  rules: readonly PinyinChartProduction[],
): [string, string][] {
  return rules.flatMap(([label, ...xs]): [string, string][] =>
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    xs.map((x) => [label!, x] as const),
  );
}

const expandChart = weakMemoize1(function expandChart(
  chart: PinyinChart,
): DeepReadonly<{
  initialsList: [initialChartLabel: string, initial: string][];
  finalsList: [finalChartLabel: string, final: string][];
}> {
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

  return { initialsList, finalsList };
});

/**
 * Given a toneless pinyin (i.e. `hao` rather than `hǎo`) split into an initial
 * and final using a given chart.
 */
export function splitTonelessPinyinSyllable(
  pinyin: string,
  chart: PinyinChart,
): {
  initial: string;
  final: string;
  initialChartLabel: string;
  finalChartLabel: string;
} | null {
  const { initialsList, finalsList } = expandChart(chart);

  const override = chart.overrides?.[pinyin];
  if (override) {
    const [[initialChartLabel, initial], [finalChartLabel, final]] = override;
    return { initialChartLabel, initial, finalChartLabel, final };
  }

  for (const [initialChartLabel, initial] of initialsList) {
    if (pinyin.startsWith(initial)) {
      const final = pinyin.slice(initial.length);
      for (const [finalChartLabel, finalCandidate] of finalsList) {
        if (final === finalCandidate) {
          return { initial, initialChartLabel, final, finalChartLabel };
        }
      }
    }
  }

  return null;
}

export function parsePinyinSyllableWithChart(
  pinyinSyllable: string,
  chart: PinyinChart,
): {
  initialChartLabel: string;
  initial: string;
  finalChartLabel: string;
  final: string;
  tone: number;
  tonelessSyllable: PinyinSyllable;
} | null {
  if (pinyinSyllable === ``) {
    return null;
  }

  const toneResult = parsePinyinSyllableTone(pinyinSyllable);
  if (toneResult == null) {
    return null;
  }
  const { tonelessPinyin, tone } = toneResult;

  const initialFinalResult = splitTonelessPinyinSyllable(tonelessPinyin, chart);
  if (initialFinalResult == null) {
    return null;
  }

  const { initialChartLabel, initial, finalChartLabel, final } =
    initialFinalResult;

  return {
    initialChartLabel,
    initial,
    final,
    finalChartLabel,
    tone,
    tonelessSyllable: `${initial}${final}` as PinyinSyllable,
  };
}

export interface PinyinSyllableSuggestion {
  pinyinSyllable: PinyinSyllable;
  tone: number;
}

export interface PinyinSyllableSuggestions {
  from: number;
  to: number;
  syllables: PinyinSyllableSuggestion[];
}

/**
 * Search for pinyin syllables using ASCII.
 * @param query
 * @returns
 */
export function pinyinSyllableSuggestions(
  query: string,
): DeepReadonly<PinyinSyllableSuggestions> | null {
  const lastSyllable = matchAllPinyinSyllablesWithIndexes(query).slice(-2);
  if (lastSyllable.length !== 2) {
    return null;
  }
  const [lastSyllableIndex, lastSyllableText] = lastSyllable as [
    number,
    string,
  ];
  const from = lastSyllableIndex;
  const to = lastSyllableIndex + lastSyllableText.length;
  if (to !== query.length) {
    // The last syllable is not at the end of the string, so we can't search for it.
    return null;
  }
  const syllableWithoutNumber = lastSyllableText.at(-1)?.match(/\d/)
    ? lastSyllableText.slice(0, -1)
    : lastSyllableText;
  const parsed = parsePinyinSyllable(
    syllableWithoutNumber.replaceAll(`v`, `ü`),
  );
  if (parsed == null) {
    return null;
  }

  const suggestions = toneVariationsForTonelessSyllable(
    parsed.tonelessSyllable,
  );
  return { from, to, syllables: suggestions };
}

const toneVariationsForTonelessSyllable = memoize1(
  (
    tonelessSyllable: PinyinSyllable,
  ): DeepReadonly<PinyinSyllableSuggestion[]> => {
    const result: PinyinSyllableSuggestion[] = [];
    for (let i = 1; i <= 5; i++) {
      result.push({
        pinyinSyllable: convertPinyinWithToneNumberToToneMark(
          `${tonelessSyllable}${i}`,
        ),
        tone: i,
      });
    }
    return result;
  },
);

export const parsePinyinSyllable = memoize1(function parsePinyinSyllable(
  pinyinSyllable: string,
) {
  const chart = loadHhhPinyinChart();

  return deepReadonly(parsePinyinSyllableWithChart(pinyinSyllable, chart));
});

export function parsePinyinSyllableOrThrow(pinyinSyllable: string) {
  const parsed = parsePinyinSyllable(pinyinSyllable);
  invariant(parsed != null, `Could not parse pinyin ${pinyinSyllable}`);
  return parsed;
}

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
    overrides: z.record(
      z.string(),
      z.tuple([
        z.tuple([
          z.string().describe(`initial chart label`),
          z.string().describe(`initial`),
        ]),
        z.tuple([
          z.string().describe(`final chart label`),
          z.string().describe(`final`),
        ]),
      ]),
    ),
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

export function pinyinPronunciationDisplayText(
  value: Readonly<PinyinPronunciation>,
): string {
  // When learning pinyin (i.e. single words) the syllables are space separated.
  // But when learning a sentence then the words become space separated and the
  // syllables are joined without spaces.
  return value.join(` `);
}

export const pinyinSyllablePattern = (() => {
  const a = `(?:a|ā|à|á|ǎ)`;
  const e = `(?:e|ē|é|ě|è)`;
  const i = `(?:i|ī|í|ǐ|ì)`;
  const o = `(?:o|ō|ó|ǒ|ò)`;
  const u = `(?:u|ū|ú|ǔ|ù)`;
  const v = `(?:ü|ǖ|ǘ|ǚ|ǜ|v|u:)`;

  const consonantEnd = `(?!${a}${e}${i}${o}${u}${v})`;

  return (
    `(?:` +
    `(?:(?:[zcs]h|[gkh])u${a}ng${consonantEnd})|` +
    `(?:[jqx]i${o}ng${consonantEnd})|` +
    `(?:[nljqx]i${a}ng${consonantEnd})|` +
    `(?:(?:[zcs]h?|[dtnlgkhrjqxy])u${a}n${consonantEnd})|` +
    `(?:(?:[zcs]h|[gkh])u${a}i)|` +
    `(?:(?:[zc]h?|[rdtnlgkhsy])${o}ng${consonantEnd})|` +
    `(?:(?:[zcs]h?|[rbpmfdtnlgkhw])?${e}ng${consonantEnd})|` +
    `(?:(?:[zcs]h?|[rbpmfdtnlgkhwy])?${a}ng${consonantEnd})|` +
    `(?:[bpmdtnljqxy]${i}ng${consonantEnd})|` +
    `(?:[bpmdtnljqx]i${a}n${consonantEnd})|` +
    `(?:[bpmdtnljqx]i${a}o)|` +
    `(?:[nl](?:v|u:|ü)${e})|` +
    `(?:[nl](?:${v}))|` +
    `(?:[jqxy]u${e})|` +
    `(?:[bpmnljqxy]${i}n${consonantEnd})|` +
    `(?:[mdnljqx]i${u})|` +
    `(?:[bpmdtnljqx]i${e})|` +
    `(?:[dljqx]i${a})|` +
    `(?:(?:[zcs]h?|[rdtnlgkhxqjy])${u}n${consonantEnd})|` +
    `(?:(?:[zcs]h?|[rdtgkh])u${i})|` +
    `(?:(?:[zcs]h?|[rdtnlgkh])u${o})|` +
    `(?:(?:[zcs]h|[rgkh])u${a})|` +
    `(?:(?:[zcs]h?|[rbpmfdngkhw])?${e}n${consonantEnd})|` +
    `(?:(?:[zcs]h?|[rbpmfdtnlgkhwy])?${a}n${consonantEnd})|` +
    `(?:(?:[zcs]h?|[rpmfdtnlgkhy])?${o}u)|` +
    `(?:(?:[zcs]h?|[rbpmdtnlgkhy])?${a}o)|` +
    `(?:(?:[zs]h|[bpmfdtnlgkhwz])?${e}i)|` +
    `(?:(?:[zcs]h?|[bpmdtnlgkhw])?${a}i)|` +
    `(?:(?:[zcs]h?|[rjqxybpmdtnl])${i})|` +
    `(?:(?:[zcs]h?|[rwbpmfdtnlgkhjqxwy])${u})|` +
    `(?:${e}(?:r${consonantEnd})?)|` +
    `(?:(?:[zcs]h?|[rmdtnlgkhy])${e})|` +
    `(?:[bpmfwyl]?${o})|` +
    `(?:(?:[zcs]h|[bpmfdtnlgkhzcswy])?${a})|` +
    `(?:r${consonantEnd})` +
    `)` +
    `[0-5]?`
  );
})();

const matchAllPinyinRegExp = new RegExp(pinyinSyllablePattern, `g`);

/**
 * Find all pinyin syllables in a string.
 *
 * @returns An array of alternating index and matched syllable pairs.
 */
export function matchAllPinyinSyllables(input: string): string[] {
  const tokens = [];
  for (const { 0: text } of input.matchAll(matchAllPinyinRegExp)) {
    tokens.push(text);
  }
  return tokens;
}

/**
 * Find all pinyin syllables in a string.
 *
 * @returns An array of alternating index and matched syllable pairs.
 */
export function matchAllPinyinSyllablesWithIndexes(
  input: string,
): (string | number)[] {
  const tokens = [];
  for (const { index, 0: text } of input.matchAll(matchAllPinyinRegExp)) {
    tokens.push(index, text);
  }
  return tokens;
}

export function pinyinInitialGroupTitle(groupId: PinyinInitialGroupId): string {
  switch (groupId) {
    case PinyinInitialGroupId.Basic: {
      return `Basic`;
    }
    case PinyinInitialGroupId[`-i`]: {
      return `Ends with -i`;
    }
    case PinyinInitialGroupId[`-u`]: {
      return `Ends with -u`;
    }
    case PinyinInitialGroupId[`-ü`]: {
      return `Ends with -ü`;
    }
    case PinyinInitialGroupId.Null: {
      return `Null`;
    }
    case PinyinInitialGroupId.Everything: {
      return `Everything`;
    }
  }
}
