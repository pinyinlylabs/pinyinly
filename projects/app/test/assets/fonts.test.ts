// pyly-not-src-test

import { projectRoot } from "#bin/util/paths.ts";
import { getFonts } from "#test/helpers.ts";
import path from "node:path";
import { expect, test } from "vitest";
import * as fs from "@pinyinly/lib/fs";
import { parseSvgPaths } from "#util/svgFont.js";

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

test(`transform SVG glyphs`, async () => {
  const svgText = await fs.readFile(
    path.resolve(projectRoot, `src/assets/fonts/MiSans/glyphs/囬.svg`),
    `utf-8`,
  );

  const glyph = parseSvgPaths(svgText);
  const glyphPaths = glyph.map((path) => path.d);

  expect(glyphPaths).toMatchInlineSnapshot(`
    [
      "M224.27 826.732H804.058",
      "M212.8 799.5H820V853.1H212.8V799.5Z",
      "M417.966 633.036H605.162",
      "M407.2 604.3H626.4V657.9H407.2V604.3Z",
      "M417.966 431.54H610.362",
      "M407.2 403.5H626.4V457.1H407.2V403.5Z",
      "M618.161 243.044V828.032",
      "M591.2 233.9H648V836.3H591.2V233.9Z",
      "M406.266 244.344V821.532",
      "M378.4 233.9H435.2V835.5H378.4V233.9Z",
      "M219.07 241.744H818.357V881.331",
      "M848 890.1V217.3L212.8 216.371V269.971L789.6 270.9V890.1H848Z",
      "M204.77 228.745V880.031",
      "M177.6 216.3V889.1H234.4V216.3H177.6Z",
    ]
  `);
});
