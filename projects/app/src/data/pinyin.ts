import type {
  PinyinSoundGroupId,
  PinyinSoundId,
  PinyinText,
  PinyinUnit,
} from "@/data/model";
import { deepReadonly, memoize0, memoize1 } from "@pinyinly/lib/collections";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import type { DeepReadonly } from "ts-essentials";
import z from "zod/v4";

/**
 * Converts a pinyin string to use the standard diacritic tone marks instead of
 * numeric form.
 * @param pinyin
 */
export const normalizePinyinText = (pinyin: string): PinyinText => {
  const units = matchAllPinyinUnitsWithIndexes(pinyin);
  if (units.length === 0) {
    return pinyin as PinyinText;
  }

  let result = ``;
  let lastIndex = 0;
  for (let i = 0; i < units.length; i += 2) {
    const [index, unit] = [units[i], units[i + 1]] as [number, string];

    result += pinyin.slice(lastIndex, index);
    result += normalizePinyinUnit(unit);
    lastIndex = index + unit.length;
  }
  result += pinyin.slice(lastIndex);
  return result as PinyinText;
};

/**
 * Converts a single pinyin word written with a tone number suffix to use a tone
 * mark instead (also converts v to ü).
 */
export const normalizePinyinUnit = memoize1(function normalizePinyinUnit(
  pinyinOrNumeric: string,
): PinyinUnit {
  invariant(pinyinOrNumeric.length > 0, `pinyin must not be empty`);

  // An algorithm to find the correct vowel letter (when there is more than one) is as follows:
  //
  // 1. If there is an a or an e, it will take the tone mark
  // 2. If there is an ou, then the o takes the tone mark
  // 3. Otherwise, the second vowel takes the tone mark

  // oxlint-disable-next-line typescript/no-non-null-assertion
  let tone = `012345`.indexOf(pinyinOrNumeric.at(-1)!);

  const pinyinLengthWithoutTone =
    tone >= 0 ? pinyinOrNumeric.length - 1 : pinyinOrNumeric.length;

  let result = ``;
  for (let i = 0; i < pinyinLengthWithoutTone; i++) {
    // oxlint-disable-next-line typescript/no-non-null-assertion
    let char = pinyinOrNumeric[i]!;
    let nextChar = pinyinOrNumeric[i + 1];

    // Handle u: → v → ü
    if (char === `u` && nextChar === `:`) {
      i++;
      char = `v`;
      nextChar = pinyinOrNumeric[i + 1];
    }

    if (tone > 0) {
      if (char === `a` || char === `e`) {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        result += toneMap[char][tone]!;
        tone = -1;
        continue;
      } else if (char === `o` && nextChar === `u`) {
        // oxlint-disable-next-line typescript/no-non-null-assertion
        result += toneMap[char][tone]!;
        tone = -1;
        continue;
      } else if (isPinyinVowel(char)) {
        if (isPinyinVowel(nextChar)) {
          // oxlint-disable-next-line typescript/no-non-null-assertion
          result += toneMap[char][5] + toneMap[nextChar][tone]!;
          i++;
        } else {
          // oxlint-disable-next-line typescript/no-non-null-assertion
          result += toneMap[char][tone]!;
        }
        tone = -1;
        continue;
      }
    }

    // oxlint-disable-next-line typescript/no-non-null-assertion
    result += isPinyinVowel(char) ? toneMap[char][5] : char;
  }
  return result as PinyinUnit;
});

/**
 * Normalize a pinyin unit for pronunciation hint keying.
 *
 * This preserves tone marks and collapses erhua suffixes so r-variants share
 * the same hint key.
 */
export const normalizePinyinUnitForHintKey = memoize1(
  function normalizePinyinUnitForHintKey(pinyinOrNumeric: string): PinyinUnit {
    const normalized = normalizePinyinUnit(pinyinOrNumeric);

    if (normalized.length > 2 && normalized.endsWith(`r`)) {
      return normalized.slice(0, -1) as PinyinUnit;
    }

    return normalized;
  },
);

