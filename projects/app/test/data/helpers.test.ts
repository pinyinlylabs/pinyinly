// pyly-not-src-test

import { fsrsIsStable, Rating } from "#util/fsrs.ts";
import assert from "node:assert/strict";
import { describe, expect, test, vi } from "vitest";
import { date, fsrsSrsState, parseRelativeTimeShorthand, 时 } from "./helpers";

describe(`${parseRelativeTimeShorthand.name} suite`, () => {
  test(`assumes positive without a sign`, () => {
    assert.deepEqual(
      parseRelativeTimeShorthand(`1s`, new Date(0)),
      new Date(1000),
    );
  });

  test(`supports negative durations`, () => {
    const now = new Date();
    assert.deepEqual(
      parseRelativeTimeShorthand(`-5m`, now),
      new Date(now.getTime() - 5 * 60 * 1000),
    );
  });

  test(`supports positive durations`, () => {
    const now = new Date();
    assert.deepEqual(
      parseRelativeTimeShorthand(`+5m`, now),
      new Date(now.getTime() + 5 * 60 * 1000),
    );
  });
});

describe(`${date.name} suite`, () => {
  test(`parses values`, () => {
    vi.useFakeTimers({
      toFake: [`Date`],
      now: new Date(`2025-01-01T00:00:00Z`),
    });

    expect(date`+1d`).toEqual(parseRelativeTimeShorthand(`+1d`));
    expect(date`+1m`).toEqual(parseRelativeTimeShorthand(`+1m`));
  });
});

describe(`${fsrsSrsState.name} suite`, () => {
  test(`with Hard rating fails "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Hard);
    assert.equal(fsrsIsStable(state), false);
  });

  test(`with Good rating passes "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Good);
    assert.equal(fsrsIsStable(state), true);
  });

  test(`with Easy rating passes "is stable" check`, () => {
    const state = fsrsSrsState(时`-1d`, 时`+1d`, Rating.Easy);
    assert.equal(fsrsIsStable(state), true);
  });
});
