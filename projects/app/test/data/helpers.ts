import { isHanziChar } from "#data/hanzi.ts";
import type {
  HanziChar,
  HanziText,
  PinyinSyllable,
  SrsStateFsrsFourPointFiveType,
  SrsStateMockType,
} from "#data/model.ts";
import { SrsKind } from "#data/model.ts";
import type { Rating } from "#util/fsrs.ts";
import { nextReview } from "#util/fsrs.ts";
import { invariant, nonNullable } from "@haohaohow/lib/invariant";

export const date = (strings: TemplateStringsArray): Date => {
  const shorthand = strings.reduce((acc, str) => acc + str, ``);
  return parseRelativeTimeShorthand(shorthand);
};

export const 时 = date;

/**
 * Convert a string like "+1d" or "-5s" to a date.
 */
export const parseRelativeTimeShorthand = (
  shorthand: string,
  now = new Date(),
): Date => {
  const parseResult = /^(-|\+?)(\d+)([smhd])$/.exec(shorthand);
  invariant(parseResult != null, `invalid shorthand ${shorthand}`);
  const [, sign, multiple, unit] = parseResult;
  const duration =
    (sign === `-` ? -1 : 1) *
    Number(multiple) *
    { s: 1, m: 60 * 1, h: 60 * 60, d: 60 * 60 * 24 }[unit!]!;
  return new Date(now.getTime() + duration * 1000);
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
 * Helper template string tag to make {@link HanziChar}.
 */
export const 汉字 = (strings: TemplateStringsArray): HanziChar => {
  invariant(strings.length === 1, `汉字 must be a single string`);
  const string = nonNullable(strings[0]) as HanziText;
  invariant(isHanziChar(string), `汉字 must be given a single Hanzi character`);
  return string;
};

/**
 * Helper template string tag to make {@link HanziText}.
 */
export const 汉 = (strings: TemplateStringsArray): HanziText => {
  invariant(strings.length === 1, `汉 must be a single string`);
  return nonNullable(strings[0]) as HanziText;
};

/**
 * Helper template string tag to make {@link PinyinSyllable}.
 *
 * 拼音 means syllable in Chinese, and since it's written using Chinese it's
 * inferred it's for Pinyin syllables.
 */
export const 拼音 = (strings: TemplateStringsArray) =>
  strings[0] as PinyinSyllable;
