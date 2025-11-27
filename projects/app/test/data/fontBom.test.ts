// pyly-not-src-test

import { sortComparatorString } from "@pinyinly/lib/collections";
import { glob, readFile } from "@pinyinly/lib/fs";
import path from "node:path";
import { expect, test } from "vitest";
import { projectRoot } from "../helpers.ts";

interface FontBomEntry {
  name: string;
  license: string;
}

test(`font bill of materials`, async () => {
  const fontsDir = path.join(projectRoot, `src/assets/fonts`);
  const fontDirs = await glob(`*/LICENSE`, { cwd: fontsDir });

  const fontBom: FontBomEntry[] = [];

  for (const licensePath of fontDirs) {
    const fontName = path.dirname(licensePath);
    const licenseContent = await readFile(
      path.join(fontsDir, licensePath),
      `utf8`,
    );

    fontBom.push({
      name: fontName,
      license: licenseContent,
    });
  }

  // Sort by font name for consistent output
  fontBom.sort(sortComparatorString((entry) => entry.name));

  const outputPath = path.join(
    projectRoot,
    `src/data/bom/fontBillOfMaterials.asset.json`,
  );

  await expect(JSON.stringify(fontBom, null, 2)).toMatchFileSnapshot(
    outputPath,
  );
});
