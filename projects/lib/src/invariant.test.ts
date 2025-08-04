import assert from "node:assert/strict";
import test from "node:test";
import { identicalInvariant, invariant, uniqueInvariant } from "./invariant.js";

await test(
  `invariant suite` satisfies HasNameOf<typeof invariant>,
  async () => {
    await test(`does not throw when true`, () => {
      invariant(1 == 1);
    });

    await test(`throws when false`, () => {
      assert.throws(() => {
        invariant(false);
      });
    });
  },
);

await test(
  `uniqueInvariant suite` satisfies HasNameOf<typeof uniqueInvariant>,
  async () => {
    await test(`does not throw when every item is different`, () => {
      uniqueInvariant([1, 2, 3]);
    });

    await test(`throws when there are duplicate items`, () => {
      assert.throws(() => {
        uniqueInvariant([1, 2, 1]);
      });
    });
  },
);

await test(
  `identicalInvariant suite` satisfies HasNameOf<typeof identicalInvariant>,
  async () => {
    await test(`does not throw when every item is the same`, () => {
      identicalInvariant([1, 1, 1]);
    });

    await test(`throws when there are different items`, () => {
      assert.throws(() => {
        identicalInvariant([1, 2, 1]);
      });
    });
  },
);
