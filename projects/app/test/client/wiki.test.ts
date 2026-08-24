// pyly-not-src-test

import { projectRoot, wikiDir } from "#bin/util/paths.ts";
import { isHanziCharacter } from "#data/hanzi.js";
import type { HanziCharacter } from "#data/model.js";
import {
  getIsComponentFormHanzi,
  getIsStructuralHanzi,
  loadDictionary,
} from "#dictionary.js";
import { createAudioFileTests } from "@pinyinly/audio-sprites/testing";
import { memoize0 } from "@pinyinly/lib/collections";
import { existsSync, glob, readFileSync } from "@pinyinly/lib/fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe(`speech files`, async () => {
  await createAudioFileTests({
    audioGlob: path.join(wikiDir, `**/*.{mp3,m4a,aac}`),
    projectRoot,
    autoFixLoudness: false,
    autoFixTrimSilence: false,
  });
});

describe(`wiki/*/meaning.mdx files`, async () => {
  const meaningFilePaths = await glob(path.join(wikiDir, `*/`)).then(
    (dirPaths) => dirPaths.map((dirPath) => path.join(dirPath, `meaning.mdx`)),
  );
  expect(meaningFilePaths.length).toBeGreaterThan(0);
  const isStructuralHanzi = await getIsStructuralHanzi();
  const isComponentFormHanzi = await getIsComponentFormHanzi();
  const dictionary = await loadDictionary();

  const data = meaningFilePaths.map((filePath) => {
    const hanzi = path.basename(path.dirname(filePath)) as HanziCharacter;
    const isStructural = isHanziCharacter(hanzi) && isStructuralHanzi(hanzi);
    const isInDictionary = dictionary.lookupHanzi(hanzi).length > 0;
    const projectRelPath = path.relative(projectRoot, filePath);
    const hasMdx = memoize0(() => existsSync(filePath));
    const getMdx = memoize0(() => readFileSync(filePath, `utf-8`));

    return {
      hanzi,
      isStructural,
      isInDictionary,
      projectRelPath,
      hasMdx,
      getMdx,
      filePath,
    };
  });

  test.skip(`existence`, () => {
    for (const { hanzi, isStructural, hasMdx, isInDictionary } of data) {
      if (
        isHanziCharacter(hanzi) &&
        !isStructural &&
        !isComponentFormHanzi(hanzi) &&
        isInDictionary
      ) {
        expect.soft(hasMdx(), hanzi).toBeTruthy();
      }
    }
  });
});
