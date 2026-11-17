import { parseCssColorForSchemeOrThrow } from "#util/color.ts";
import { describe, expect, test } from "vitest";

describe(`parseCssColorForSchemeOrThrow`, () => {
  test.each([
    [`light`, { red: 255, green: 137, blue: 4, alpha: 1 }],
    [`dark`, { red: 255, green: 185, blue: 0, alpha: 1 }],
  ] as const)(
    `resolves light-dark() for the %s scheme`,
    (colorScheme, color) => {
      expect(
        parseCssColorForSchemeOrThrow(
          `light-dark(#ff8904, #ffb900)`,
          colorScheme,
        ),
      ).toEqual(color);
    },
  );
});
