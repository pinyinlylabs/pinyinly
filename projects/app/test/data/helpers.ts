import {
  isHanziCharacter,
  matchAllHanziCharacters,
  splitHanziText,
} from "#data/hanzi.ts";
import type {
  HanziCharacter,
  HanziGlossMistakeType,
  HanziPinyinMistakeType,
  HanziText,
  HanziWord,
  HanziWordSkill,
  MistakeType,
  PinyinText,
  PinyinUnit,
  Skill,
  SrsStateFsrsFourPointFiveType,
  SrsStateMockType,
} from "#data/model.ts";
import {
  MistakeKind,
  QuestionFlagKind,
  SkillKind,
  SrsKind,
} from "#data/model.ts";
import {
  loadPylyPinyinChart,
  matchAllPinyinUnits,
  normalizePinyinUnit,
} from "#data/pinyin.js";
import type { Rizzle } from "#data/rizzleSchema.js";
import type { SkillReviewQueue, SkillReviewQueueItem } from "#data/skills.js";
import { hanziWordFromSkill, skillKindFromSkill } from "#data/skills.js";
import { hanziFromHanziWord, loadDictionary } from "#dictionary.js";
import { emojiToRating } from "#test/helpers.ts";
import type { Rating } from "#util/fsrs.ts";
import { nextReview } from "#util/fsrs.ts";
import { nanoid } from "#util/nanoid.js";
import { splitN } from "#util/unicode.js";
import { memoize0 } from "@pinyinly/lib/collections";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import { UnexpectedValueError } from "@pinyinly/lib/types";
import type { Duration } from "date-fns";
import { add } from "date-fns/add";
// oxlint-disable-next-line no-restricted-imports
import * as hanzijs from "hanzi";
import type { DeepReadonly } from "ts-essentials";
import { vi } from "vitest";

export const date = (strings: TemplateStringsArray): Date => {
  const shorthand = strings.reduce((acc, str) => acc + str, ``);
  return parseRelativeTimeShorthand(shorthand);
};

export const 时 = date;

export const parseDurationShorthand = (shorthand: string): Duration => {
  const result: Duration = {};

  const regex = /(-|\+)?(\d+)([\w])/g;
  for (const match of shorthand.matchAll(regex)) {
    const [, sign, multiple, unit] = match;
    const scalar = (sign === `-` ? -1 : 1) * Number(multiple);

    switch (unit ?? ``) {
      case `s`: {
        result.seconds = scalar;
        break;
      }
      case `m`: {
        result.minutes = scalar;
        break;
      }
      case `h`: {
        result.hours = scalar;
        break;
      }
      case `d`: {
        result.days = scalar;
        break;
      }
      default: {
        throw new Error(`invalid duration unit ${unit}`);
      }
    }
  }

  return result;
};

/**
 * Convert a string like "+1d" or "-5s" to a date.
 */
export const parseRelativeTimeShorthand = (
  shorthand: string,
  now = new Date(),
): Date => {
  const duration = parseDurationShorthand(shorthand);
  return add(now, duration);
};

export const mockSrsState = (
  prevReviewAt: Date,
  nextReviewAt: Date,
): SrsStateMockType => {
  return {
    kind: SrsKind.Mock,
    prevReviewAt,
    nextReviewAt,
  };
};

export const fsrsSrsState = (
  prevReviewAt: Date,
  nextReviewAt: Date,
  rating: Rating,
): SrsStateFsrsFourPointFiveType => {
  let state = null;
  for (const now of [时`-20d`, 时`-15d`, 时`-10d`, 时`-5d`, 时`-2d`]) {
    state = nextReview(state, rating, now);
  }
  invariant(state != null);

  return {
    kind: SrsKind.FsrsFourPointFive,
    prevReviewAt,
    nextReviewAt,
    stability: state.stability,
    difficulty: state.difficulty,
  };
};

/**
 * {@link HanziCharacter} template string tag.
 */
