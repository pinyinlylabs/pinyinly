// pyly-not-src-test

import { fsrsIsStable, Rating } from "#util/fsrs.ts";
import { describe, expect, test, vi } from "vitest";
import {
  date,
  fsrsSrsState,
  parseRelativeTimeShorthand,
  时,
} from "./helpers.ts";

describe(
  `parseRelativeTimeShorthand suite` satisfies HasNameOf<
    typeof parseRelativeTimeShorthand
  >,
  () => {
    test(`assumes positive without a sign`, () => {
      expect(parseRelativeTimeShorthand(`1s`, new Date(0))).toEqual(
        new Date(1000),
      );
    });

    test(`supports negative durations`, () => {
      const now = new Date();
      expect(parseRelativeTimeShorthand(`-5m`, now)).toEqual(
        new Date(now.getTime() - 5 * 60 * 1000),
      );
    });

    test(`supports positive durations`, () => {
      const now = new Date();
      expect(parseRelativeTimeShorthand(`+5m`, now)).toEqual(
        new Date(now.getTime() + 5 * 60 * 1000),
      );
    });
  },
);

describe(`date suite` satisfies HasNameOf<typeof date>, () => {
  test(`parses values`, () => {
    vi.useFakeTimers({
      toFake: [`Date`],
      now: new Date(`2025-01-01T00:00:00Z`),
    });

    expect(date`+1d`).toEqual(parseRelativeTimeShorthand(`+1d`));
    expect(date`+1m`).toEqual(parseRelativeTimeShorthand(`+1m`));
  });
});

describe(`fsrsSrsState suite` satisfies HasNameOf<typeof fsrsSrsState>, () => {
  test(`with Hard rating fails "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Hard);
    expect(fsrsIsStable(state)).toEqual(false);
  });

  test(`with Good rating passes "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Good);
    expect(fsrsIsStable(state)).toEqual(true);
  });

  test(`with Easy rating passes "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Easy);
    expect(fsrsIsStable(state)).toEqual(true);
  });
});
