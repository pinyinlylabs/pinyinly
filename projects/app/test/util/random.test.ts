import { makePRNG } from "#util/random.ts";
import assert from "node:assert/strict";
import { describe, test } from "vitest";

describe(`makePRNG suite` satisfies HasNameOf<typeof makePRNG>, async () => {
  test(`returns different numbers for seeds that differ by fractional amount`, () => {
    const bases = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const diffs = [
      0.1, 0.01, 0.001, 0.0001, 0.000_01, 0.000_001, 0.000_000_1, 0.000_000_01,
      0.000_000_001,
    ];
    for (const base of bases) {
      for (const diff of diffs) {
        const prng1 = makePRNG(base);
        const prng2 = makePRNG(base + diff);
        for (let trial = 0; trial < 10; trial++) {
          assert.notEqual(
            prng1(),
            prng2(),
            `different seeds produce same numbers at trial #${trial} (${JSON.stringify({ base, diff })}`,
          );
        }
      }
    }
  });
});
