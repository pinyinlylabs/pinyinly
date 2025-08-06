import {
  deepTransform,
  makeRange,
  mapInvert,
  memoize1,
  merge,
  mergeSortComparators,
  objectInvert,
  objectMap,
  objectMapToArray,
  sortComparatorNumber,
  sortComparatorString,
} from "#collections.ts";
import type { IsEqual } from "#types.ts";
import assert from "node:assert/strict";
import { describe, expect, test } from "vitest";
import type z from "zod/v4";

function typeChecks<_T>(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

typeChecks(`type checks only`, () => {
  // @ts-expect-error without arguments it only works on string elements
  [`a`, `b`].sort(sortComparatorNumber());

  // @ts-expect-error without arguments it only works on string elements
  [1, 2].sort(sortComparatorString());
});

test(
  `sortComparatorString fixtures` satisfies HasNameOf<
    typeof sortComparatorString
  >,
  () => {
    {
      const arr = [`c`, `a`, `b`];
      arr.sort(sortComparatorString());
      assert.deepEqual(arr, [`a`, `b`, `c`]);
    }

    {
      const arr = [[`c`], [`a`], [`b`]];
      arr.sort(sortComparatorString(([x]) => x!));
      assert.deepEqual(arr, [[`a`], [`b`], [`c`]]);
    }
  },
);

test(
  `sortComparatorNumber suite` satisfies HasNameOf<typeof sortComparatorNumber>,
  () => {
    {
      const arr = [3, 1, 2];
      arr.sort(sortComparatorNumber());
      assert.deepEqual(arr, [1, 2, 3]);
    }

    {
      const arr = [[3], [1], [2]];
      arr.sort(sortComparatorNumber(([x]) => x!));
      assert.deepEqual(arr, [[1], [2], [3]]);
    }
  },
);

test(
  `mergeSortComparators suite` satisfies HasNameOf<typeof mergeSortComparators>,
  () => {
    const arr = [`金`, `现金`, `金`, `金牌`];
    arr.sort(
      mergeSortComparators(
        sortComparatorNumber((x) => x.length),
        sortComparatorString((x) => x),
      ),
    );
    assert.deepEqual(arr, [`金`, `金`, `现金`, `金牌`]);
  },
);

test(`merge suite` satisfies HasNameOf<typeof merge>, () => {
  assert.deepEqual(merge(null, null), null);
  assert.deepEqual(merge(null, 1), 1);
  assert.deepEqual(merge(1, null), 1);
  assert.deepEqual(merge([1], [2]), [1, 2]);
  assert.deepEqual(
    merge(new Map([[`key1`, `value1`]]), new Map([[`key2`, `value2`]])),
    new Map([
      [`key1`, `value1`],
      [`key2`, `value2`],
    ]),
  );
  assert.deepEqual(
    merge(
      new Map([[`key1`, new Map([[`key1.1`, `value1.1`]])]]),
      new Map([[`key1`, new Map([[`key2.1`, `value2.1`]])]]),
    ),
    new Map([
      [
        `key1`,
        new Map([
          [`key1.1`, `value1.1`],
          [`key2.1`, `value2.1`],
        ]),
      ],
    ]),
  );
});

test(`deepTransform suite` satisfies HasNameOf<typeof deepTransform>, () => {
  assert.deepEqual(
    deepTransform(null, (x) => x),
    null,
  );
  assert.deepEqual(
    deepTransform(new Map([[`key1`, `value1`]]), (x) =>
      x instanceof Map ? Object.fromEntries(x.entries()) : x,
    ),
    { key1: `value1` },
  );
});

test(`objectInvert fixtures` satisfies HasNameOf<typeof objectInvert>, () => {
  assert.deepEqual(objectInvert({}), {});
  assert.deepEqual(objectInvert({ a: 1, b: 2 }), { 1: `a`, 2: `b` });
});

test(`mapInvert fixtures` satisfies HasNameOf<typeof mapInvert>, () => {
  assert.deepEqual(mapInvert(new Map()), new Map());
  assert.deepEqual(
    mapInvert(
      new Map<string | number, string | number>([
        [1, 2],
        [`a`, `b`],
      ]),
    ),
    new Map<string | number, string | number>([
      [2, 1],
      [`b`, `a`],
    ]),
  );
});

describe(`makeRange suite` satisfies HasNameOf<typeof makeRange>, async () => {
  test(`ascending range`, () => {
    assert.deepEqual(makeRange(0, 0), [0]);
    assert.deepEqual(makeRange(0, 1), [0, 1]);
    assert.deepEqual(makeRange(1, 2), [1, 2]);
    assert.deepEqual(makeRange(1, 3), [1, 2, 3]);
  });

  test(`descending range`, () => {
    assert.deepEqual(makeRange(3, 1), [3, 2, 1]);
  });
});

describe(`objectMap suite` satisfies HasNameOf<typeof objectMap>, () => {
  test(`fixtures`, () => {
    assert.deepEqual(
      objectMap({ a: 1, b: 2 }, (key, value) => [`${key}${value}`, value * 2]),
      { a1: 2, b2: 4 },
    );

    assert.deepEqual(
      objectMap({ a: `x`, b: `y` }, (key, value) => [`${key}${value}`, value]),
      { ax: `x`, by: `y` },
    );
  });

  test(`regression: Partial<…>`, () => {
    const obj: Partial<{ a: string; b: string }> = { a: `x`, b: `y` };
    assert.deepEqual(
      objectMap(obj, (key, value) => [`${key}${value}`, value]),
      { ax: `x`, by: `y` },
    );
  });
});

test(
  `objectMapToArray suite` satisfies HasNameOf<typeof objectMapToArray>,
  () => {
    assert.deepEqual(
      objectMapToArray({ a: 1, b: 2 }, (key, value) => [
        `${key}${value}`,
        value * 2,
      ]),
      [
        [`a1`, 2],
        [`b2`, 4],
      ],
    );

    assert.deepEqual(
      objectMapToArray({ a: `x`, b: `y` }, (key, value) => `${key}${value}`),
      [`ax`, `by`],
    );
  },
);

describe(`memoize1 suite` satisfies HasNameOf<typeof memoize1>, async () => {
  test(`fixtures`, () => {
    const fn = (x: string) => x.toUpperCase();
    const memoized = memoize1(fn);

    assert.strictEqual(memoized(`test`), `TEST`);
    assert.strictEqual(memoized(`test`), `TEST`); // Should hit cache
    assert.strictEqual(memoized.isCached(`test`), true);
    assert.strictEqual(memoized.isCached(`other`), false);
    assert.strictEqual(memoized(`other`), `OTHER`);
    assert.strictEqual(memoized.isCached(`other`), true);
  });

  test(`preserves type assertions`, () => {
    const isFooLiteral = memoize1((x: string): x is `foo` => x === `foo`);

    const x = `foo` as string;

    false satisfies IsEqual<typeof x, `foo`>;
    if (isFooLiteral(x)) {
      true satisfies IsEqual<typeof x, `foo`>;
    }
  });

  test(`allows branded string argument`, () => {
    type Branded = string & z.BRAND<`Foo`>;

    memoize1((x: Branded) => x);
  });
});

test(`expected error`, () => {
  expect(true).toBe(false);
});
