import type { StrokeSpecAtom } from "#util/strokeSpec.ts";
import {
  normalizeStrokeSpec,
  parseIndexRangesFromStrokeSpec,
  mapStrokeSpec,
  projectStrokeSpecThroughBindings,
  strokeSpecToSlotBindings,
  formatStrokeSpec2,
  parseStrokeSpec2,
  flattenStrokeSpec2,
  formatAtom,
} from "#util/strokeSpec.ts";
import { describe, expect, test } from "vitest";

describe(
  `parseStrokeSpec2 suite` satisfies HasNameOf<typeof parseStrokeSpec2>,
  () => {
    test(`parses legacy ranges`, () => {
      const spec = parseStrokeSpec2(`0-2,5`);

      expect(spec).toHaveLength(2);
      expect(formatStrokeSpec2(spec)).toBe(`0-2,5`);
      expect(parseIndexRangesFromStrokeSpec(`0-2,5`)).toEqual([0, 1, 2, 5]);
    });

    test(`parses slice tokens`, () => {
      expect(normalizeStrokeSpec(`1[0:3]`)).toBe(`1[0:3]`);
      expect(normalizeStrokeSpec(`1[:3]`)).toBe(`1[:3]`);
      expect(normalizeStrokeSpec(`1[0:]`)).toBe(`1[0:]`);
      expect(normalizeStrokeSpec(`1[:]`)).toBe(`1`);
    });

    test(`parses occurrence selectors`, () => {
      expect(normalizeStrokeSpec(`1[0#1:3#2]`)).toBe(`1[0#1:3#2]`);
      expect(normalizeStrokeSpec(`1[0#0:3#0]`)).toBe(`1[0:3]`);
    });

    test(`parses percent selectors`, () => {
      expect(normalizeStrokeSpec(`1[5%:]`)).toBe(`1[5%:]`);
      expect(normalizeStrokeSpec(`1[:5%]`)).toBe(`1[:5%]`);
      expect(normalizeStrokeSpec(`1[5%:95%]`)).toBe(`1[5%:95%]`);
      expect(normalizeStrokeSpec(`1[05.500%:95.000%]`)).toBe(`1[5.5%:95%]`);
    });

    test(`parses mixed percent and stroke selectors`, () => {
      expect(normalizeStrokeSpec(`1[5%:2]`)).toBe(`1[5%:2]`);
      expect(normalizeStrokeSpec(`1[2:95%]`)).toBe(`1[2:95%]`);
      expect(normalizeStrokeSpec(`1[2#3:95%]`)).toBe(`1[2#3:95%]`);
    });

    test(`parses grouped unions`, () => {
      const spec = parseStrokeSpec2(`1[0:2]+7[:4],9`);

      expect(spec).toHaveLength(2);
      expect(spec[0]).toHaveLength(2);
      expect(spec[1]).toHaveLength(1);
    });

    test(`normalizes whitespace`, () => {
      expect(normalizeStrokeSpec(`  0 - 2 , 5 `)).toBe(`0-2,5`);
      expect(normalizeStrokeSpec(` 1[ 0 : 3 ] + 2[ :4 ] `)).toBe(
        `1[0:3]+2[:4]`,
      );
      expect(normalizeStrokeSpec(` 1[ 5% : 95% ] + 2[ 2 : 75% ] `)).toBe(
        `1[5%:95%]+2[2:75%]`,
      );
    });

    test(`rejects malformed input`, () => {
      expect(() => parseStrokeSpec2(`1[0:3`)).toThrow();
      expect(() => parseStrokeSpec2(`1[0:3:4]`)).toThrow();
      expect(() => parseStrokeSpec2(`1[foo:3]`)).toThrow();
      expect(() => parseStrokeSpec2(`1[foo%:3]`)).toThrow();
      expect(() => parseStrokeSpec2(`1[-1%:3]`)).toThrow();
      expect(() => parseStrokeSpec2(`1[101%:3]`)).toThrow();
      expect(() => parseStrokeSpec2(`1[%:3]`)).toThrow();
      expect(() => parseStrokeSpec2(`3-1`)).toThrow();
      expect(() => parseStrokeSpec2(`1++2`)).toThrow();
    });

    test(`legacy numeric extraction rejects slices`, () => {
      expect(() => parseIndexRangesFromStrokeSpec(`1[0:3]`)).toThrow();
    });

    test(`projects local ranges through parent slot bindings`, () => {
      const parentBindings = strokeSpecToSlotBindings(`1[0:2]+7[:4],9,11`);

      expect(
        projectStrokeSpecThroughBindings({
          localStrokeSpec: `0-1`,
          sourceSlotBindingsInOriginal: parentBindings,
        }),
      ).toEqual([`1[0:2]+7[:4]`, `9`]);
    });

    test(`projects grouped local unions to grouped original unions`, () => {
      const parentBindings = strokeSpecToSlotBindings(`2,4,6`);

      expect(
        projectStrokeSpecThroughBindings({
          localStrokeSpec: `0-1+2`,
          sourceSlotBindingsInOriginal: parentBindings,
        }),
      ).toEqual([`2+4+6`]);
    });
  },
);

describe(`mapStrokeSpec`, () => {
  test.for([
    [`0-1`, `0-1`, `0,1`],
    [`0,1`, `0[1:]`, null],
    [`1,3`, `1,0`, `3,1`],
    [`1+2,3`, `1,0`, `3,1+2`],
    [`0-1+2,3`, `1,0`, `3,0-1+2`],
    [`0`, `0,1`, null],
  ] as [string, string, string | null][])(
    `projects $0 through $1 to $2`,
    ([src, dest, expected]) => {
      expect(mapStrokeSpec(src, dest)).toBe(expected);
    },
  );
});

describe(`flattenStrokeSpec2`, () => {
  test.for([
    [`0`, `0`],
    [`0-1`, `0,1`],
    [`1,3`, `1,3`],
    [`1-2,3`, `1,2,3`],
    [`1+2,3`, `1+2,3`],
    [`0[1:],2`, `0[1:],2`],
  ] as const)(`flattens $0 to $1`, ([src, expected]) => {
    expect(formatStrokeSpec2(flattenStrokeSpec2(parseStrokeSpec2(src)))).toBe(
      expected,
    );
  });
});

describe(`formatAtom`, () => {
  test.for([
    [
      {
        kind: `slice`,
        stroke: 0,
        from: { kind: "stroke", stroke: 1, occurrence: 0 },
        to: null,
      },
      `0[1:]`,
    ],
    [
      {
        kind: `slice`,
        stroke: 0,
        from: null,
        to: { kind: "stroke", stroke: 1, occurrence: 0 },
      },
      `0[:1]`,
    ],
    [
      {
        kind: `slice`,
        stroke: 0,
        from: { kind: "stroke", stroke: 1, occurrence: 0 },
        to: { kind: "stroke", stroke: 2, occurrence: 0 },
      },
      `0[1:2]`,
    ],
    [
      {
        kind: `slice`,
        stroke: 0,
        from: { kind: "stroke", stroke: 1, occurrence: 3 },
        to: { kind: "stroke", stroke: 2, occurrence: 4 },
      },
      `0[1#3:2#4]`,
    ],
    [{ kind: `slice`, stroke: 0, from: null, to: null }, `0`],
  ] as [StrokeSpecAtom, string][])(`formats $0 to $1`, ([atom, expected]) => {
    expect(formatAtom(atom)).toBe(expected);
  });
});
