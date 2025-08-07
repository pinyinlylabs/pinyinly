// pyly-not-src-test
import "#assets/audio/manifest.json";

import { IS_CI } from "#util/env.ts";
import { testSprites } from "@pinyinly/expo-audio-sprites/testing";
import path from "node:path";
import { expect, test } from "vitest";
import { projectRoot } from "../helpers.ts";

test(`test sprites`, async () => {
  const manifestPath = path.join(projectRoot, `src/assets/audio/manifest.json`);
  const result = await testSprites(manifestPath, !IS_CI);

  expect(result.needsRegeneration).toBe(false);
});
