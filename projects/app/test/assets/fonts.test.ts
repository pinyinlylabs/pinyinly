// pyly-not-src-test

import { getFonts } from "#test/helpers.ts";
import { expect, test } from "vitest";

test(`MiSans font weight correction`, async () => {
  const fonts = await getFonts();

  const miSans = fonts.find((font) => font.name === `MiSansVF`);
  const miSansL3 = fonts.find((font) => font.name === `MiSansL3`);

  expect(miSans, `MiSans`).toBeDefined();
  expect(miSansL3, `MiSansL3`).toBeDefined();

  expect
    .soft(
      miSans?.subset?.variationAxes[`wght`]?.max,
      `MiSans max weight needs to be adjusted after subsetting`,
    )
    .toEqual(900);
});
