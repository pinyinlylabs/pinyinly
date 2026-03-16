import { isHanziCharacter, splitHanziText } from "#data/hanzi.ts";
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
import { loadDictionary } from "#dictionary.js";
import { emojiToRating } from "#test/helpers.ts";
import type { Rating } from "#util/fsrs.ts";
import { nextReview } from "#util/fsrs.ts";
import { nanoid } from "#util/nanoid.js";
import { splitN } from "#util/unicode.js";
import {
  inverseSortComparator,
  mapSetAdd,
  memoize0,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
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

export function getBestHanziCharacterForPinyinUnit(
  pinyinUnit: PinyinUnit,
): HanziCharacter | null {
  const hanziJsLookup = getHanziJsLookup();

  for (const [hanzi] of hanziJsLookup.get(pinyinUnit) ?? []) {
    if (exampleHanziToSkip.has(hanzi)) {
      continue;
    }

    if (isBadPair(pinyinUnit, hanzi)) {
      continue;
    }

    return hanzi;
  }

  return null;
}

const getHanziJsLookup = memoize0(() => {
  hanzijs.start();

  const map = new Map<PinyinUnit, Set<HanziCharacter>>();
  for (const [key, entries] of Object.entries(hanzijs.dictionarysimplified)) {
    for (const entry of entries) {
      const hanziCharacters = splitHanziText(entry.simplified as HanziText);
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

        mapSetAdd(map, pinyinUnit, hanziCharacter);
      }
    }
  }

  const withCounts = new Map<
    PinyinUnit,
    ReadonlyArray<readonly [hanzi: HanziCharacter, count: number]>
  >(
    [...map].map(([pinyinUnit, hanziSet]) => [
      pinyinUnit,
      [...hanziSet]
        .map((h) => {
          const freq = hanzijs.getCharacterFrequency(h);
          const count = typeof freq === `string` ? 0 : Number(freq.count);

          return [h, count] as const;
        })
        .toSorted(
          inverseSortComparator(sortComparatorNumber(([, count]) => count)),
        ),
    ]),
  );

  return withCounts;
});

const exampleHanziToSkip = new Set(`彳 屮 啊`.split(` `));

const badPairs = new Set([
  `chán 单`,
  `là 落`,
  `zǎng 驵`,
  `zèng 综`,
  `zhāi 侧`,
  `zòng 从`,
  `tóu 亠`,
  `shǎi 色`,
  `rǒu 肉`,
  `rèng 芿`,
  `rōng 茸`,
  `rāng 嚷`,
  `ōu 区`,
  `òu 呕`,
  `nè 疒`,
  `fà 发`,
  `lěi 累`,
  `lóu 楼`,
  `èn 嗯`,
  `chòng 冲`,
  `cào 草`,
  `cī 差`,
  `ē 阿`,
  `ǒ 嚄`,
  `ó 哦`,
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

async function pickExampleHanziForPinyinUnit(
  pinyinUnit: PinyinUnit,
): Promise<HanziCharacter | null> {
  // Use hanzijs data first:

  const fromHanzijs = getBestHanziCharacterForPinyinUnit(pinyinUnit);
  if (fromHanzijs != null) {
    return fromHanzijs;
  }

  // Then fallback to pinyinly dictionary data:

  const dictionary = await loadDictionary();

  const hanziCharacters = dictionary.lookupPinyinUnit(pinyinUnit);

  for (const candidate of hanziCharacters) {
    if (exampleHanziToSkip.has(candidate)) {
      continue;
    }
    if (isBadPair(pinyinUnit, candidate)) {
      continue;
    }

    return candidate;
  }

  return null;
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