const toneMap = {
  a: [`_`, `ā`, `á`, `ǎ`, `à`, `a`],
  e: [`_`, `ē`, `é`, `ě`, `è`, `e`],
  i: [`_`, `ī`, `í`, `ǐ`, `ì`, `i`],
  o: [`_`, `ō`, `ó`, `ǒ`, `ò`, `o`],
  u: [`_`, `ū`, `ú`, `ǔ`, `ù`, `u`],
  // The order of `ü` and `v` is significant.
  ü: [`_`, `ǖ`, `ǘ`, `ǚ`, `ǜ`, `ü`],
  v: [`_`, `ǖ`, `ǘ`, `ǚ`, `ǜ`, `ü`],
  // Special case for m, which can take a tone in some dialects and is sometimes
  // used as a placeholder for erhua syllables.
  m: [`_`, `m̄`, `ḿ`, `m̌`, `m̀`, `m`],
  // fake pinyin, but used for distractors
  ï: [`_`, `ï`, `ḯ`, `î`, `ì`, `i`],
} as const;

const vowels = [`a`, `e`, `i`, `o`, `u`, `ü`, `v`, `ï`];

const isPinyinVowel = (
  char: string | null | undefined,
): char is `a` | `e` | `i` | `ï` | `o` | `u` | `ü` =>
  char != null && vowels.includes(char);

export const splitPinyinUnitTone = memoize1(function splitPinyinUnitTone(
  unit: PinyinUnit,
): {
  tonelessUnit: PinyinUnit;
  tone: number;
} {
  for (const [key, value] of Object.entries(toneMap)) {
    for (let tone = 1; tone <= 4; tone++) {
      const char = nonNullable(value[tone]);

      const index = unit.indexOf(char);
      if (index !== -1) {
        const tonelessUnit = unit.replace(char, key) as PinyinUnit;
        return { tonelessUnit, tone };
      }
    }
  }

  return { tonelessUnit: unit, tone: 5 };
});

/**
 * Given a toneless pinyin (i.e. `hao` rather than `hǎo`) split into an initial
 * and final using a given chart.
 */
export function splitTonelessPinyinUnitWithChart(
  tonelessPinyin: PinyinUnit,
  chart: DeepReadonly<PinyinChart>,
): Pick<SplitPinyinUnit, `initialSoundId` | `finalSoundId`> | null {
  const initialSoundId = chart.unitToInitialSound[tonelessPinyin];
  const finalSoundId = chart.unitToFinalSound[tonelessPinyin];

  if (initialSoundId == null || finalSoundId == null) {
    return null;
  }

  return { initialSoundId, finalSoundId };
}

export interface SplitPinyinUnit {
  initialSoundId: PinyinSoundId;
  finalSoundId: PinyinSoundId;
  toneSoundId: PinyinSoundId;
  tone: number;
  tonelessUnit: PinyinUnit;
}

export function splitPinyinUnitWithChart(
  pinyinUnit: PinyinUnit,
  chart: DeepReadonly<PinyinChart>,
): Readonly<SplitPinyinUnit> | null {
  const { tonelessUnit, tone } = splitPinyinUnitTone(pinyinUnit);

  const parts = splitTonelessPinyinUnitWithChart(tonelessUnit, chart);
  if (parts == null) {
    return null;
  }

  const toneSoundId = `${tone}` as PinyinSoundId;

  return {
    initialSoundId: parts.initialSoundId,
    finalSoundId: parts.finalSoundId,
    toneSoundId,
    tone,
    tonelessUnit,
  };
}

export interface PinyinUnitSuggestion {
  pinyinUnit: PinyinUnit;
  tone: number;
}

export interface PinyinUnitSuggestions {
  from: number;
  to: number;
  units: PinyinUnitSuggestion[];
}

/**
 * Search for pinyin units using ASCII.
 * @param query
 * @returns
 */