export const 汉字 = (strings: TemplateStringsArray): HanziCharacter => {
  invariant(strings.length === 1, `汉字 must be a single string`);
  const string = nonNullable(strings[0]) as HanziText;
  invariant(
    isHanziCharacter(string),
    `汉字 must be given a single Hanzi character`,
  );
  return string;
};

/**
 * {@link HanziText} template string tag.
 */
export const 汉 = (strings: TemplateStringsArray): HanziText => {
  invariant(strings.length === 1, `汉 must be a single string`);
  return nonNullable(strings[0]) as HanziText;
};

/**
 * {@link PinyinText} template string tag.
 *
 * 拼音 means pinyin in Chinese.
 */
export const 拼音 = (strings: TemplateStringsArray) => strings[0] as PinyinText;

export function prettyQueue(
  queue: Pick<DeepReadonly<SkillReviewQueue>, `items`>,
): string[] {
  return queue.items.map((item) => skillQueueItemPretty(item));
}

export function skillQueueItemPretty(item: SkillReviewQueueItem): string {
  let pretty = `${item.skill}`;

  switch (item.flag?.kind) {
    case QuestionFlagKind.Blocked: {
      pretty = `${pretty} (🟥 BLOCKED)`;
      break;
    }
    case QuestionFlagKind.OtherAnswer: {
      const past =
        item.flag.previousHanziWords == null
          ? ``
          : ` past ${item.flag.previousHanziWords.join(`,`)}`;
      pretty = `${pretty} (🔀 OTHER ANSWER${past})`;
      break;
    }
    case QuestionFlagKind.Overdue: {
      pretty = `${pretty} (😡 OVERDUE)`;
      break;
    }
    case QuestionFlagKind.NewDifficulty: {
      pretty = `${pretty} (📈 NEW DIFFICULTY)`;
      break;
    }
    case QuestionFlagKind.NewSkill: {
      pretty = `${pretty} (🌱 NEW SKILL)`;
      break;
    }
    case QuestionFlagKind.Retry: {
      pretty = `${pretty} (⚠️ RETRY)`;
      break;
    }
    case QuestionFlagKind.WeakWord: {
      pretty = `${pretty} (😰 WEAK WORD)`;
      break;
    }
    case undefined: {
      break;
    }
  }

  return pretty;
}

export type HistoryCommand =
  | `${`🟢` | `🟡` | `🟠` | `❌`} ${Skill}`
  | `❌hanziGloss ${string} ${string}`
  | `❌hanziPinyin ${string} ${string}`
  | `💤 ${string}`;

export type HistoryEventSleep = {
  kind: `sleep`;
  duration: Duration;
};

export type HistoryEventSkillReview = {
  kind: `skillReview`;
  skill: Skill;
  rating: Rating;
  mistake?: MistakeType;
};

export type HistoryEventHanziGlossMistake = {
  kind: `hanziGlossMistake`;
  mistake: HanziGlossMistakeType;
};

export type HistoryEventHanziPinyinMistake = {
  kind: `hanziPinyinMistake`;
  mistake: HanziPinyinMistakeType;
};

export type HistoryEvent =
  | HistoryEventSleep
  | HistoryEventSkillReview
  | HistoryEventHanziGlossMistake
  | HistoryEventHanziPinyinMistake;

