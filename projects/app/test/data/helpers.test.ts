import assert from "node:assert/strict";
import test from "node:test";
import { parseRelativeTimeShorthand } from "./helpers";

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
