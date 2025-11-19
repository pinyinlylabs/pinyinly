import {
  allGraphemeComponents,
  graphemeDataSchema,
  parseRanges,
} from "#client/wiki.js";
import type { HanziText } from "#data/model.js";
import { lookupHanzi } from "#dictionary/dictionary.js";
import { IS_CI } from "#util/env.js";
import { createSpeechFileTests } from "@pinyinly/audio-sprites/testing";
import { glob, readFileSync } from "@pinyinly/lib/fs";
import { uniqueInvariant } from "@pinyinly/lib/invariant";
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
      test(`adheres to schema and rules`, async () => {
        const json = readFileSync(filePath, `utf-8`);
        const graphemeData = graphemeDataSchema.parse(JSON.parse(json));

        // Test: no duplicate stroke indices in components (e.g. ❌ 0-3,2).
        if (graphemeData.mnemonic?.components) {
          for (const component of allGraphemeComponents(
            graphemeData.mnemonic.components,
          )) {
            const strokeIndices = parseRanges(component.strokes);
            uniqueInvariant(strokeIndices);
          }
        }

        // Test: number of mnemonic stories matches number of meanings for hanzi
        if (graphemeData.mnemonic?.stories) {
          const hanzi = graphemeData.hanzi as HanziText;
          const hanziWordMeanings = await lookupHanzi(hanzi);

          const storiesCount = graphemeData.mnemonic.stories.length;
          const meaningsCount = hanziWordMeanings.length;

          expect(
            storiesCount,
            `Hanzi "${hanzi}" has ${storiesCount} mnemonic stories but ${meaningsCount} meanings in dictionary`,
          ).toBe(meaningsCount);
        }
      });
    });
  }
});

describe(`parseRanges suite` satisfies HasNameOf<typeof parseRanges>, () => {
  test(`handles single number`, () => {
    expect(parseRanges(`5`)).toEqual([5]);
    expect(parseRanges(`0`)).toEqual([0]);
    expect(parseRanges(`123`)).toEqual([123]);
  });

  test(`single range`, () => {
    expect(parseRanges(`0-2`)).toEqual([0, 1, 2]);
    expect(parseRanges(`5-7`)).toEqual([5, 6, 7]);
    expect(parseRanges(`10-10`)).toEqual([10]);
  });

  test(`comma separated ranges and numbers`, () => {
    expect(parseRanges(`0-2,5`)).toEqual([0, 1, 2, 5]);
    expect(parseRanges(`1,3-5,8`)).toEqual([1, 3, 4, 5, 8]);
    expect(parseRanges(`0,2,4-6`)).toEqual([0, 2, 4, 5, 6]);
    expect(parseRanges(`10-12,15,20-21`)).toEqual([10, 11, 12, 15, 20, 21]);
  });

  test(`overlapping ranges and duplicate numbers`, () => {
    // Overlapping ranges should produce duplicates
    expect(parseRanges(`0-2,1-3`)).toEqual([0, 1, 2, 1, 2, 3]);
    expect(parseRanges(`5-7,6-8`)).toEqual([5, 6, 7, 6, 7, 8]);

    // Duplicate individual numbers
    expect(parseRanges(`1,1,1`)).toEqual([1, 1, 1]);
    expect(parseRanges(`3,5,3,7`)).toEqual([3, 5, 3, 7]);

    // Mix of overlapping ranges and duplicate numbers
    expect(parseRanges(`0-2,2,1-3`)).toEqual([0, 1, 2, 2, 1, 2, 3]);
    expect(parseRanges(`5,5-7,6`)).toEqual([5, 5, 6, 7, 6]);
  });
});
