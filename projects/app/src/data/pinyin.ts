import type { PinyinInitialGroupId, PinyinText } from "@/data/model";
import { memoize1, sortComparatorNumber } from "@/util/collections";
import { invariant } from "@haohaohow/lib/invariant";
import type { DeepReadonly } from "ts-essentials";

/**
 * `[label, match1, match2, ...]`
 */
export type PinyinProduction = readonly string[];

export interface PinyinChart {
  initials: DeepReadonly<
    { id: PinyinInitialGroupId; desc: string; initials: PinyinProduction[] }[]
  >;
  finals: readonly PinyinProduction[];
  overrides?: DeepReadonly<Record<string, [initial: string, final: string]>>;
}

/**
 * Break a PinyinString into individual pinyin words.
 */
export function splitPinyinText(pinyinText: PinyinText): string[] {
  return pinyinText.split(` `);
}

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

  const pinyinLengthWithoutTone = tone >= 0 ? pinyin.length - 1 : pinyin.length;

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
  // fake pinyin, but used for distractors
  ï: `_ïḯîìi`,
} as const;

const isPinyinVowel = (
  char: string | null | undefined,
): char is `a` | `e` | `i` | `ï` | `o` | `u` | `ü` =>
  char != null && char in toneMap;

export const parsePinyinTone = memoize1(function parsePinyinTone(
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
});

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

export function parsePinyinWithChart(
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
