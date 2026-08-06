import type { StrokeSpecString } from "#data/model.js";
import type { StrokeSpecAtom } from "#util/strokeSpec.ts";
import {
  normalizeStrokeSpec,
  mapStrokeSpec,
  formatStrokeSpec,
  parseStrokeSpec,
  flattenStrokeSpecRanges,
  formatAtom,
  strokeSpecFilter,
} from "#util/strokeSpec.ts";
import { describe, expect, test } from "vitest";

describe(
  `parseStrokeSpec suite` satisfies HasNameOf<typeof parseStrokeSpec>,
  () => {
    test(`parses ranges`, () => {
      const spec = parseStrokeSpec(`0-2,5`);
      expect(spec).toHaveLength(2);
      expect(formatStrokeSpec(spec)).toBe(`0-2,5`);
    });

    test(`parses grouped unions`, () => {
      const spec = parseStrokeSpec(`1[0:2]+7[:4],9`);

      expect(spec).toHaveLength(2);
      expect(spec[0]).toHaveLength(2);
      expect(spec[1]).toHaveLength(1);
    });

    test(`rejects malformed input`, () => {
      expect(() => parseStrokeSpec(`1[0:3`)).toThrow();
      expect(() => parseStrokeSpec(`1[0:3:4]`)).toThrow();
      expect(() => parseStrokeSpec(`1[foo:3]`)).toThrow();
      expect(() => parseStrokeSpec(`1[foo%:3]`)).toThrow();
      expect(() => parseStrokeSpec(`1[-1%:3]`)).toThrow();
      expect(() => parseStrokeSpec(`1[101%:3]`)).toThrow();
      expect(() => parseStrokeSpec(`1[%:3]`)).toThrow();
      expect(() => parseStrokeSpec(`3-1`)).toThrow();
      expect(() => parseStrokeSpec(`1++2`)).toThrow();
    });
  },
);

describe(`normalizeStrokeSpec`, () => {
  test.for([
    [`1[0:3]`, `1[0:3]`],
    [`1[:3]`, `1[:3]`],
    [`1[0:]`, `1[0:]`],
    [`1[:]`, `1`],
  ] as [StrokeSpecString, StrokeSpecString][])(
    `parses slice tokens`,
    ([input, expected]) => {
      expect(normalizeStrokeSpec(input)).toBe(expected);
    },
  );

  test.for([
    [`1[0#1:3#2]`, `1[0#1:3#2]`],
    [`1[0#0:3#0]`, `1[0:3]`],
  ] as [StrokeSpecString, StrokeSpecString][])(
    `parses occurrence selectors`,
    ([input, expected]) => {
      expect(normalizeStrokeSpec(input)).toBe(expected);
    },
  );

  test.for([
    [`1[5%:]`, `1[5%:]`],
    [`1[:5%]`, `1[:5%]`],
    [`1[5%:95%]`, `1[5%:95%]`],
    [`1[05.500%:95.000%]`, `1[5.5%:95%]`],
  ] as [StrokeSpecString, StrokeSpecString][])(
    `parses percent selectors`,
    ([input, expected]) => {
      expect(normalizeStrokeSpec(input)).toBe(expected);
    },
  );

  test.for([
    [`1[5%:2]`, `1[5%:2]`],
    [`1[2:95%]`, `1[2:95%]`],
    [`1[2#3:95%]`, `1[2#3:95%]`],
  ] as [StrokeSpecString, StrokeSpecString][])(
    `parses mixed percent and stroke selectors`,
    ([input, expected]) => {
      expect(normalizeStrokeSpec(input)).toBe(expected);
    },
  );

  test.for([
    [`  0 - 2 , 5 `, `0-2,5`],
    [` 1[ 0 : 3 ] + 2[ :4 ] `, `1[0:3]+2[:4]`],
    [` 1[ 5% : 95% ] + 2[ 2 : 75% ] `, `1[5%:95%]+2[2:75%]`],
  ] as [StrokeSpecString, StrokeSpecString][])(
    `normalizes whitespace`,
    ([input, expected]) => {
      expect(normalizeStrokeSpec(input)).toBe(expected);
    },
  );
});