export function pinyinUnitSuggestions(
  query: string,
): DeepReadonly<PinyinUnitSuggestions> | null {
  const lastUnit = matchAllPinyinUnitsWithIndexes(query).slice(-2);
  if (lastUnit.length !== 2) {
    return null;
  }
  const [lastUnitIndex, lastUnitText] = lastUnit as [number, string];
  const from = lastUnitIndex;
  const to = lastUnitIndex + lastUnitText.length;
  if (to !== query.length) {
    // The last unit is not at the end of the string, so we can't search for it.
    return null;
  }

  const { tonelessUnit } = splitPinyinUnitTone(
    normalizePinyinUnit(lastUnitText),
  );

  const suggestions = toneVariationsForTonelessUnit(tonelessUnit);
  return { from, to, units: suggestions };
}

const toneVariationsForTonelessUnit = memoize1(
  (tonelessUnit: PinyinUnit): DeepReadonly<PinyinUnitSuggestion[]> => {
    const result: PinyinUnitSuggestion[] = [];
    for (let i = 1; i <= 5; i++) {
      result.push({
        pinyinUnit: normalizePinyinUnit(`${tonelessUnit}${i}`),
        tone: i,
      });
    }
    return result;
  },
);

/**
 * Parses a pinyin unit using the Pinyinly pinyin chart, returning the tone,
 * initial, final.
 */
export const splitPinyinUnit = memoize1(function splitPinyinUnit(
  pinyinUnit: PinyinUnit,
): Readonly<SplitPinyinUnit> | null {
  const chart = loadPylyPinyinChart();

  return splitPinyinUnitWithChart(pinyinUnit, chart);
});

/**
 * Convenience wrapper around @see splitPinyinUnit.
 */
export const splitPinyinUnitOrThrow = memoize1(function splitPinyinUnitOrThrow(
  pinyinUnit: PinyinUnit,
): Readonly<SplitPinyinUnit> {
  const parts = splitPinyinUnit(pinyinUnit);
  invariant(parts != null, `Could not split pinyin %s`, pinyinUnit);
  return parts;
});

export function isInitialSoundId(soundId: PinyinSoundId): boolean {
  return soundId.endsWith(`-`);
}

export function isFinalSoundId(soundId: PinyinSoundId): boolean {
  return soundId.startsWith(`-`);
}

export function isInitialOrFinalSoundId(soundId: PinyinSoundId): boolean {
  return isInitialSoundId(soundId) || isFinalSoundId(soundId);
}

