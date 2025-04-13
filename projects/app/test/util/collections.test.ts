import {
  deepTransform,
  makeRange,
  mapInvert,
  merge,
  mergeSortComparators,
  objectInvert,
  sortComparatorNumber,
  sortComparatorString,
} from "#util/collections.ts";
import assert from "node:assert/strict";
import test from "node:test";

function typeChecks<_T>(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

typeChecks(`type checks only`, () => {
  // @ts-expect-error without arguments it only works on string elements
  [`a`, `b`].sort(sortComparatorNumber());

  // @ts-expect-error without arguments it only works on string elements
  [1, 2].sort(sortComparatorString());
});

await test(`${sortComparatorString.name} fixtures`, () => {
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
});

await test(`${sortComparatorNumber.name} suite`, () => {
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
});

await test(`${mergeSortComparators.name} suite`, () => {
  const arr = [`金`, `现金`, `金`, `金牌`];
  arr.sort(
    mergeSortComparators(
      sortComparatorNumber((x) => x.length),
      sortComparatorString((x) => x),
    ),
  );
  assert.deepEqual(arr, [`金`, `金`, `现金`, `金牌`]);
});

await test(`${merge.name} suite`, () => {
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

await test(`${deepTransform.name} suite`, () => {
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

await test(`${objectInvert.name} fixtures`, () => {
  assert.deepEqual(objectInvert({}), {});
  assert.deepEqual(objectInvert({ a: 1, b: 2 }), { 1: `a`, 2: `b` });
});

await test(`${mapInvert.name} fixtures`, () => {
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

await test(`${makeRange.name} suite`, async () => {
  await test(`ascending range`, () => {
    assert.deepEqual(makeRange(0, 0), [0]);
    assert.deepEqual(makeRange(0, 1), [0, 1]);
    assert.deepEqual(makeRange(1, 2), [1, 2]);
    assert.deepEqual(makeRange(1, 3), [1, 2, 3]);
  });

  await test(`descending range`, () => {
    assert.deepEqual(makeRange(3, 1), [3, 2, 1]);
  });
});
