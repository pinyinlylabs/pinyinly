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
      "M224.27 827.232H804.058",
      "M212.8 800H820V853.6H212.8V800Z",
      "M417.966 633.536H605.162",
      "M407.2 604.8H626.4V658.4H407.2V604.8Z",
      "M417.966 432.04H610.362",
      "M407.2 404H626.4V457.6H407.2V404Z",
      "M618.161 243.544V828.532",
      "M591.2 234.4H648V836.8H591.2V234.4Z",
      "M406.266 244.844V822.032",
      "M378.4 234.4H435.2V836H378.4V234.4Z",
      "M219.07 242.244H818.357V881.831",
      "M848 890.6V217.8L212.8 216.871V270.471L789.6 271.4V890.6H848Z",
      "M204.77 229.245V880.531",
      "M177.6 216.8V889.6H234.4V216.8H177.6Z",
    ]
  `);
});