export const loadPylyPinyinChart = memoize0(() =>
  buildPinyinChart({
    items: {
      // Initials
      "∅-": `a ao ê er ai an ang e ei en ong eng ou o`,
      "zh-": `zhi zha zhe zhai zhei zhao zhou zhan zhen zhang zheng zhong`,
      "ch-": `chi cha che chai chao chou chan chen chang cheng chong`,
      "sh-": `shi sha she shai shei shao shou shan shen shang sheng`,
      "r-": `ri re rao rou ran ren rang reng rong`,
      "z-": `zi za ze zai zei zao zou zan zen zang zeng zong`,
      "c-": `ci ca ce cai cei cao cou can cen cang ceng cong`,
      "s-": `si sa se sai sei sao sou san sen sang seng song`,
      "b-": `ba bai bei bao ban ben bang beng bo`,
      "p-": `pa pai pei pao pou pan pen pang peng po pun`,
      "m-": `ma me mai mei mao mou man men mang meng mo m`,
      "f-": `fa fai fei fou fan fen fang feng fiao fo`,
      "d-": `da de dai dei dao dou dan den dang deng dong`,
      "t-": `ta te tai tei tao tou tan tang teng tong`,
      "n-": `na ne nai nei nao nou nan nen nang neng nong`,
      "l-": `la lo le lai lei lao lou lan len lang leng long`,
      "g-": `ga ge gai gei gao gou gan gen gang geng gin ging gong`,
      "k-": `ka ke kai kei kao kou kan ken kang keng kiu kiang kong`,
      "h-": `ha he hai hei hao hou han hen hang heng hong`,
      "yu-": `yu yue yuan yun`,
      "nü-": `nü nüe`,
      "lü-": `lü lüe lüan lün`,
      "ju-": `ju jue juan jun`,
      "qu-": `qu que quan qun`,
      "xu-": `xu xue xuan xun`,
      "w-": `wu wa wo wai wei wan wen wang weng`,
      "bu-": `bu`,
      "pu-": `pu`,
      "mu-": `mu`,
      "fu-": `fu`,
      "du-": `du duo dui duan dun duang`,
      "tu-": `tu tuo tui tuan tun`,
      "nu-": `nu nuo nui nuan nun`,
      "lu-": `lu luo luan lun`,
      "gu-": `gu gua guo guai gui guan gun guang`,
      "ku-": `ku kua kuo kuai kui kuan kun kuang`,
      "hu-": `hu hua huo huai hui huan hun huang`,
      "zhu-": `zhu zhua zhuo zhuai zhui zhuan zhun zhuang`,
      "chu-": `chu chua chuo chuai chui chuan chun chuang`,
      "shu-": `shu shua shuo shuai shui shuan shun shuang`,
      "ru-": `ru rua ruo rui ruan run`,
      "zu-": `zu zuo zui zuan zun`,
      "cu-": `cu cuo cui cuan cun`,
      "su-": `su suo sui suan sun`,
      "y-": `yi ya yo ye yai yao you yan ying yin yang yong`,
      "bi-": `bi bie biao bian bin biang bing`,
      "pi-": `pi pia pie piao pian pin ping`,
      "mi-": `mi mie miao miu mian min ming`,
      "di-": `di dia die diao diu dian din diang ding`,
      "ti-": `ti tie tiao tian ting`,
      "ni-": `ni nia nie niao niu nian nin niang ning`,
      "li-": `li lia lie liao liu lian lin liang ling`,
      "ji-": `ji jia jie jiao jiu jian jin jiang jing jiong`,
      "qi-": `qi qia qie qiao qiu qian qin qiang qing qiong`,
      "xi-": `xi xia xie xiao xiu xian xin xiang xing xiong`,

      // Finals
      //
      // Instead of using the common -(e)ng convention of parenthesis, we omit
      // them from the IDs so that they don't get percent-encoded in URLs.
      "-eng": `eng beng peng meng feng deng teng neng leng geng keng heng zheng cheng sheng reng zeng ceng seng weng ying bing ping ming ding ting ning ling ging jing qing xing`,
      "-ang": `ang bang pang mang fang dang tang nang lang gang kang hang zhang chang shang rang zang cang sang yang biang diang niang liang kiang jiang qiang xiang wang duang guang kuang huang zhuang chuang shuang`,
      "-ong": `ong dong tong nong long gong kong hong zhong chong rong zong cong song yong jiong qiong xiong`,
      "-ai": `ai bai pai mai fai dai tai nai lai gai kai hai zhai chai shai zai cai sai yai wai guai kuai huai zhuai chuai shuai`,
      "-ei": `ei bei pei mei fei dei tei nei lei gei kei hei zhei shei zei cei sei wei chui cui rui zui sui shui zhui dui tui nui gui kui hui`,
      "-ao": `ao bao pao mao dao tao nao lao gao kao hao zhao chao shao rao zao cao sao yao biao piao miao fiao diao tiao niao liao jiao qiao xiao`,
      "-ou": `ou pou mou fou dou tou nou lou gou kou hou zhou chou shou rou zou cou sou you diu wu niu liu miu kiu jiu qiu xiu`,
      "-an": `an ban pan man fan dan tan nan lan gan kan han zhan chan shan ran zan can san yan bian pian mian dian tian nian lian jian qian xian wan duan tuan nuan luan guan kuan huan zhuan chuan shuan ruan zuan cuan suan yuan lüan juan quan xuan`,
      "-en": `yin en ben pen men fen den nen len gen ken hen zhen chen shen ren zen cen sen wen bin pin min din nin lin gin jin qin xin zhun chun shun cun run zun sun pun dun tun nun lun gun kun hun jun qun xun yun lün`,
      "-e": `e me de te ne le ge ke he re ze ce ye se ê zhe che she bie pie mie die tie nie lie jie qie xie jue que xue yue nüe lüe`,
      "-a": `a pa ma fa da ta na la ga ka ha za ca sa ba ya pia dia nia lia jia qia xia wa gua kua hua zhua chua shua rua cha zha sha`,
      "-o": `o yo wo bo po mo fo duo tuo nuo luo guo kuo huo zhuo chuo shuo ruo zuo cuo suo lo`,
      "-∅": `er si zhi chi shi ri zi ci yi bi pi mi di ti ni li ji qi xi pu mu fu du tu nu lu gu ku hu bu zhu chu shu cu ru zu su ju qu xu yu nü lü m`,
    },
    labels: {
      // Using square brackets to indicate optional characters, other systems
      // use parentheses.
      "-eng": `-[e]ng`,
      "-ei": `-[e]i`,
      "-ou": `-[o]u`,
      "-en": `-[e]n`,
    },
    groups: [
      // These group IDs are URL safe so if they do ever need to go in the URL
      // they won't need to be percent-encoded and mangled.
      {
        id: `__-`,
        items: `b- c- ch- d- f- g- h- k- l- m- n- p- r- s- sh- t- z- zh-`,
      },
      {
        id: `__ue-`,
        items: `ju- lü- nü- qu- xu- yu-`,
      },
      {
        id: `__u-`,
        items: `bu- cu- chu- du- fu- gu- hu- ku- lu- mu- nu- pu- ru- su- shu- tu- w- zu- zhu-`,
      },
      {
        id: `__i-`,
        items: `bi- di- ji- li- mi- ni- pi- qi- ti- xi- y-`,
      },
      {
        id: `.-`,
        items: `∅-`,
      },
      {
        id: `-__`,
        items: `-∅ -a -ai -an -ang -ao -e -ei -en -eng -o -ou -ong`,
      },
      {
        id: `tones`,
        items: `1 2 3 4 5`,
      },
    ],
  }),
);