export function parseHistoryCommand(
  historyCommand: HistoryCommand,
): HistoryEvent[] {
  const events: HistoryEvent[] = [];

  const [op, opArgs] = splitN(historyCommand, ` `, 1);
  invariant(op != null);

  switch (op) {
    // jump forward in time
    case `💤`: {
      events.push({
        kind: `sleep`,
        duration: parseDurationShorthand(opArgs!),
      });
      break;
    }
    // mistakes
    case `❌hanziGloss`: {
      const [hanzi, gloss] = splitN(opArgs!, ` `, 1) as [HanziText, string];
      events.push({
        kind: `hanziGlossMistake`,
        mistake: {
          kind: MistakeKind.HanziGloss,
          hanziOrHanziWord: hanzi,
          gloss,
        },
      });
      break;
    }
    case `❌hanziPinyin`: {
      const [hanzi, pinyin] = splitN(opArgs!, ` `, 1) as [
        HanziText,
        PinyinText,
      ];
      events.push({
        kind: `hanziPinyinMistake`,
        mistake: {
          kind: MistakeKind.HanziPinyin,
          hanziOrHanziWord: hanzi,
          pinyin,
        },
      });
      break;
    }
    // skill reviews
    case `❌`:
    case `🟢`:
    case `🟡`:
    case `🟠`: {
      const rating = emojiToRating(op);

      // oxlint-disable-next-line eslint(prefer-const)
      let [skill, skillArgs] = splitN(opArgs!, ` `, 1) as [Skill, string?];
      const event: HistoryEventSkillReview = {
        kind: `skillReview`,
        skill,
        rating,
      };

      if (skillArgs != null) {
        const skillKind = skillKindFromSkill(skill);
        switch (skillKind) {
          case SkillKind.HanziWordToGloss:
          case SkillKind.HanziWordToGlossTyped: {
            skill = skill as HanziWordSkill;
            // `❌ he:刀:knife (刀→legs)`,
            const match = /^\((?:(.+)→)?(.+)\)$/.exec(skillArgs);
            invariant(match != null, `invalid mistake format ${skillArgs}`);
            const gloss = nonNullable(match[2], `gloss match missing`);
            const hanziOrHanziWord =
              match[1] == null
                ? // (legs)
                  hanziWordFromSkill(skill)
                : // (刀→legs)
                  // (刀:strength→legs)
                  (match[1] as HanziWord | HanziText);

            event.mistake = {
              kind: MistakeKind.HanziGloss,
              hanziOrHanziWord,
              gloss,
            };
            break;
          }
          case SkillKind.HanziWordToPinyinTyped:
          case SkillKind.HanziWordToPinyinFinal:
          case SkillKind.HanziWordToPinyinInitial:
          case SkillKind.HanziWordToPinyinTone: {
            skill = skill as HanziWordSkill;
            // `❌ he:刀:knife (刀→legs)`,
            const match = /^\((?:(.+)→)?(.+?)\)$/.exec(skillArgs);
            invariant(match != null, `invalid mistake format ${skillArgs}`);
            const pinyin = match[2] as PinyinText;
            const hanziOrHanziWord =
              match[1] == null
                ? // (pǐ)
                  hanziWordFromSkill(skill)
                : // (刀→pǐ)
                  // (刀:strength→pǐ)
                  (match[1] as HanziWord | HanziText);

            event.mistake = {
              kind: MistakeKind.HanziPinyin,
              hanziOrHanziWord,
              pinyin,
            };
            break;
          }
          case SkillKind.GlossToHanziWord:
          case SkillKind.PinyinToHanziWord:
          case SkillKind.ImageToHanziWord:
          case SkillKind.PinyinInitialAssociation:
          case SkillKind.PinyinFinalAssociation:
          case SkillKind.Deprecated:
          case SkillKind.Deprecated_RadicalToEnglish:
          case SkillKind.Deprecated_EnglishToRadical:
          case SkillKind.Deprecated_RadicalToPinyin:
          case SkillKind.Deprecated_PinyinToRadical: {
            throw new Error(
              `unsupported skill kind (${skillKind}) for mistake: ${skill}`,
            );
          }
          default: {
            throw new UnexpectedValueError(skillKind);
          }
        }
      }

      events.push(event);
      break;
    }
    default: {
      throw new Error(`Invalid operation: ${op}`);
    }
  }

  return events;
}

