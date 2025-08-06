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
      expect(arr).toEqual([`a`, `b`, `c`]);
    }

    {
      const arr = [[`c`], [`a`], [`b`]];
      arr.sort(sortComparatorString(([x]) => x!));
      expect(arr).toEqual([[`a`], [`b`], [`c`]]);
    }
  },
);

test(
  `sortComparatorNumber suite` satisfies HasNameOf<typeof sortComparatorNumber>,
  () => {
    {
      const arr = [3, 1, 2];
      arr.sort(sortComparatorNumber());
      expect(arr).toEqual([1, 2, 3]);
    }

    {
      const arr = [[3], [1], [2]];
      arr.sort(sortComparatorNumber(([x]) => x!));
      expect(arr).toEqual([[1], [2], [3]]);
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
    expect(arr).toEqual([`金`, `金`, `现金`, `金牌`]);
  },
);

test(`merge suite` satisfies HasNameOf<typeof merge>, () => {
  expect(merge(null, null)).toEqual(null);
  expect(merge(null, 1)).toEqual(1);
  expect(merge(1, null)).toEqual(1);
  expect(merge([1], [2])).toEqual([1, 2]);
  expect(
    merge(new Map([[`key1`, `value1`]]), new Map([[`key2`, `value2`]])),
  ).toEqual(
    new Map([
      [`key1`, `value1`],
      [`key2`, `value2`],
    ]),
  );
  expect(
    merge(
      new Map([[`key1`, new Map([[`key1.1`, `value1.1`]])]]),
      new Map([[`key1`, new Map([[`key2.1`, `value2.1`]])]]),
    ),
  ).toEqual(
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
  expect(deepTransform(null, (x) => x)).toEqual(null);
  expect(
    deepTransform(new Map([[`key1`, `value1`]]), (x) =>
      x instanceof Map ? Object.fromEntries(x.entries()) : x,
    ),
  ).toEqual({ key1: `value1` });
});

test(`objectInvert fixtures` satisfies HasNameOf<typeof objectInvert>, () => {
  expect(objectInvert({})).toEqual({});
  expect(objectInvert({ a: 1, b: 2 })).toEqual({ 1: `a`, 2: `b` });
});

test(`mapInvert fixtures` satisfies HasNameOf<typeof mapInvert>, () => {
  expect(mapInvert(new Map())).toEqual(new Map());
  expect(
    mapInvert(
      new Map<string | number, string | number>([
        [1, 2],
        [`a`, `b`],
      ]),
    ),
  ).toEqual(
    new Map<string | number, string | number>([
      [2, 1],
      [`b`, `a`],
    ]),
  );
});

describe(`makeRange suite` satisfies HasNameOf<typeof makeRange>, async () => {
  test(`ascending range`, () => {
    expect(makeRange(0, 0)).toEqual([0]);
    expect(makeRange(0, 1)).toEqual([0, 1]);
    expect(makeRange(1, 2)).toEqual([1, 2]);
    expect(makeRange(1, 3)).toEqual([1, 2, 3]);
  });

  test(`descending range`, () => {
    expect(makeRange(3, 1)).toEqual([3, 2, 1]);
  });
});

describe(`objectMap suite` satisfies HasNameOf<typeof objectMap>, () => {
  test(`fixtures`, () => {
    expect(
      objectMap({ a: 1, b: 2 }, (key, value) => [`${key}${value}`, value * 2]),
    ).toEqual({ a1: 2, b2: 4 });

    expect(
      objectMap({ a: `x`, b: `y` }, (key, value) => [`${key}${value}`, value]),
    ).toEqual({ ax: `x`, by: `y` });
  });

  test(`regression: Partial<…>`, () => {
    const obj: Partial<{ a: string; b: string }> = { a: `x`, b: `y` };
    expect(objectMap(obj, (key, value) => [`${key}${value}`, value])).toEqual({
      ax: `x`,
      by: `y`,
    });
  });
});

test(
  `objectMapToArray suite` satisfies HasNameOf<typeof objectMapToArray>,
  () => {
    expect(
      objectMapToArray({ a: 1, b: 2 }, (key, value) => [
        `${key}${value}`,
        value * 2,
      ]),
    ).toEqual([
      [`a1`, 2],
      [`b2`, 4],
    ]);

    expect(
      objectMapToArray({ a: `x`, b: `y` }, (key, value) => `${key}${value}`),
    ).toEqual([`ax`, `by`]);
  },
);

describe(`memoize1 suite` satisfies HasNameOf<typeof memoize1>, async () => {
  test(`fixtures`, () => {
    const fn = (x: string) => x.toUpperCase();
    const memoized = memoize1(fn);

    expect(memoized(`test`)).toEqual(`TEST`);
    expect(memoized(`test`)).toEqual(`TEST`); // Should hit cache
    expect(memoized.isCached(`test`)).toEqual(true);
    expect(memoized.isCached(`other`)).toEqual(false);
    expect(memoized(`other`)).toEqual(`OTHER`);
    expect(memoized.isCached(`other`)).toEqual(true);
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