export const defaultPinyinSoundGroupNames = {
  "__-": `Basic`,
  "__u-": `Ending with “ooo”`,
  "__ue-": `Ending with “eeww”`,
  "__i-": `Ending with “eee”`,
  ".-": `Null initial`,
  "-__": `Finals`,
  tones: `Tones`,
} as Record<PinyinSoundGroupId, string>;

export const defaultPinyinSoundGroupThemes = {
  "__-": `Animals`,
  "__u-": `Archetypes`,
  "__ue-": `Fiction`,
  "__i-": `People`,
  ".-": `Unique`,
  "-__": `Places`,
  tones: `Areas`,
} as Record<PinyinSoundGroupId, string>;

export const defaultToneNames = {
  "1": `high and level`,
  "2": `rising and questioning`,
  "3": `mid-level and neutral`,
  "4": `falling and definitive`,
  "5": `light and short`,
} as Record<string, string>;

// Tone names that work as prepositions/locations and read better before the final
const prepositionToneNames = new Set([
  `outside`,
  `inside`,
  `above`,
  `below`,
  `entry`,
  `exit`,
  `beyond`,
  `within`,
  `beside`,
  `behind`,
]);

export function getDefaultFinalToneName({
  finalName,
  toneName,
}: {
  finalName: string;
  toneName: string;
}): string {
  const trimmedFinal = finalName.trim();
  const trimmedTone = toneName.trim();

  if (trimmedFinal.length === 0) {
    return trimmedTone;
  }
  if (trimmedTone.length === 0) {
    return trimmedFinal;
  }

  // Check if the tone name is a preposition-like word
  const toneNameLower = trimmedTone.toLowerCase();
  if (prepositionToneNames.has(toneNameLower)) {
    // Keep original format: "Outside the River Stage"
    return `${trimmedTone} the ${trimmedFinal}`;
  }

  // Otherwise, use final + lowercase tone: "River Stage entrance"
  return `${trimmedFinal} ${toneNameLower}`;
}

export const defaultPinyinSoundGroupRanks = Object.fromEntries(
  [`tones`, `__u-`, `__-`, `__i-`, `__ue-`, `.-`, `-__`].map((id, index) => [
    id,
    index,
  ]),
) as Record<PinyinSoundGroupId, number>;