export async function seedSkillReviews(
  rizzle: Rizzle,
  /**
   * e.g.
   *
   *   [
   *    `❌ he:𠃌:radical`,
   *    `💤 5s`,
   *    `🟡 he:𠃌:radical`,
   *    `💤 5s`,
   *    `🟡 he:刀:knife`,
   *    `💤 5s`,
   *    `🟡 he:八:eight`,
   *    `💤 5s`,
   *    `🟡 he:分:divide`,
   *    `💤 5s`,
   *    `🟡 he:丿:slash`,
   *   ]
   */
  history: HistoryCommand[],
) {
  invariant(
    vi.isFakeTimers(),
    `seedSkillReviews requires fake timers` satisfies HasNameOf<
      typeof seedSkillReviews
    >,
  );

  const historyEvents = history.flatMap((command) =>
    parseHistoryCommand(command),
  );

  let reviewId = nanoid();
  for (const event of historyEvents) {
    switch (event.kind) {
      case `sleep`: {
        vi.setSystemTime(add(new Date(), event.duration));
        // Changing the time implies a new review.
        reviewId = nanoid();
        break;
      }
      case `skillReview`: {
        const now = new Date();
        await rizzle.mutate.rateSkill({
          id: nanoid(),
          skill: event.skill,
          rating: event.rating,
          now: new Date(),
          durationMs: null,
          reviewId,
        });
        if (event.mistake) {
          switch (event.mistake.kind) {
            case MistakeKind.HanziPinyinInitial: {
              throw new Error(`not implemented`);
            }
            case MistakeKind.HanziGloss: {
              await rizzle.mutate.saveHanziGlossMistake({
                id: nanoid(),
                hanziOrHanziWord: event.mistake.hanziOrHanziWord,
                gloss: event.mistake.gloss,
                now,
                reviewId,
              });
              break;
            }
            case MistakeKind.HanziPinyin: {
              await rizzle.mutate.saveHanziPinyinMistake({
                id: nanoid(),
                hanziOrHanziWord: event.mistake.hanziOrHanziWord,
                pinyin: event.mistake.pinyin,
                now,
                reviewId,
              });
              break;
            }
          }
        }
        break;
      }

      case `hanziGlossMistake`: {
        await rizzle.mutate.saveHanziGlossMistake({
          id: nanoid(),
          hanziOrHanziWord: event.mistake.hanziOrHanziWord,
          gloss: event.mistake.gloss,
          now: new Date(),
          reviewId,
        });
        break;
      }
      case `hanziPinyinMistake`: {
        await rizzle.mutate.saveHanziPinyinMistake({
          id: nanoid(),
          hanziOrHanziWord: event.mistake.hanziOrHanziWord,
          pinyin: event.mistake.pinyin,
          now: new Date(),
          reviewId,
        });
        break;
      }
    }
  }
}

export type ExampleHanziCandidateType = {
  hanzi: HanziCharacter;
  usageCount: number;
  totalUsageCount: number;
  usageShare: number;
  characterFrequency: number;
};

type PinyinUsageIndexType = {
  byHanzi: ReadonlyMap<HanziCharacter, ReadonlyMap<PinyinUnit, number>>;
  byPinyinUnit: ReadonlyMap<PinyinUnit, ReadonlyMap<HanziCharacter, number>>;
};

const ensureHanziJsStarted = memoize0(() => {
  const spy = vi.spyOn(console, `log`).mockImplementation(() => {});
  hanzijs.start();
  spy.mockRestore();
});

const getKnownPinyinUnitSet = memoize0(() => {
  return new Set<PinyinUnit>(getPinyinUnits());
});

function getHanziCharacterFrequency(hanzi: HanziCharacter): number {
  ensureHanziJsStarted();
  const freq = hanzijs.getCharacterFrequency(hanzi);
  return typeof freq === `string` ? 0 : Number(freq.count);
}

