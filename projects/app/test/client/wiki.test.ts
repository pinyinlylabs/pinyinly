import type { GraphemeData } from "#client/wiki.js";
import {
  allGraphemeComponents,
  graphemeDataSchema,
  graphemeStrokeCount,
} from "#client/wiki.js";
import { isHanziGrapheme } from "#data/hanzi.js";
import type { HanziText } from "#data/model.js";
import { loadMissingFontGlyphs, lookupHanzi } from "#dictionary/dictionary.js";
import { IS_CI } from "#util/env.js";
import { normalizeIndexRanges, parseIndexRanges } from "#util/indexRanges.js";
import { createSpeechFileTests } from "@pinyinly/audio-sprites/testing";
import { deepReadonly, memoize1 } from "@pinyinly/lib/collections";
import {
  existsSync,
  glob,
  readFileSync,
  writeJsonFileIfChanged,
} from "@pinyinly/lib/fs";
import { nonNullable, uniqueInvariant } from "@pinyinly/lib/invariant";
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
  // For every grapheme wiki directory, there should be a grapheme.json file.
  const graphemeFilePaths = await glob(path.join(wikiDir, `*/`)).then(
    (dirPaths) =>
      dirPaths
        .filter((dirPath) =>
          isHanziGrapheme(path.basename(dirPath) as HanziText),
        )
        .map((dirPath) => path.join(dirPath, `grapheme.json`)),
  );
  expect(graphemeFilePaths.length).toBeGreaterThan(0);

  const getDataForGrapheme = memoize1(
    (grapheme: string): GraphemeData | undefined => {
      const filePath = path.join(wikiDir, grapheme, `grapheme.json`);
      if (existsSync(filePath)) {
        const json = JSON.parse(readFileSync(filePath, `utf-8`));
        return graphemeDataSchema.parse(json);
      }
    },
  );

  for (const filePath of graphemeFilePaths) {
    const grapheme = path.basename(path.dirname(filePath));
    const projectRelPath = path.relative(projectRoot, filePath);
    const getData = () =>
      deepReadonly(nonNullable(getDataForGrapheme(grapheme)));

    describe(projectRelPath, () => {
      test(`adheres to schema`, async () => {
        getData();
      });

      test(`no duplicate stroke indicies in components (e.g. ❌ 0-3,2)`, async () => {
        const graphemeData = getData();

        if (graphemeData.mnemonic?.components) {
          for (const component of allGraphemeComponents(
            graphemeData.mnemonic.components,
          )) {
            const strokeIndices = parseIndexRanges(component.strokes);
            uniqueInvariant(strokeIndices);
          }
        }
      });

      test(`mnemonic component strokes match the hanzi stroke count`, async () => {
        const graphemeData = getData();

        if (graphemeData.mnemonic?.components) {
          for (const [i, component] of [
            ...allGraphemeComponents(graphemeData.mnemonic.components),
          ].entries()) {
            if (component.hanzi != null) {
              const hanziData = getDataForGrapheme(component.hanzi);
              if (hanziData != null) {
                const claimedStrokeCount = parseIndexRanges(
                  component.strokes,
                ).length;
                const expectedStrokeCount =
                  graphemeStrokeCount(hanziData) + (component.strokeDiff ?? 0);

                // AUTO-FIXER CODE
                if (claimedStrokeCount !== expectedStrokeCount) {
                  const newGraphemeData = structuredClone(graphemeData);
                  const newComponents = allGraphemeComponents(
                    newGraphemeData.mnemonic!.components,
                  ).toArray();
                  const newComponent = nonNullable(newComponents[i]);
                  if (i === newComponents.length - 1) {
                    newComponent.strokes = normalizeIndexRanges(
                      `${graphemeStrokeCount(graphemeData) - expectedStrokeCount}-${graphemeStrokeCount(graphemeData) - 1}`,
                    );
                  } else if (i === 0 || i === 1) {
                    const startIndex =
                      Math.max(
                        -1,
                        ...newComponents
                          .slice(0, i)
                          .flatMap((c) => parseIndexRanges(c.strokes)),
                      ) + 1;
                    newComponent.strokes = normalizeIndexRanges(
                      `${startIndex}-${startIndex + expectedStrokeCount - 1}`,
                    );
                  } else {
                    console.warn(
                      `Cannot auto-fix component strokes for component ${i} in ${grapheme} mnemonic`,
                    );
                  }
                  if (!IS_CI) {
                    await writeJsonFileIfChanged(filePath, newGraphemeData);
                    throw new Error(
                      `Auto-fixed component strokes for ${grapheme} mnemonic - please re-run tests`,
                    );
                  }
                }

                expect(
                  claimedStrokeCount,
                  `${component.hanzi} stroke count does not match wiki data`,
                ).toEqual(expectedStrokeCount);
              }
            }
          }
        }
      });

      test(`component index ranges are normalized`, () => {
        const graphemeData = getData();

        if (graphemeData.mnemonic?.components) {
          for (const [i, component] of [
            ...allGraphemeComponents(graphemeData.mnemonic.components),
          ].entries()) {
            const normalized = normalizeIndexRanges(component.strokes);
            expect(
              component.strokes,
              `Component ${i} strokes are not normalized`,
            ).toEqual(normalized);
          }
        }
      });

      test(`all strokes are covered by mnemonic components`, async () => {
        const graphemeData = getData();

        if (graphemeData.mnemonic?.components) {
          const allComponentStrokes = new Set<number>();
          for (const component of allGraphemeComponents(
            graphemeData.mnemonic.components,
          )) {
            const strokeIndices = parseIndexRanges(component.strokes);
            for (const index of strokeIndices) {
              allComponentStrokes.add(index);
            }
          }

          const totalStrokes = graphemeStrokeCount(graphemeData);
          const expectedStrokes = Array.from(
            { length: totalStrokes },
            (_, i) => i,
          );

          for (const strokeIndex of expectedStrokes) {
            expect(
              allComponentStrokes.has(strokeIndex),
              `Stroke ${strokeIndex} is not covered by any mnemonic component`,
            ).toBe(true);
          }
        }
      });

      test(`number of mnemonic stories matches number of meanings for hanzi`, async () => {
        const graphemeData = getData();

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

      test(`components do not use invalid "hanzi" strings`, async () => {
        const graphemeData = getData();

        if (graphemeData.mnemonic?.components) {
          const bannedCharacters = new Set();

          // Don't self-reference
          bannedCharacters.add(graphemeData.hanzi);

          // Only allow characters that have a glyph.
          for (const missingGlyph of await loadMissingFontGlyphs()) {
            bannedCharacters.add(missingGlyph);
          }

          // Don't allow IDS combining characters or circled numbers (meaning "unknown N stroke character").
          for (const char of `⿰|⿱|⿲|⿳|⿴|⿵|⿶|⿷|⿼|⿸|⿹|⿺|⿽|⿻|⿾|⿿|①|②|③|④|⑤|⑥|⑦|⑧|⑨|⑩|⑪|⑫|⑬|⑭|⑮|⑯|⑰|⑱|⑲|⑳`.split(
            `|`,
          )) {
            bannedCharacters.add(char);
          }

          // Other characters
          for (const char of [
            `\uD840 \uD841 \uD842 \uD843 \uD845 \uD846 \uD847 \uD848 \uD84E \uD853 \uD856 \uD858 \uD85A \uD85D \uD85F \uD86A`,
            `\uD86C \uD86D \uD86E \uD86F \uD871 \uD875 \uD876 \uD877 \uDC20 \uDC60 \uDC8B \uDCB8 \uDCFB \uDD3C \uDD44 \uDD9D`,
            `\uDDBC \uDDD7 \uDDE6 \uDE04 \uDE27 \uDE60 \uDED3 \uDED4 \uDED7 \uDF4C \uDFA6 \uDFB7 \uDFE8`,
          ].flatMap((x) => x.split(/\s+/g))) {
            bannedCharacters.add(char);
          }

          for (const component of allGraphemeComponents(
            graphemeData.mnemonic.components,
          )) {
            expect(bannedCharacters).not.toContain(component.hanzi);
          }
        }
      });
    });
  }
});
