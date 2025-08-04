import { createAffineTransform } from "#client/ui/animate.ts";
import { describe, expect, test } from "vitest";

describe(
  `createAffineTransform suite` satisfies HasNameOf<
    typeof createAffineTransform
  >,
  () => {
    test(`handles zero width input range`, async () => {
      const transform = createAffineTransform(0, 1, 0, 2);
      expect(transform(0)).toBe(1);
      expect(transform(5)).toBe(1);
      expect(transform(10)).toBe(1);
    });

    test(`handles non-zero width input range`, async () => {
      const transform = createAffineTransform(0, 5, 10, 50);
      expect(transform(0)).toBe(5);
      expect(transform(5)).toBe(27.5);
      expect(transform(10)).toBe(50);
    });

    test(`handles out of range values`, async () => {
      const transform = createAffineTransform(0, 5, 10, 50);
      expect(transform(-5)).toBe(-17.5);
      expect(transform(5)).toBe(27.5);
      expect(transform(15)).toBe(72.5);
    });
  },
);