export function rankExampleHanziCandidates(
  pinyinUnit: PinyinUnit,
  usageIndex: PinyinUsageIndexType,
): readonly ExampleHanziCandidateType[] {
  const candidates = new Map<HanziCharacter, ExampleHanziCandidateType>();
  const counts = usageIndex.byPinyinUnit.get(pinyinUnit);
  if (counts == null) {
    return [];
  }

  for (const [hanzi, usageCount] of counts) {
    if (exampleHanziToSkip.has(hanzi)) {
      continue;
    }

    if (isBadPair(pinyinUnit, hanzi)) {
      continue;
    }

    const totalUsageCount = getTotalPinyinUsageCountForHanzi(usageIndex, hanzi);

    candidates.set(hanzi, {
      hanzi,
      usageCount,
      totalUsageCount,
      usageShare: usageCount / totalUsageCount,
      characterFrequency: getHanziCharacterFrequency(hanzi),
    });
  }

  return [...candidates.values()].toSorted((a, b) => {
    return (
      b.usageShare - a.usageShare ||
      b.usageCount - a.usageCount ||
      b.characterFrequency - a.characterFrequency ||
      a.hanzi.localeCompare(b.hanzi)
    );
  });
}

const getHanziJsPinyinUsageCounts = memoize0(() => {
  ensureHanziJsStarted();

  const entrySimplifiedToSkip = new Set([
    `傻Ｂ`,
    `卡拉ＯＫ`,
    `牛Ｂ`,
    `美国５１区`,
    `装Ｂ`,
    `Ａ咖`,
    `Ａ片`,
    `ＡＡ制`,
    `ＤＮＡ亲子鉴定`,
    `ＤＮＡ鉴定`,
    `ｅ仔`,
  ]);

  const usageIndex = createPinyinUsageIndex();
  for (const [key, entries] of Object.entries(hanzijs.dictionarysimplified)) {
    for (const entry of entries) {
      // Skip bad entries that mix non-Hanzi characters or have other issues.
      if (entrySimplifiedToSkip.has(entry.simplified)) {
        continue;
      }
      // Unknown pinyin marker
      if (entry.pinyin.startsWith(`xx`)) {
        continue;
      }

      const hanziCharacters = matchAllHanziCharacters(
        entry.simplified as HanziText,
      );
      const pinyinUnits = matchAllPinyinUnits(entry.pinyin).map((p) =>
        normalizePinyinUnit(p),
      );

      if (hanziCharacters.length !== pinyinUnits.length) {
        console.warn(
          `Mismatch in lengths for key ${key}: ${hanziCharacters.length} hanzi characters vs ${pinyinUnits.length} pinyin units`,
        );
        continue;
      }

      for (let i = 0; i < hanziCharacters.length; i++) {
        const hanziCharacter = nonNullable(hanziCharacters[i]);
        const pinyinUnit = nonNullable(pinyinUnits[i]);

        incrementPinyinUsageCount(usageIndex, pinyinUnit, hanziCharacter);
      }
    }
  }

  return usageIndex;
});

const getDictionaryPinyinUsageCounts = memoize0(async () => {
  const dictionary = await loadDictionary();
  const usageIndex = createPinyinUsageIndex();

  for (const [hanziWord, meaning] of dictionary.allEntries) {
    if (meaning.pinyin == null) {
      continue;
    }

    const hanziCharacters = splitHanziText(hanziFromHanziWord(hanziWord));

    for (const pinyin of meaning.pinyin) {
      const pinyinUnits = matchAllPinyinUnits(pinyin).map((unit) =>
        normalizePinyinUnit(unit),
      );

      invariant(
        hanziCharacters.length === pinyinUnits.length,
        `expected same number of hanzi characters as pinyin units: "%o" / "%o"`,
        hanziWord,
        pinyin,
      );

      for (let i = 0; i < pinyinUnits.length; i++) {
        const hanziCharacter = nonNullable(hanziCharacters[i]);
        const pinyinUnit = nonNullable(pinyinUnits[i]);

        incrementPinyinUsageCount(usageIndex, pinyinUnit, hanziCharacter);
      }
    }
  }

  return usageIndex;
});

const getMergedPinyinUsageCounts = memoize0(async () => {
  const usageIndex = createPinyinUsageIndex();
  mergePinyinUsageIndex(usageIndex, getHanziJsPinyinUsageCounts());
  mergePinyinUsageIndex(usageIndex, await getDictionaryPinyinUsageCounts());
  return usageIndex;
});

