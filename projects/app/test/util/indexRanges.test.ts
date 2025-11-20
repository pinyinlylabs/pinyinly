import { describe, expect, test } from "vitest";
import { normalizeIndexRanges, parseIndexRanges } from "#util/indexRanges.ts";

describe(
  `parseIndexRanges suite` satisfies HasNameOf<typeof parseIndexRanges>,
  () => {
    test(`handles single number`, () => {
      expect(parseIndexRanges(`5`)).toEqual([5]);
      expect(parseIndexRanges(`0`)).toEqual([0]);
      expect(parseIndexRanges(`123`)).toEqual([123]);
    });

    test(`single range`, () => {
      expect(parseIndexRanges(`0-2`)).toEqual([0, 1, 2]);
      expect(parseIndexRanges(`5-7`)).toEqual([5, 6, 7]);
      expect(parseIndexRanges(`10-10`)).toEqual([10]);
    });

    test(`comma separated ranges and numbers`, () => {
      expect(parseIndexRanges(`0-2,5`)).toEqual([0, 1, 2, 5]);
      expect(parseIndexRanges(`1,3-5,8`)).toEqual([1, 3, 4, 5, 8]);
      expect(parseIndexRanges(`0,2,4-6`)).toEqual([0, 2, 4, 5, 6]);
      expect(parseIndexRanges(`10-12,15,20-21`)).toEqual([
        10, 11, 12, 15, 20, 21,
      ]);
    });

    test(`overlapping ranges and duplicate numbers`, () => {
      // Overlapping ranges should produce duplicates
      expect(parseIndexRanges(`0-2,1-3`)).toEqual([0, 1, 2, 1, 2, 3]);
      expect(parseIndexRanges(`5-7,6-8`)).toEqual([5, 6, 7, 6, 7, 8]);

      // Duplicate individual numbers
      expect(parseIndexRanges(`1,1,1`)).toEqual([1, 1, 1]);
      expect(parseIndexRanges(`3,5,3,7`)).toEqual([3, 5, 3, 7]);

      // Mix of overlapping ranges and duplicate numbers
      expect(parseIndexRanges(`0-2,2,1-3`)).toEqual([0, 1, 2, 2, 1, 2, 3]);
      expect(parseIndexRanges(`5,5-7,6`)).toEqual([5, 5, 6, 7, 6]);
    });
  },
);

describe(
  `normalizeIndexRanges suite` satisfies HasNameOf<typeof normalizeIndexRanges>,
  () => {
    test(`handles empty string`, () => {
      expect(normalizeIndexRanges(``)).toEqual(``);
    });

    test(`handles single number`, () => {
      expect(normalizeIndexRanges(`5`)).toEqual(`5`);
      expect(normalizeIndexRanges(`0`)).toEqual(`0`);
      expect(normalizeIndexRanges(`123`)).toEqual(`123`);
    });

    test(`normalizes single-element ranges`, () => {
      expect(normalizeIndexRanges(`0-0`)).toEqual(`0`);
      expect(normalizeIndexRanges(`5-5`)).toEqual(`5`);
      expect(normalizeIndexRanges(`123-123`)).toEqual(`123`);
    });

    test(`preserves valid ranges`, () => {
      expect(normalizeIndexRanges(`0-2`)).toEqual(`0-2`);
      expect(normalizeIndexRanges(`5-7`)).toEqual(`5-7`);
      expect(normalizeIndexRanges(`10-15`)).toEqual(`10-15`);
    });

    test(`normalizes consecutive numbers to ranges`, () => {
      expect(normalizeIndexRanges(`0,1,2`)).toEqual(`0-2`);
      expect(normalizeIndexRanges(`5,6,7,8`)).toEqual(`5-8`);
      expect(normalizeIndexRanges(`1,2,3,4,5`)).toEqual(`1-5`);
    });

    test(`combines consecutive numbers with existing ranges`, () => {
      expect(normalizeIndexRanges(`0,1,2-4`)).toEqual(`0-4`);
      expect(normalizeIndexRanges(`1-3,4,5`)).toEqual(`1-5`);
      expect(normalizeIndexRanges(`0-2,3-5`)).toEqual(`0-5`);
    });

    test(`handles non-consecutive numbers`, () => {
      expect(normalizeIndexRanges(`0,2,5`)).toEqual(`0,2,5`);
      expect(normalizeIndexRanges(`1,3,7,9`)).toEqual(`1,3,7,9`);
      expect(normalizeIndexRanges(`0-2,5,8-10`)).toEqual(`0-2,5,8-10`);
    });

    test(`removes duplicates and sorts`, () => {
      expect(normalizeIndexRanges(`5,2,5,1,2`)).toEqual(`1-2,5`);
      expect(normalizeIndexRanges(`3,1,4,1,5,9,2,6`)).toEqual(`1-6,9`);
      expect(normalizeIndexRanges(`10,5,10,3,5`)).toEqual(`3,5,10`);
    });

    test(`handles overlapping ranges`, () => {
      expect(normalizeIndexRanges(`0-3,2-5`)).toEqual(`0-5`);
      expect(normalizeIndexRanges(`1-5,3-7,6-8`)).toEqual(`1-8`);
      expect(normalizeIndexRanges(`10-12,11-15,20-21`)).toEqual(`10-15,20-21`);
    });

    test(`complex mixed cases`, () => {
      expect(normalizeIndexRanges(`0,2,1,4-6,5,8`)).toEqual(`0-2,4-6,8`);
      expect(normalizeIndexRanges(`1-3,5,7-9,6,10`)).toEqual(`1-3,5-10`);
      expect(normalizeIndexRanges(`0-0,2-2,1,4-4,3`)).toEqual(`0-4`);
    });

    test(`preserves order of non-consecutive groups`, () => {
      expect(normalizeIndexRanges(`10-12,5-7,20`)).toEqual(`5-7,10-12,20`);
      expect(normalizeIndexRanges(`15,3-5,25-27,8`)).toEqual(`3-5,8,15,25-27`);
    });
  },
);