describe(`mapStrokeSpec`, () => {
  test.for([
    [`0-1`, `0-1`, `0,1`],
    [`0,1`, `0[1:]`, null],
    [`1,3`, `1,0`, `3,1`],
    [`1+2,3`, `1,0`, `3,1+2`],
    [`0-1+2,3`, `1,0`, `3,0-1+2`],
    [`0`, `0,1`, null],
    // [`2-8`, `2,1[13%:34.6%],3,4,5+6[27%:73%]`, ``],
  ] as [StrokeSpecString, StrokeSpecString, StrokeSpecString | null][])(
    `projects $0 through $1 to $2`,
    ([src, dest, expected]) => {
      expect(mapStrokeSpec(src, dest)).toBe(expected);
    },
  );
});

describe(`flattenStrokeSpec`, () => {
  test.for([
    [`0`, `0`],
    [`0-1`, `0,1`],
    [`1,3`, `1,3`],
    [`1-2,3`, `1,2,3`],
    [`1+2,3`, `1+2,3`],
    [`0[1:],2`, `0[1:],2`],
  ] as const)(`flattens $0 to $1`, ([src, expected]) => {
    expect(
      formatStrokeSpec(flattenStrokeSpecRanges(parseStrokeSpec(src))),
    ).toBe(expected);
  });
});

describe(`formatAtom`, () => {
  test.for([
    [
      {
        kind: `slice`,
        stroke: 0,
        from: { kind: `stroke`, stroke: 1, occurrence: 0 },
        to: null,
      },
      `0[1:]`,
    ],
    [
      {
        kind: `slice`,
        stroke: 0,
        from: null,
        to: { kind: `stroke`, stroke: 1, occurrence: 0 },
      },
      `0[:1]`,
    ],
    [
      {
        kind: `slice`,
        stroke: 0,
        from: { kind: `stroke`, stroke: 1, occurrence: 0 },
        to: { kind: `stroke`, stroke: 2, occurrence: 0 },
      },
      `0[1:2]`,
    ],
    [
      {
        kind: `slice`,
        stroke: 0,
        from: { kind: `stroke`, stroke: 1, occurrence: 3 },
        to: { kind: `stroke`, stroke: 2, occurrence: 4 },
      },
      `0[1#3:2#4]`,
    ],
    [{ kind: `slice`, stroke: 0, from: null, to: null }, `0`],
  ] as [StrokeSpecAtom, string][])(`formats $0 to $1`, ([atom, expected]) => {
    expect(formatAtom(atom)).toBe(expected);
  });
});

describe(`strokeSpecFilter`, () => {
  const toThrow = Symbol("<throws>");
  interface TestCase {
    strokeSpec: string;
    pathsByAtom: Record<string, string>;
    pathsByIndex: string[];
    expected: string[] | typeof toThrow;
  }

  test.for([
    {
      pathsByAtom: null,
      pathsByIndex: ["path0", "path1"],
      strokeSpec: "0",
      expected: ["path0"],
    },
    {
      pathsByAtom: null,
      pathsByIndex: ["path0", "path1"],
      strokeSpec: "0,1",
      expected: ["path0", "path1"],
    },
    {
      pathsByAtom: null,
      pathsByIndex: ["path0", "path1"],
      strokeSpec: "0-1",
      expected: ["path0", "path1"],
    },
    {
      pathsByAtom: {
        "0[:1]": "path0[:1]",
      },
      pathsByIndex: ["path0", "path1"],
      strokeSpec: "0[:1]",
      expected: ["path0[:1]"],
    },
    {
      pathsByAtom: null,
      pathsByIndex: [],
      strokeSpec: "0-2",
      expected: toThrow,
    },
    {
      pathsByAtom: null,
      pathsByIndex: ["path0"],
      strokeSpec: "0[:1]",
      expected: toThrow,
    },
    {
      pathsByAtom: {},
      pathsByIndex: ["path0"],
      strokeSpec: "0[:1]",
      expected: toThrow,
    },
  ] as TestCase[])(
    `strokeSpecFilter($strokeSpec, $pathsByAtom, $pathsByIndex) -> $expected`,
    ({ strokeSpec, pathsByAtom, pathsByIndex, expected }) => {
      const getResult = () =>
        strokeSpecFilter(
          pathsByIndex,
          pathsByAtom,
          strokeSpec as StrokeSpecString,
        );
      if (expected === toThrow) {
        expect(getResult).toThrow();
      } else {
        expect(getResult()).toEqual(expected);
      }
    },
  );
});
