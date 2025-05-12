import type { SrsStateFsrsFourPointFive, SrsStateMock } from "#data/model.ts";
import { SrsType } from "#data/model.ts";
import type { Rating } from "#util/fsrs.ts";
import { nextReview } from "#util/fsrs.ts";
import { invariant } from "@haohaohow/lib/invariant";
import type { TestContext } from "node:test";
import type { ReadTransaction, WriteTransaction } from "replicache";

export function makeMockTx(t: TestContext) {
  const readTx = {
    get: t.mock.fn<ReadTransaction[`get`]>(async () => undefined),
    scan: t.mock.fn<ReadTransaction[`scan`]>(() => {
      return null as never;
    }),
    clientID: null as never,
    environment: null as never,
    location: null as never,
    has: null as never,
    isEmpty: null as never,
  } satisfies ReadTransaction;

  const writeTx = {
    ...readTx,
    set: t.mock.fn<WriteTransaction[`set`]>(async () => undefined),
    mutationID: null as never,
    reason: null as never,
    put: null as never,
    del: null as never,
  } satisfies WriteTransaction;

  return {
    ...writeTx,
    readonly: readTx,
    [Symbol.dispose]: () => {
      writeTx.get.mock.resetCalls();
      writeTx.set.mock.resetCalls();
      writeTx.scan.mock.resetCalls();
    },
  };
}

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
): SrsStateMock => {
  return {
    type: SrsType.Mock,
    prevReviewAt,
    nextReviewAt,
  };
};

export const fsrsSrsState = (
  prevReviewAtShorthand: string,
  nextReviewAtShorthand: string,
  rating: Rating,
): SrsStateFsrsFourPointFive => {
  let state = null;
  for (const now of [`-20d`, `-15d`, `-10d`, `-5d`, `-2d`]) {
    state = nextReview(state, rating, parseRelativeTimeShorthand(now));
  }
  invariant(state != null);

  return {
    type: SrsType.FsrsFourPointFive,
    prevReviewAt: parseRelativeTimeShorthand(prevReviewAtShorthand),
    nextReviewAt: parseRelativeTimeShorthand(nextReviewAtShorthand),
    stability: state.stability,
    difficulty: state.difficulty,
  };
};
