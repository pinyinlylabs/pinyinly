// pyly-not-src-test
import "#assets/audio/manifest.json";

import { projectRoot } from "#test/helpers.ts";
import { isCi } from "#util/env.ts";
import { testSprites } from "@pinyinly/audio-sprites/testing";
import path from "node:path";
import { expect, test } from "vitest";

test(`test sprites`, async () => {
  const manifestPath = path.join(projectRoot, `src/assets/audio/manifest.json`);
  const result = await testSprites(manifestPath, !isCi);

  expect(result.needsRegeneration).toBe(false);
});
