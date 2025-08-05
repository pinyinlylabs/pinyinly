import type {
  PinyinPronunciation,
  PinyinSoundGroupId,
  PinyinSoundId,
  PinyinSyllable,
} from "@/data/model";
import { deepReadonly, memoize0, memoize1 } from "@pinyinly/lib/collections";
import { invariant } from "@pinyinly/lib/invariant";
import type { DeepReadonly } from "ts-essentials";
import z from "zod/v4";

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
  syllable: string,
): { tonelessSyllable: PinyinSyllable; tone: number } | null {
  for (const [key, value] of Object.entries(toneMap)) {
    for (let tone = 1; tone <= 4; tone++) {
      const char = value[tone];
      invariant(char != null);

      const index = syllable.indexOf(char);
      if (index !== -1) {
        const tonelessSyllable = syllable.replace(char, key) as PinyinSyllable;
        return { tonelessSyllable, tone };
      }
    }
  }

  return { tonelessSyllable: syllable as PinyinSyllable, tone: 5 };
});

/**
 * Given a toneless pinyin (i.e. `hao` rather than `hǎo`) split into an initial
 * and final using a given chart.
 */
export function splitTonelessPinyinSyllable(
  pinyin: string,
  chart: DeepReadonly<PinyinChart>,
): {
  initialSoundId: string;
  finalSoundId: string;
} | null {
  const initialSoundId = chart.syllableToInitialSound[pinyin];
  const finalSoundId = chart.syllableToFinalSound[pinyin];

  if (initialSoundId == null || finalSoundId == null) {
    return null;
  }

  return { initialSoundId, finalSoundId };
}

export function parsePinyinSyllableWithChart(
  pinyinSyllable: string,
  chart: DeepReadonly<PinyinChart>,
): {
  initialSoundId: string;
  finalSoundId: string;
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
  const { tonelessSyllable, tone } = toneResult;

  const initialFinalResult = splitTonelessPinyinSyllable(
    tonelessSyllable,
    chart,
  );
  if (initialFinalResult == null) {
    return null;
  }

  const { initialSoundId, finalSoundId } = initialFinalResult;

  return {
    initialSoundId,
    finalSoundId,
    tone,
    tonelessSyllable,
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
  const chart = loadPylyPinyinChart();

  return deepReadonly(parsePinyinSyllableWithChart(pinyinSyllable, chart));
});

export function parsePinyinSyllableOrThrow(pinyinSyllable: string) {
  const parsed = parsePinyinSyllable(pinyinSyllable);
  invariant(parsed != null, `Could not parse pinyin ${pinyinSyllable}`);
  return parsed;
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
      "m-": `ma me mai mei mao mou man men mang meng mo`,
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
      "-∅": `er si zhi chi shi ri zi ci yi bi pi mi di ti ni li ji qi xi pu mu fu du tu nu lu gu ku hu bu zhu chu shu cu ru zu su ju qu xu yu nü lü`,
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

export const defaultPinyinSoundGroupRanks = Object.fromEntries(
  [`tones`, `__u-`, `__-`, `__i-`, `__ue-`, `.-`, `-__`].map((id, index) => [
    id,
    index,
  ]),
) as Record<PinyinSoundGroupId, number>;

type TonelessSyllable = string;
export interface PinyinChart {
  syllableToInitialSound: Record<TonelessSyllable, PinyinSoundId>;
  syllableToFinalSound: Record<TonelessSyllable, PinyinSoundId>;
  syllables: Set<TonelessSyllable>;
  soundToCustomLabel: Record<PinyinSoundId, string>;
  soundToSyllables: Record<PinyinSoundId, TonelessSyllable[]>;
  soundGroups: { id: PinyinSoundGroupId; sounds: PinyinSoundId[] }[];
}

function buildPinyinChart(
  chart: z.infer<typeof pinyinChartSpecSchema>,
): DeepReadonly<PinyinChart> {
  const syllableToInitialSound: Record<string, PinyinSoundId> = {};
  const syllableToFinalSound: Record<string, PinyinSoundId> = {};
  const syllables = new Set<string>();
  const sounds = new Set<PinyinSoundId>();
  const soundToSyllables: Record<PinyinSoundId, string[]> = {};
  const soundToCustomLabel: Record<PinyinSoundId, string> = {};

  for (const [_soundId, syllablesSpaceSeparated] of Object.entries(
    chart.items,
  )) {
    const soundId = _soundId as PinyinSoundId;
    sounds.add(soundId);

    const destination = soundId.startsWith(`-`)
      ? syllableToFinalSound
      : syllableToInitialSound;
    const soundSyllables = syllablesSpaceSeparated.split(` `);
    soundToSyllables[soundId] = soundSyllables;

    for (const syllable of soundSyllables) {
      invariant(
        syllable.length > 0,
        `Match must not be empty: ${soundId} ${syllable}`,
      );
      syllables.add(syllable);
      invariant(
        !(syllable in destination),
        `Duplicate pinyin syllable "${syllable}" in ${soundId}`,
      );
      destination[syllable] = soundId;
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

  return {
    syllableToInitialSound,
    syllableToFinalSound,
    syllables,
    soundGroups,
    soundToCustomLabel,
    soundToSyllables,
  };
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
