import { fsrsIsStable, Rating } from "#util/fsrs.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { fsrsSrsState, parseRelativeTimeShorthand } from "./helpers";

await test(`${parseRelativeTimeShorthand.name} suite`, async (t) => {
  await t.test(`assumes positive without a sign`, () => {
    assert.deepEqual(
      parseRelativeTimeShorthand(`1s`, new Date(0)),
      new Date(1000),
    );
  });

  await t.test(`supports negative durations`, () => {
    const now = new Date();
    assert.deepEqual(
      parseRelativeTimeShorthand(`-5m`, now),
      new Date(now.getTime() - 5 * 60 * 1000),
    );
  });

  await t.test(`supports positive durations`, () => {
    const now = new Date();
    assert.deepEqual(
      parseRelativeTimeShorthand(`+5m`, now),
      new Date(now.getTime() + 5 * 60 * 1000),
    );
  });
});

await test(`${fsrsSrsState.name} suite`, async () => {
  await test(`with Hard rating fails "is stable" check`, () => {
    const state = fsrsSrsState(`-1d`, `+1d`, Rating.Hard);
    assert.equal(fsrsIsStable(state), false);
  });

  await test(`with Good rating passes "is stable" check`, () => {
    const state = fsrsSrsState(`-1d`, `+1d`, Rating.Good);
    assert.equal(fsrsIsStable(state), true);
  });

  await test(`with Easy rating passes "is stable" check`, () => {
    const state = fsrsSrsState(`-1d`, `+1d`, Rating.Easy);
    assert.equal(fsrsIsStable(state), true);
  });
});
