import {
  deepTransform,
  makeRange,
  mapInvert,
  memoize1,
  merge,
  mergeSortComparators,
  MinHeap,
  mutableArrayFilter,
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

describe(
  `mutableArrayFilter suite` satisfies HasNameOf<typeof mutableArrayFilter>,
  () => {
    test(`filters elements in place`, () => {
      const arr = [1, 2, 3, 4, 5];
      mutableArrayFilter(arr, (x) => x % 2 === 0);
      expect(arr).toEqual([2, 4]);
    });

    test(`preserves all elements when predicate is always true`, () => {
      const arr = [`a`, `b`, `c`];
      mutableArrayFilter(arr, () => true);
      expect(arr).toEqual([`a`, `b`, `c`]);
    });

    test(`removes all elements when predicate is always false`, () => {
      const arr = [1, 2, 3];
      mutableArrayFilter(arr, () => false);
      expect(arr).toEqual([]);
    });

    test(`works with empty array`, () => {
      const arr: number[] = [];
      mutableArrayFilter(arr, (x) => x > 0);
      expect(arr).toEqual([]);
    });

    test(`works with single element array`, () => {
      const arr1 = [42];
      mutableArrayFilter(arr1, (x) => x > 40);
      expect(arr1).toEqual([42]);

      const arr2 = [42];
      mutableArrayFilter(arr2, (x) => x < 40);
      expect(arr2).toEqual([]);
    });

    test(`filters complex objects`, () => {
      const arr = [
        { id: 1, active: true },
        { id: 2, active: false },
        { id: 3, active: true },
        { id: 4, active: false },
      ];
      mutableArrayFilter(arr, (item) => item.active);
      expect(arr).toEqual([
        { id: 1, active: true },
        { id: 3, active: true },
      ]);
    });

    test(`preserves order of filtered elements`, () => {
      const arr = [5, 1, 8, 2, 9, 3, 6];
      mutableArrayFilter(arr, (x) => x > 4);
      expect(arr).toEqual([5, 8, 9, 6]);
    });

    test(`handles strings correctly`, () => {
      const arr = [`apple`, `banana`, `cherry`, `date`];
      mutableArrayFilter(arr, (str) => str.length <= 5);
      expect(arr).toEqual([`apple`, `date`]);
    });

    test(`modifies array length correctly`, () => {
      const arr = [1, 2, 3, 4, 5, 6];
      expect(arr.length).toBe(6);
      mutableArrayFilter(arr, (x) => x <= 2);
      expect(arr.length).toBe(2);
      expect(arr).toEqual([1, 2]);
    });

    test(`handles mixed types with type predicate`, () => {
      const arr: (string | number)[] = [1, `hello`, 2, `world`, 3];
      mutableArrayFilter(arr, (x): x is number => typeof x === `number`);
      expect(arr).toEqual([1, 2, 3]);
    });

    test(`works with boolean values`, () => {
      const arr = [true, false, true, false, true];
      mutableArrayFilter(arr, (x) => x);
      expect(arr).toEqual([true, true, true]);
    });

    test(`handles null and undefined values`, () => {
      const arr = [1, null, 2, undefined, 3, null];
      mutableArrayFilter(arr, (x) => x != null);
      expect(arr).toEqual([1, 2, 3]);
    });

    test(`works with filtering by index (via closure)`, () => {
      const arr = [`a`, `b`, `c`, `d`, `e`];
      let index = 0;
      mutableArrayFilter(arr, () => {
        const shouldKeep = index % 2 === 0;
        index++;
        return shouldKeep;
      });
      expect(arr).toEqual([`a`, `c`, `e`]);
    });

    test(`does not affect references to filtered objects`, () => {
      const obj1 = { name: `John` };
      const obj2 = { name: `Jane` };
      const obj3 = { name: `Bob` };
      const arr = [obj1, obj2, obj3];

      mutableArrayFilter(arr, (obj) => obj.name.startsWith(`J`));

      expect(arr).toHaveLength(2);
      expect(arr[0]).toBe(obj1); // Same reference
      expect(arr[1]).toBe(obj2); // Same reference
      expect(arr).toEqual([obj1, obj2]);
    });

    test(`consecutive filtering operations`, () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // First filter: keep even numbers
      mutableArrayFilter(arr, (x) => x % 2 === 0);
      expect(arr).toEqual([2, 4, 6, 8, 10]);

      // Second filter: keep numbers > 5
      mutableArrayFilter(arr, (x) => x > 5);
      expect(arr).toEqual([6, 8, 10]);
    });
  },
);

describe(`MinHeap` satisfies HasNameOf<typeof MinHeap>, () => {
  test(`returns top-k largest items for numbers`, () => {
    const heap = new MinHeap<number>((a, b) => a - b, 3);
    for (const n of [5, 1, 9, 3, 7, 2]) {
      heap.insert(n);
    }
    const result = heap.toArray();
    expect(result).toEqual([5, 7, 9]);
  });

  test(`returns all items if less than capacity`, () => {
    const heap = new MinHeap<number>((a, b) => a - b, 5);
    for (const n of [2, 4, 1]) {
      heap.insert(n);
    }
    expect(heap.toArray()).toEqual([1, 2, 4]);
  });

  test(`handles duplicate values`, () => {
    const heap = new MinHeap<number>((a, b) => a - b, 3);
    for (const n of [2, 2, 2, 2]) {
      heap.insert(n);
    }
    expect(heap.toArray()).toEqual([2, 2, 2]);
  });

  test(`returns top-k objects by property`, () => {
    type Obj = { v: number };
    const heap = new MinHeap<Obj>((a, b) => a.v - b.v, 2);
    heap.insert({ v: 10 });
    heap.insert({ v: 5 });
    heap.insert({ v: 20 });
    heap.insert({ v: 15 });
    const result = heap.toArray().map((x) => x.v);
    expect(result).toEqual([15, 20]);
  });

  test(`does not insert if comparator returns 0 and at capacity`, () => {
    const heap = new MinHeap<number>((a, b) => a - b, 2);
    heap.insert(1);
    heap.insert(1);
    heap.insert(1);
    expect(heap.toArray()).toEqual([1, 1]);
  });

  test(`handles empty heap`, () => {
    const heap = new MinHeap<number>((a, b) => a - b, 3);
    expect(heap.toArray()).toEqual([]);
  });
});
