import { IS_CI } from "#util/env.js";
import { createSpeechFileTests } from "@pinyinly/expo-audio-sprites/testing";
import path from "node:path";
import { describe } from "vitest";
import { projectRoot } from "../helpers.ts";

const wikiDir = path.join(projectRoot, `src/client/wiki`);

describe(`speech files`, async () => {
  await createSpeechFileTests({
    audioGlob: path.join(wikiDir, `**/*.{mp3,m4a,aac}`),
    projectRoot,
    isCI: IS_CI,
  });
});
