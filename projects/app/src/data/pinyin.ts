import type { PinyinPronunciation, PinyinSyllable } from "@/data/model";
import { MnemonicThemeId, PinyinInitialGroupId } from "@/data/model";
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
          [`zh`, `zh`, `zhi`],
          [`ch`, `ch`, `chi`],
          [`sh`, `sh`, `shi`],
          [`r`, `r`, `ri`],
          [`z`, `z`, `zi`],
          [`c`, `c`, `ci`],
          [`s`, `s`, `si`],
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

export function mnemonicThemeTitle(themeId: MnemonicThemeId): string {
  switch (themeId) {
    case MnemonicThemeId.AnimalSpecies: {
      return `Animals`;
    }
    case MnemonicThemeId.Profession: {
      return `Archetypes`;
    }
    case MnemonicThemeId.Name: {
      return `Individuals`;
    }
    case MnemonicThemeId.WesternMythologyCharacter: {
      return `Mythical`;
    }
    case MnemonicThemeId.AthleteType:
    case MnemonicThemeId.GreekMythologyCharacter:
    case MnemonicThemeId.MythologyCharacter:
    case MnemonicThemeId.Deprecated_WesternCultureFamousMen:
    case MnemonicThemeId.Deprecated_WesternCultureFamousWomen: {
      return `other ${themeId}`;
    }
  }
}

export const pinyinPartPronunciationInstructionsAustralian: Record<
  string,
  string