type TonelessUnit = string;
export interface PinyinChart {
  unitToInitialSound: Record<TonelessUnit, PinyinSoundId>;
  unitToFinalSound: Record<TonelessUnit, PinyinSoundId>;
  units: Set<TonelessUnit>;
  soundToCustomLabel: Record<PinyinSoundId, string>;
  soundToUnits: Record<PinyinSoundId, TonelessUnit[]>;
  soundGroups: { id: PinyinSoundGroupId; sounds: PinyinSoundId[] }[];
  soundIds: PinyinSoundId[];
}

function buildPinyinChart(
  chart: z.infer<typeof pinyinChartSpecSchema>,
): DeepReadonly<PinyinChart> {
  const unitToInitialSound: Record<string, PinyinSoundId> = {};
  const unitToFinalSound: Record<string, PinyinSoundId> = {};
  const units = new Set<string>();
  const sounds = new Set<PinyinSoundId>();
  const soundToUnits: Record<PinyinSoundId, string[]> = {};
  const soundToCustomLabel: Record<PinyinSoundId, string> = {};

  for (const [_soundId, unitsSpaceSeparated] of Object.entries(chart.items)) {
    const soundId = _soundId as PinyinSoundId;
    sounds.add(soundId);

    const destination = soundId.startsWith(`-`)
      ? unitToFinalSound
      : unitToInitialSound;
    const soundUnits = unitsSpaceSeparated.split(` `);
    soundToUnits[soundId] = soundUnits;

    for (const unit of soundUnits) {
      invariant(unit.length > 0, `Match must not be empty: ${soundId} ${unit}`);
      units.add(unit);
      invariant(
        !(unit in destination),
        `Duplicate pinyin unit "${unit}" in ${soundId}`,
      );
      destination[unit] = soundId;
    }
  }

  if (chart.labels != null) {
    for (const [soundId, label] of Object.entries(chart.labels)) {
      invariant(
        sounds.has(soundId as PinyinSoundId),
        `Label rule for ${soundId} does not match a sound ID`,
      );
      soundToCustomLabel[soundId as PinyinSoundId] = label;
    }
  }

  const soundGroups = chart.groups.map((group) => ({
    id: group.id as PinyinSoundGroupId,
    sounds: group.items.split(` `) as PinyinSoundId[],
  }));

  const soundIds = soundGroups.flatMap((group) => group.sounds);

  return {
    unitToInitialSound,
    unitToFinalSound,
    units,
    soundGroups,
    soundToCustomLabel,
    soundToUnits,
    soundIds,
  };
}

export function getPinyinSoundLabel(
  soundId: PinyinSoundId,
  chart: DeepReadonly<PinyinChart>,
): string {
  return chart.soundToCustomLabel[soundId] ?? soundId;
}

const pinyinChartSpecSchema = z.object({
  items: z.record(z.string(), z.string()),
  labels: z.record(z.string(), z.string()).optional(),
  groups: z.array(
    z.object({
      id: z.string().optional(),
      items: z.string(),
    }),
  ),
});

const pinyinChartSchema = pinyinChartSpecSchema.transform((x) =>
  buildPinyinChart(x),
);

export const loadStandardPinyinChart = memoize0(async () =>
  pinyinChartSchema
    .transform(deepReadonly)

    .parse((await import(`./standardPinyinChart.asset.json`)).default),
);

export const loadMmPinyinChart = memoize0(async () =>
  pinyinChartSchema
    .transform(deepReadonly)

    .parse((await import(`./mmPinyinChart.asset.json`)).default),
);

export const loadHhPinyinChart = memoize0(async () =>
  pinyinChartSchema
    .transform(deepReadonly)

    .parse((await import(`./hhPinyinChart.asset.json`)).default),
);

export const loadHmmPinyinChart = memoize0(async () =>
  pinyinChartSchema
    .transform(deepReadonly)

    .parse((await import(`./hmmPinyinChart.asset.json`)).default),
);

