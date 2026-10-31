// pyly-not-src-test

import { projectRoot } from "#bin/util/paths.ts";
import { glob, readFile } from "@pinyinly/lib/fs";
import { jsonCodec } from "@pinyinly/lib/zod";
import path from "node:path";
import { expect, test } from "vitest";
import { z } from "zod";

const pylyVendorSchema = z
  .object({
    name: z.string().min(1).optional(),
    version: z.string().min(1).optional(),
    license: z.string().min(1).optional(),
    download: z.url().optional(),
    notes: z.string().min(1).optional(),
  })
  .strict();

const pylyVendorCodec = jsonCodec(pylyVendorSchema);

test(`vendor metadata is valid`, async () => {
  const vendorFilePaths = (
    await glob(path.join(projectRoot, `**/pyly-vendor.json`))
  ).sort();
  const vendorDirectories = (
    await glob([`src/assets/fonts/*/`, `test/vendor/*/`], {
      cwd: projectRoot,
      ignore: `src/assets/fonts/PinyinlyComponents/`,
    })
  ).map((vendorDirectory) => path.join(projectRoot, vendorDirectory));

  expect.soft(vendorFilePaths.length).toBeGreaterThan(0);

  for (const vendorDirectory of vendorDirectories) {
    expect
      .soft(
        vendorFilePaths,
        `${path.relative(projectRoot, vendorDirectory)} needs pyly-vendor.json`,
      )
      .toContain(path.join(vendorDirectory, `pyly-vendor.json`));
  }

  for (const filePath of vendorFilePaths) {
    const contents = await readFile(filePath, `utf8`);
    const parsed = pylyVendorCodec.safeParse(contents);
    if (!parsed.success) {
      expect
        .soft(
          false,
          `Invalid vendor metadata in ${path.relative(projectRoot, filePath)}: ${parsed.error.message}`,
        )
        .toBe(true);
    }
  }
});
