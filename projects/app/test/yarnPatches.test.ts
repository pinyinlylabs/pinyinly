// pyly-not-src-test

import { workspaceRoot } from "#bin/util/paths.ts";
import * as fs from "@pinyinly/lib/fs";
import path from "node:path";
import { expect, test } from "vitest";

test(`yarn patches do not include .orig files`, async () => {
  const patchPaths = await fs.glob(
    path.resolve(workspaceRoot, `.yarn/patches/*.patch`),
  );

  expect(patchPaths.length).toBeGreaterThan(0);

  for (const patchPath of patchPaths) {
    const patchContent = await fs.readFile(patchPath, `utf8`);

    // .orig files are usually accidental artifacts from manual patching.
    expect(
      patchContent,
      `Expected ${patchPath} to not contain .orig patch entries`,
    ).not.toMatch(/^diff --git a\/.*\.orig\b b\/.*\.orig\b/mu);
  }
});