export const pinyinUnitPattern = (() => {
  const a = `(?:a|ā|à|á|ǎ)`;
  const e = `(?:e|ē|é|ě|è)`;
  const i = `(?:i|ī|í|ǐ|ì)`;
  const o = `(?:o|ō|ó|ǒ|ò)`;
  const u = `(?:u|ū|ú|ǔ|ù)`;
  const v = `(?:ü|ǖ|ǘ|ǚ|ǜ|v|u:)`;

  const consonantEnd = `(?!${a}|${e}|${i}|${o}|${u}|${v})`;

  return (
    `(?:` +
    `(?:(?:[zcs]h|[gkh])u${a}ng${consonantEnd})|` +
    `(?:[jqx]i${o}ng${consonantEnd})|` +
    `(?:[nljqx]i${a}ng${consonantEnd})|` +
    `(?:(?:[zcs]h?|[dtnlgkhrjqxy])u${a}n${consonantEnd})|` +
    `(?:(?:[zcs]h|[gkh])u${a}i)|` +
    `(?:(?:[zc]h?|[rdtnlgkhsy])?${o}ng${consonantEnd})|` +
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
    `(?:m|m̄|ḿ|m̌|m̀)|` +
    `(?:r${consonantEnd})` +
    `)` +
    `[0-5]?`
  );
})();

const matchAllPinyinRegExp = new RegExp(pinyinUnitPattern, `ig`);

/**
 * Find all pinyin units in a string, matches both diacritic and numeric
 * forms.
 *
 * @returns {string[]} Intentionally returns string[] rather than
 * {@link PinyinUnit[]} because they might be numeric form and not normalized.
 */
export function matchAllPinyinUnits(input: string): string[] {
  const result = [];
  for (const { 0: text } of input.matchAll(matchAllPinyinRegExp)) {
    result.push(text);
  }
  return result;
}

/**
 * Find all pinyin units in a string. See also @see matchAllPinyinUnits.
 *
 * @returns An array of alternating index and matched unit pairs.
 */
export function matchAllPinyinUnitsWithIndexes(
  input: string,
): (string | number)[] {
  const tokens = [];
  for (const { index, 0: text } of input.matchAll(matchAllPinyinRegExp)) {
    tokens.push(index, text);
  }
  return tokens;
}

export const defaultPinyinSoundInstructions = {
  // Tones
  "1": `high and level`,
  "2": `rising and questioning`,
  "3": `mid-level and neutral`,
  "4": `falling and definitive`,
  "5": `light and short`,
  // Basic
  "∅-": `No initial — starts directly with the final (e.g. *ai*, *ou*).`,
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
  // Finals
  "-a": `Like **“ah”** in *father* or *car* — open mouth, low tongue.`,
  "-ai": `Like **“eye”** in *high* — a smooth glide from \`a\` to \`i\`.`,
  "-an": `Like **“an”** in *ban*, but more open — tongue lower and more forward.`,
  "-ang": `The long “ah” vowel (as in car), followed by soft \`ng\`.`,
  "-ao": `Like **“ow”** in *cow* — start with \`a\`, glide into \`o\`.`,
  "-e": `Like **“uh”** in *duh*, but without the R sound — central, relaxed vowel.`,
  "-ei": `Like **“ay”** in *say* — may start with a faint \`e\` or glide straight to \`i\`.`,
  "-en": `Like **“un”** in *button* or **“en”** in *pen* — nasal, central vowel.`,
  "-eng": `Like **“ung”** in *sung* or **“eng”** in *length* — nasal, back of mouth.`,
  "-o": `Like **“aw”** in *law* — lips rounded, tongue mid-back.`,
  "-ou": `Like **“oh”** in *go* — rounded lips, smooth glide.`,
  "-ong": `Like **“ong”** in *song* — starts like \`o\`, ends with soft \`ng\`.`,
  "-∅": `No final — the syllable ends with the initial only (e.g. *ba*, *di*).`,
} as Record<PinyinSoundId, string>;

