import {
  formatStrokeSpec,
  normalizeStrokeSpec,
  parseIndexRangesFromStrokeSpec,
  parseStrokeSpec,
  projectStrokeSpecThroughBindings,
  strokeSpecItemCount,
  strokeSpecToSlotBindings,
} from "#util/strokeSpec.ts";
import { describe, expect, test } from "vitest";

describe(
  `parseStrokeSpec suite` satisfies HasNameOf<typeof parseStrokeSpec>,
  () => {
    test(`parses legacy ranges`, () => {
      const spec = parseStrokeSpec(`0-2,5`);

      expect(spec.items).toHaveLength(2);
      expect(formatStrokeSpec(spec)).toBe(`0-2,5`);
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
      const spec = parseStrokeSpec(`1[0:2]+7[:4],9`);

      expect(spec.items).toHaveLength(2);
      expect(spec.items[0]?.atoms).toHaveLength(2);
      expect(spec.items[1]?.atoms).toHaveLength(1);
      expect(strokeSpecItemCount(`1[0:2]+7[:4],9`)).toBe(2);
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

    test(`legacy numeric extraction rejects slices`, () => {
      expect(() => parseIndexRangesFromStrokeSpec(`1[0:3]`)).toThrow();
    });

    test(`expands ranges into slot bindings`, () => {
      expect(strokeSpecToSlotBindings(`0-2,5`)).toEqual([`0`, `1`, `2`, `5`]);
      expect(strokeSpecToSlotBindings(`1[0:2]+7[:4],9`)).toEqual([
        `1[0:2]+7[:4]`,
        `9`,
      ]);
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
