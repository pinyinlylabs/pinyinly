import { identicalInvariant, invariant, uniqueInvariant } from "#invariant.ts";
import { describe, expect, test } from "vitest";

describe(`invariant suite` satisfies HasNameOf<typeof invariant>, () => {
  test(`does not throw when true`, () => {
    expect(() => {
      invariant(Math.random() > -1);
    }).not.toThrow();
  });

  test(`throws when false`, () => {
    expect(() => {
      invariant(false);
    }).toThrow();
  });
});

describe(
  `uniqueInvariant suite` satisfies HasNameOf<typeof uniqueInvariant>,
  () => {
    test(`does not throw when every item is different`, () => {
      expect(() => {
        uniqueInvariant([1, 2, 3]);
      }).not.toThrow();
    });

    test(`throws when there are duplicate items`, () => {
      expect(() => {
        uniqueInvariant([1, 2, 1]);
      }).toThrow();
    });
  },
);

describe(
  `identicalInvariant suite` satisfies HasNameOf<typeof identicalInvariant>,
  () => {
    test(`does not throw when every item is the same`, () => {
      expect(() => {
        identicalInvariant([1, 1, 1]);
      }).not.toThrow();
    });

    test(`throws when there are different items`, () => {
      expect(() => {
        identicalInvariant([1, 2, 1]);
      }).toThrow();
    });
  },
);