export const defaultPinyinSoundExamples = {
  "1": [`mā`, `yī`],
  "2": [`má`, `lí`],
  "3": [`mǎ`, `nǐ`],
  "4": [`mà`, `qù`],
  "5": [`ma`, `de`],
  "∅-": [`āi`, `ōu`],
  "b-": [`bā`, `bó`],
  "p-": [`pā`, `pén`],
  "m-": [`mā`, `mò`],
  "f-": [`fā`, `fēng`],
  "d-": [`dā`, `dōng`],
  "t-": [`tā`, `tóng`],
  "n-": [`nā`, `nóng`],
  "l-": [`lā`, `lóng`],
  "g-": [`gā`, `gōng`],
  "k-": [`kā`, `kǒng`],
  "h-": [`hā`, `hóng`],
  "zh-": [`zhī`, `zhōng`],
  "ch-": [`chī`, `cháng`],
  "sh-": [`shī`, `shàng`],
  "r-": [`rì`, `rén`],
  "z-": [`zī`, `zōng`],
  "c-": [`cī`, `cóng`],
  "s-": [`sī`, `sòng`],
  "y-": [`yī`, `yǒng`],
  "bi-": [`bī`, `biǎo`],
  "pi-": [`pī`, `pián`],
  "mi-": [`mī`, `miào`],
  "di-": [`dī`, `diǎn`],
  "ti-": [`tī`, `tiáo`],
  "ni-": [`nǐ`, `niáng`],
  "li-": [`lǐ`, `liáng`],
  "ji-": [`jī`, `jiǒng`],
  "qi-": [`qī`, `qiáng`],
  "xi-": [`xī`, `xiōng`],
  "w-": [`wū`, `wǎng`],
  "bu-": [`bù`, `bū`],
  "pu-": [`pǔ`, `pū`],
  "mu-": [`mù`, `mū`],
  "fu-": [`fū`, `fù`],
  "du-": [`dū`, `duò`],
  "tu-": [`tū`, `tuán`],
  "nu-": [`nǔ`, `nuó`],
  "lu-": [`lù`, `luán`],
  "gu-": [`gū`, `guāng`],
  "ku-": [`kù`, `kuǎi`],
  "hu-": [`hū`, `huáng`],
  "zhu-": [`zhū`, `zhuàng`],
  "chu-": [`chū`, `chuán`],
  "shu-": [`shū`, `shuài`],
  "ru-": [`rú`, `ruò`],
  "zu-": [`zú`, `zuǐ`],
  "cu-": [`cù`, `cuì`],
  "su-": [`sū`, `suǒ`],
  "yu-": [`yǔ`, `yuè`],
  "nü-": [`nǚ`, `nüè`],
  "lü-": [`lǜ`, `lüán`],
  "ju-": [`jū`, `jué`],
  "qu-": [`qù`, `quán`],
  "xu-": [`xū`, `xuě`],
  "-a": [`ā`, `pá`],
  "-ai": [`āi`, `hái`],
  "-an": [`ān`, `shān`],
  "-ang": [`āng`, `liáng`],
  "-ao": [`āo`, `jiǎo`],
  "-e": [`ē`, `shè`],
  "-ei": [`ēi`, `wéi`],
  "-en": [`ēn`, `rén`],
  "-eng": [`ēng`, `chéng`],
  "-o": [`ō`, `duō`],
  "-ou": [`ōu`, `zhōu`],
  "-ong": [`ōng`, `zhōng`],
  "-∅": [`zī`, `shì`],
} as Record<PinyinSoundId, readonly [PinyinUnit, ...PinyinUnit[]]>;

/**
 * Count the number of units in a pinyin string. Handles both
 * space-separated units ("nǐ hǎo") and unseparated units ("māma").
 *
 * A unit corresponds to one hanzi character or component.
 */
export function pinyinUnitCount(pinyin: string): number {
  const trimmed = pinyin.trim();
  if (trimmed === ``) {
    return 0;
  }
  const matches = matchAllPinyinUnits(trimmed);
  // Fallback to space-splitting if regex doesn't match (handles edge cases
  // where the pinyin regex may not recognize all valid units)
  return matches.length > 0 ? matches.length : trimmed.split(/\s+/).length;
}