const getHanziBestPinyinUsageCounts = memoize0(async () => {
  return buildHanziBestPinyinUsageIndex(await getMergedPinyinUsageCounts());
});

function buildHanziBestPinyinUsageIndex(usageIndex: PinyinUsageIndexType): {
  byHanzi: Map<HanziCharacter, Map<PinyinUnit, number>>;
  byPinyinUnit: Map<PinyinUnit, Map<HanziCharacter, number>>;
} {
  const bestPinyinUsageIndex = createPinyinUsageIndex();

  for (const [hanzi, pinyinCounts] of usageIndex.byHanzi) {
    if (exampleHanziToSkip.has(hanzi)) {
      continue;
    }

    const bestPinyin = pickBestPinyinForHanzi(hanzi, pinyinCounts);
    if (bestPinyin == null) {
      continue;
    }

    incrementPinyinUsageCount(
      bestPinyinUsageIndex,
      bestPinyin.pinyinUnit,
      hanzi,
      bestPinyin.usageCount,
    );
  }

  return bestPinyinUsageIndex;
}

function pickBestPinyinForHanzi(
  hanzi: HanziCharacter,
  pinyinCounts: ReadonlyMap<PinyinUnit, number>,
): { pinyinUnit: PinyinUnit; usageCount: number } | null {
  const knownPinyinUnits = getKnownPinyinUnitSet();
  const totalUsageCount = [...pinyinCounts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );

  if (totalUsageCount === 0) {
    return null;
  }

  const rankedPinyinUnits = [...pinyinCounts.entries()]
    .filter(
      ([pinyinUnit]) =>
        knownPinyinUnits.has(pinyinUnit) && !isBadPair(pinyinUnit, hanzi),
    )
    .map(([pinyinUnit, usageCount]) => ({
      pinyinUnit,
      usageCount,
      usageShare: usageCount / totalUsageCount,
    }))
    .toSorted((a, b) => {
      return (
        b.usageShare - a.usageShare ||
        b.usageCount - a.usageCount ||
        a.pinyinUnit.localeCompare(b.pinyinUnit)
      );
    });

  const best = rankedPinyinUnits[0];
  if (best == null) {
    return null;
  }

  return {
    pinyinUnit: best.pinyinUnit,
    usageCount: best.usageCount,
  };
}

function createPinyinUsageIndex(): {
  byHanzi: Map<HanziCharacter, Map<PinyinUnit, number>>;
  byPinyinUnit: Map<PinyinUnit, Map<HanziCharacter, number>>;
} {
  return {
    byHanzi: new Map<HanziCharacter, Map<PinyinUnit, number>>(),
    byPinyinUnit: new Map<PinyinUnit, Map<HanziCharacter, number>>(),
  };
}

function incrementPinyinUsageCount(
  usageIndex: {
    byHanzi: Map<HanziCharacter, Map<PinyinUnit, number>>;
    byPinyinUnit: Map<PinyinUnit, Map<HanziCharacter, number>>;
  },
  pinyinUnit: PinyinUnit,
  hanziCharacter: HanziCharacter,
  amount = 1,
): void {
  incrementNestedCount(
    usageIndex.byPinyinUnit,
    pinyinUnit,
    hanziCharacter,
    amount,
  );
  incrementNestedCount(usageIndex.byHanzi, hanziCharacter, pinyinUnit, amount);
}

function incrementNestedCount<TKey1, TKey2>(
  map: Map<TKey1, Map<TKey2, number>>,
  key1: TKey1,
  key2: TKey2,
  amount = 1,
): void {
  let counts = map.get(key1);
  if (counts == null) {
    counts = new Map<TKey2, number>();
    map.set(key1, counts);
  }

  counts.set(key2, (counts.get(key2) ?? 0) + amount);
}

