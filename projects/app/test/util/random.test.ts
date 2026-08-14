import { makePRNG } from "#util/random.ts";
import { describe, expect, test } from "vitest";

describe(`makePRNG suite`, async () => {
  test(`returns different numbers for seeds that differ by fractional amount`, () => {
    const bases = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
    const diffs = [
      0.1, 0.01, 0.001, 0.0001, 0.00001, 0.000001, 0.0000001, 0.00000001,
      0.000000001,
    ];
    for (const base of bases) {
      for (const diff of diffs) {
        const prng1 = makePRNG(base);
        const prng2 = makePRNG(base + diff);
        for (let trial = 0; trial < 10; trial++) {
          const error = `different seeds produce same numbers at trial #${trial} (${JSON.stringify({ base, diff })}`;

          expect({
            prng: prng1(),
            error,
          }).not.toEqual({
            prng: prng2(),
            error,
          });
        }
      }
    }
  });
});
