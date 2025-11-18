import { graphemeDataSchema } from "#client/wiki.js";
import { IS_CI } from "#util/env.js";
import { createSpeechFileTests } from "@pinyinly/audio-sprites/testing";
import { glob, readFileSync } from "@pinyinly/lib/fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { projectRoot } from "../helpers.ts";

const wikiDir = path.join(projectRoot, `src/client/wiki`);

describe(`speech files`, async () => {
  await createSpeechFileTests({
    audioGlob: path.join(wikiDir, `**/*.{mp3,m4a,aac}`),
    projectRoot,
    isCI: IS_CI,
  });
});

describe(`grapheme.json files`, async () => {
  const graphemeFilePaths = await glob(path.join(wikiDir, `**/grapheme.json`));
  expect(graphemeFilePaths.length).toBeGreaterThan(0);

  for (const filePath of graphemeFilePaths) {
    const projectRelPath = path.relative(projectRoot, filePath);

    describe(projectRelPath, () => {
      test(`adheres to schema`, async () => {
        const json = readFileSync(filePath, `utf-8`);
        graphemeDataSchema.parse(JSON.parse(json));
      });
    });
  }
});