function mergePinyinUsageIndex(
  into: {
    byHanzi: Map<HanziCharacter, Map<PinyinUnit, number>>;
    byPinyinUnit: Map<PinyinUnit, Map<HanziCharacter, number>>;
  },
  from: PinyinUsageIndexType,
): void {
  for (const [hanziCharacter, pinyinCounts] of from.byHanzi) {
    for (const [pinyinUnit, count] of pinyinCounts) {
      incrementPinyinUsageCount(into, pinyinUnit, hanziCharacter, count);
    }
  }
}

function getTotalPinyinUsageCountForHanzi(
  usageIndex: PinyinUsageIndexType,
  hanzi: HanziCharacter,
): number {
  return [...(usageIndex.byHanzi.get(hanzi)?.values() ?? [])].reduce(
    (sum, count) => sum + count,
    0,
  );
}

const exampleHanziToSkip = new Set(`彳 屮 啊`.split(` `));

const badPairs = new Set<string>([
  `zǎng 驵`,
  `shǎi 色`,
  `rǒu 肉`,
  `rèng 芿`,
  `rāng 嚷`,
  `nè 疒`,
  `ǒ 嚄`,
  `ó 哦`,
  `dū 都`,
  `hè 和`,
  `lěi 累`,
  `lēi 勒`,
  `lóu 楼`,
  `běng 埲`,
  `án 啽`,
  `cēn 嵾`,
  `chuì 龡`,
  `cǔ 皻`,
  `cuán 攒`,
  `gá 噶`,
  `hāi 嗨`,
  `huī 灰`,
  `liǎo 了`,
  `liāo 蹽`,
  `lòng 衖`,
  `hāi 咍`,
  `lòng 哢`,
  `kuǎng 夼`,
  `liǎo 蓼`,
  `nín 您`,
  `nún 黁`,
  `qiǎ 峠`,
  `qǐn 寝`,
  `rún 瞤`,
  `qǐn 笉`,
  `tiè 呫`,
]);

function isBadPair(pinyinUnit: PinyinUnit, hanzi: HanziCharacter): boolean {
  const pair = `${pinyinUnit} ${hanzi}`;
  return badPairs.has(pair);
}

export function getPinyinUnits(): readonly PinyinUnit[] {
  const chart = loadPylyPinyinChart();
  const allPinyinUnits: PinyinUnit[] = [];
  for (const unit of chart.units) {
    for (let i = 1; i <= 4; i++) {
      allPinyinUnits.push(normalizePinyinUnit(`${unit}${i}`));
    }
  }
  return allPinyinUnits;
}

export async function pickExampleHanziForPinyinUnit(
  pinyinUnit: PinyinUnit,
): Promise<HanziCharacter | null> {
  const usageIndex = await getHanziBestPinyinUsageCounts();

  return rankExampleHanziCandidates(pinyinUnit, usageIndex)[0]?.hanzi ?? null;
}

export async function getPinyinUnitToHanziCharacter(): Promise<
  ReadonlyMap<PinyinUnit, HanziCharacter>
> {
  const allPinyinUnits = getPinyinUnits();
  const pinyinUnitToHanzi = new Map<PinyinUnit, HanziCharacter>();

  for (const pinyinUnit of allPinyinUnits) {
    const hanzi = await pickExampleHanziForPinyinUnit(pinyinUnit);
    if (hanzi != null) {
      pinyinUnitToHanzi.set(pinyinUnit, hanzi);
    }
  }

  return pinyinUnitToHanzi;
}

export async function getHanziCharacterToPinyinUnit(): Promise<
  ReadonlyMap<HanziCharacter, PinyinUnit>
> {
  const pinyinUnitToHanzi = await getPinyinUnitToHanziCharacter();
  const hanziToPinyinUnit = new Map<HanziCharacter, PinyinUnit>();

  for (const [pinyinUnit, hanzi] of pinyinUnitToHanzi) {
    if (hanziToPinyinUnit.has(hanzi)) {
      continue;
    }

    hanziToPinyinUnit.set(hanzi, pinyinUnit);
  }

  return hanziToPinyinUnit;
}
