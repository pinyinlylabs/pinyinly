import { strokeMedianCodec, strokeMediansCodec } from "#util/strokeMedians.ts";
import { describe, expect, test } from "vitest";

describe(
  `strokeMedians codec suite` satisfies HasNameOf<typeof strokeMedianCodec>,
  () => {
    test(`encodes and decodes one stroke`, () => {
      const points = [
        [1, 2],
        [3.5, 4],
        [5, 6.25],
      ] as const;

      const encoded = strokeMedianCodec.encode(points);
      expect(encoded).toBe(`1,2;3.5,4;5,6.25`);
      expect(strokeMedianCodec.decode(encoded)).toEqual(points);
    });

    test(`encodes and decodes multiple strokes`, () => {
      const medians = [
        [
          [0, 1],
          [2, 3],
        ],
        [
          [10, 11],
          [12, 13],
        ],
      ] as const;

      const encoded = strokeMediansCodec.encode(medians);
      expect(encoded).toEqual([`0,1;2,3`, `10,11;12,13`]);
      expect(strokeMediansCodec.decode(encoded)).toEqual(medians);
    });

    test(`rejects invalid encodings`, () => {
      expect(() => strokeMedianCodec.decode(``)).toThrow();
      expect(() => strokeMedianCodec.decode(`1`)).toThrow();
      expect(() => strokeMedianCodec.decode(`1,a`)).toThrow();
    });
  },
);