> = {
  "b-": `Like the English **“b”** in *bat*, but **unaspirated** — no strong puff of air. Say it gently, without the breathy push you’d normally use in English.`,
  "p-": `Like the English **“p”** in *pat*, but **more forceful** — aspirated, with a noticeable puff of air. Hold your hand near your mouth to feel the breath.`,
  "m-": `Exactly like the English **“m”** in *man*. Lips together, nasal sound.`,
  "f-": `Same as the English **“f”** in *fun*. Top teeth on bottom lip, blow air out.`,
  "d-": `Like the English **“d”** in *dog*, but **softer and without a puff**. Tongue touches just behind your upper teeth.`,
  "t-": `Like the English **“t”** in *top*, but **stronger and more aspirated** — with a clear puff of air.`,
  "n-": `Same as the English **“n”** in *net*. Tip of the tongue touches behind the upper teeth.`,
  "l-": `Very similar to the English **“l”** in *let*, but the tongue stays further forward and flatter against the roof of the mouth.`,
  "g-": `Like the hard English **“g”** in *go*, but **unaspirated** — no strong puff of air. It should feel smoother and softer.`,
  "k-": `Like the English **“k”** in *kite*, but **more forceful**, with a strong puff of air.`,
  "h-": `Like the **“h”** in *hat*, but produced deeper in the throat — slightly raspier, almost like you're clearing your throat softly.`,
  "zh-": `A bit like the English **“j”** in *jam*, but with the **tongue curled back**. The tip of your tongue should bend toward the roof of your mouth.`,
  "ch-": `Like the **“ch”** in *chat*, but with your **tongue curled back** more, and a stronger puff of air.`,
  "sh-": `Like the **“sh”** in *shoe*, but with the **tongue curled back** further toward the roof of the mouth.`,
  "r-": `This one’s tricky — it’s **nothing like the Aussie English “r”**. Start with your tongue curled back like for “sh”, but let it **vibrate a little**. It’s somewhere between the English “r” and the “zh” sound.`,
  "z-": `Like the **“ds”** in *kids*, said quickly at the start of a word. Tongue is flat and close to the teeth.`,
  "c-": `Like the **“ts”** in *cats*, but said at the beginning of a word, with a noticeable puff of air.`,
  "s-": `Just like the English **“s”** in *sun*. Tongue is close to the upper teeth.`,
  // -ee initial (like "sea")
  "y-": `Similar to the English **“y”** in *yes*, but very short and clean. In Pinyin, \`y-\` is often just there to show that the syllable starts with a vowel like **yi** (一), which sounds like **“ee”** in *see*.`,
  "bi-": `Starts with a soft **“b”** (like in *bat*, but without a puff of air), followed by **“ee”** as in *see*. Say it smoothly as one sound: **b-ee**.`,
  "pi-": `Like the **“p”** in *pat*, but with a noticeable puff of air, then **“ee”** as in *see*. Think: **p-ee** with breath.`,
  "mi-": `Exactly like **“me”** in *meet*. Just say **m-ee**, smooth and nasal.`,
  "di-": `Begins with a soft **“d”** (like *dog*, but no breathy push), then **“ee”** as in *see*. Try: **d-ee**, without aspiration.`,
  "ti-": `Like the **“t”** in *tea*, but more aspirated — with a puff of air. Then **“ee”** as in *see*. Say: **t-ee**.`,
  "ni-": `Same as **“knee”** in Aussie English. Just say **n-ee**, with the tongue behind the teeth.`,
  "li-": `Like the **“l”** in *leaf*, then **“ee”** as in *see*. Say: **l-ee** with the tongue forward.`,
  "ji-": `A bit like **“gee”** in *jeep*, but with the tongue closer to the hard palate and no puff of air. The tongue is flatter and more forward than English.`,
  "qi-": `Like **“chee”** in *cheek*, but the tongue is higher and further forward, with a stronger puff of air. Say: **ch-ee**, but smile slightly.`,
  "xi-": `A soft **“sh-ee”** sound, like *sheep*, but with the tongue much closer to the front teeth and spread lips — almost like you're smiling. Say: **sh-ee**, but gentler.`,
  // -u initial (like "woo")
  "w-": `The \`w-\` sound is just like the English **“w”** in *woo*. It blends directly into the following **“oo”** sound. For example, \`wu\` is just like *woo* without any extra ending.`,
  "bu-": `Like the English **“boo”**, but with a softer **b** — no strong puff of air. Just say **b-oo**, gently.`,
  "pu-": `Like **“poo”**, but with a stronger puff of air on the **p**. Hold your hand near your mouth — you should feel it.`,
  "mu-": `Exactly like the Aussie English **“moo”**. Lips together for **m**, then into **oo** as in *food*.`,
  "fu-": `Like the **“foo”** in *food*. Top teeth on bottom lip for the **f**, then roll into **oo**.`,
  "du-": `Similar to **“do”**, but with a soft **d** — no puff of air. Say **d-oo** gently.`,
  "tu-": `Like **“two”**, but with a more aspirated **t** — stronger puff of air. Say **t-oo** with clear breath.`,
  "nu-": `Just like **“new”** without the **“y”** sound. Tongue behind upper teeth, then **oo**.`,
  "lu-": `Like **“loo”** (toilet), said clearly. Tongue touches behind the upper teeth for the **l**.`,
  "gu-": `Like the **“goo”** in *good*, but with a softer **g** — no strong puff. Say **g-oo**, smoothly.`,
  "ku-": `Like **“coo”**, but with a stronger **k** and a puff of air. Say **k-oo**, sharply.`,
  "hu-": `A bit like **“who”**, but with a breathier, raspier **h** that comes from deeper in the throat.`,
  "zhu-": `Starts like **“joo”**, but with the **tongue curled back**. It’s not quite *zoo*, not quite *Jew*, but in between with a retroflex twist.`,
  "chu-": `Similar to **“chew”**, but again with the **tongue curled back**, and a stronger puff of air.`,
  "shu-": `Like **“shoe”**, but the tongue is curled further back in the mouth. It sounds darker and more rounded.`,
  "ru-": `This one's tricky — it's not like the English **“roo”**. Start by curling your tongue back like for \`sh\`, and try to hum into an **“oo”** sound. It’s somewhere between *rue* and *zhoo*.`,
  "zu-": `Like **“zoo”**, but with a **flat tongue close to the teeth**. It's not as voiced as in English — more like a quick **ds-oo**.`,
  "cu-": `Like **“tsu”** in *tsunami*, but with a puff of air. It’s **ts-oo**, pronounced clearly.`,
  "su-": `Exactly like **“soo”** in *soon*. Tongue close to the upper teeth, no puff of air.`,
  // -ü initial (like "yoo")
  "yu-": `\`yu\` is pronounced as **“ü”**, which doesn’t exist in English. Start by saying **“ee”** (as in *see*), then round your lips as if saying **“oo”** (as in *food*) — but **keep your tongue in the 'ee' position**. It’s a tight, forward, rounded sound.`,
  "nü-": `Like \`nu\`, but with the **ü** sound — say **“nee”** with rounded lips. It should not sound like *new*; there's no 'y' glide. Just pure **n-ü**.`,
  "lü-": `Say **“lee”** but round your lips like you’re saying **“oo”**. That gives you the **l-ü** sound. Again, not like *loo* or *lew* — it’s sharper and more forward.`,
  "ju-": `This starts with a sound similar to English **“j”** (as in *jeep*), but then goes into **ü**. Curl your tongue slightly up toward the roof of your mouth, then say **“j-ü”** with rounded lips.`,
  "qu-": `Pronounced like a **sharp 'ch'** in *cheese*, followed by **ü**. Say **“ch-ü”**, with a big smile and rounded lips. It’s not *choo*, it’s **qu** with the fronted vowel.`,
  "xu-": `Like a soft **“sh”** sound, but your tongue is much closer to your teeth. Say **“sh-ü”** — smile and round your lips. It’s not *shoe*, it's more hissy and forward.`,
};
