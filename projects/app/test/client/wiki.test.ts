import type { GraphemeData } from "#client/wiki.js";
import {
  allGraphemeComponents,
  graphemeDataSchema,
  graphemeStrokeCount,
} from "#client/wiki.js";
import { isHanziGrapheme } from "#data/hanzi.js";
import type { HanziText } from "#data/model.js";
import {
  getIsComponentFormHanzi,
  getIsStructuralHanzi,
  hanziToHanziWordMap,
  loadHanziDecomposition,
  loadMissingFontGlyphs,
  lookupHanzi,
} from "#dictionary/dictionary.js";
import { IS_CI } from "#util/env.js";
import { normalizeIndexRanges, parseIndexRanges } from "#util/indexRanges.js";
import { createSpeechFileTests } from "@pinyinly/audio-sprites/testing";
import { memoize0, memoize1 } from "@pinyinly/lib/collections";
import { existsSync, glob, readFileSync } from "@pinyinly/lib/fs";
import {
  invariant,
  nonNullable,
  uniqueInvariant,
} from "@pinyinly/lib/invariant";
import path from "node:path";
import type { DeepReadonly } from "ts-essentials";
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

describe(`/meaning.mdx files`, async () => {
  const meaningFilePaths = await glob(path.join(wikiDir, `*/`)).then(
    (dirPaths) => dirPaths.map((dirPath) => path.join(dirPath, `meaning.mdx`)),
  );
  expect(meaningFilePaths.length).toBeGreaterThan(0);
  const isStructuralHanzi = await getIsStructuralHanzi();
  const isComponentFormHanzi = await getIsComponentFormHanzi();
  const { hanziMap } = await hanziToHanziWordMap();

  const data = meaningFilePaths.map((filePath) => {
    const hanzi = path.basename(path.dirname(filePath)) as HanziText;
    const isGrapheme = isHanziGrapheme(hanzi);
    const isStructuralGrapheme = isStructuralHanzi(hanzi);
    const isComponentFormGrapheme = isComponentFormHanzi(hanzi);
    const isInDictionary = hanziMap.has(hanzi);
    const projectRelPath = path.relative(projectRoot, filePath);
    const hasMdx = memoize0(() => existsSync(filePath));
    const getMdx = memoize0(() => readFileSync(filePath, `utf-8`));

    return {
      hanzi,
      isGrapheme,
      isStructuralGrapheme,
      isComponentFormGrapheme,
      isInDictionary,
      projectRelPath,
      hasMdx,
      getMdx,
      filePath,
    };
  });

  test(`existence`, () => {
    const errors = [];

    for (const {
      hanzi,
      isGrapheme,
      isStructuralGrapheme,
      isComponentFormGrapheme,
      hasMdx,
      isInDictionary,
    } of data) {
      if (
        isGrapheme &&
        !isStructuralGrapheme &&
        !isComponentFormGrapheme &&
        isInDictionary
      ) {
        try {
          expect(hasMdx()).toBeTruthy();
        } catch (error) {
          errors.push([hanzi, error]);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test(`should contain a <WikiHanziGraphemeDecomposition>`, () => {
    const errors = [];

    for (const { hanzi, isGrapheme, hasMdx, getMdx } of data) {
      if (isGrapheme && hasMdx()) {
        const mdx = getMdx();
        const match = [...mdx.matchAll(/<WikiHanziGraphemeDecomposition\s+/g)];
        try {
          expect(
            match.length,
            `MDX does not have exactly one <WikiHanziGraphemeDecomposition> component`,
          ).toEqual(1);
        } catch (error) {
          errors.push([hanzi, error]);
        }
      }
    }

    expect(errors).toEqual([]);
  });
});

describe(`grapheme.json files`, async () => {
  const getDataForGrapheme = memoize1(
    (grapheme: string): DeepReadonly<GraphemeData> | undefined => {
      const filePath = path.join(wikiDir, grapheme, `grapheme.json`);
      if (existsSync(filePath)) {
        const json = JSON.parse(readFileSync(filePath, `utf-8`));
        return graphemeDataSchema.parse(json);
      }
    },
  );
  const graphemeFilePaths = await glob(path.join(wikiDir, `*/`)).then(
    (dirPaths) =>
      dirPaths.flatMap((dirPath) => {
        const grapheme = path.basename(dirPath) as HanziText;
        const filePath = path.join(wikiDir, grapheme, `grapheme.json`);
        return isHanziGrapheme(grapheme)
          ? ([
              {
                grapheme,
                graphemeData: nonNullable(getDataForGrapheme(grapheme)),
                filePath,
              },
            ] as const)
          : [];
      }),
  );
  expect(graphemeFilePaths.length).toBeGreaterThan(0);
  const isComponentFormHanzi = await getIsComponentFormHanzi();
  const decompositions = await loadHanziDecomposition();

  test(`graphemes in the dictionary with 12+ strokes have mnemonic components`, async () => {
    const errors = [];

    for (const { grapheme, graphemeData } of graphemeFilePaths) {
      const meanings = await lookupHanzi(grapheme);
      if (
        graphemeStrokeCount(graphemeData) <= 11 ||
        meanings.length === 0 ||
        isComponentFormHanzi(grapheme) ||
        graphemeData.traditionalFormOf != null
      ) {
        continue;
      }

      try {
        expect(graphemeData.mnemonic?.components.length).toBeGreaterThanOrEqual(
          2,
        );
      } catch (error) {
        const toPush = [grapheme, error];
        const hint = decompositions.get(grapheme);
        if (hint != null) {
          toPush.push(`(decomposition guess: ${hint})`);
        }
        errors.push(toPush);
      }
    }

    expect(errors, `graphemes missing 2+ mnemonic components`).toEqual([]);
  });

  test(`no duplicate stroke indicies in components (e.g. ❌ 0-3,2)`, async () => {
    const errors = [];

    for (const { grapheme, graphemeData } of graphemeFilePaths) {
      if (graphemeData.mnemonic?.components) {
        for (const component of allGraphemeComponents(
          graphemeData.mnemonic.components,
        )) {
          const strokeIndices = parseIndexRanges(component.strokes);
          try {
            uniqueInvariant(strokeIndices);
          } catch (error) {
            errors.push([grapheme, error]);
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test(`component index ranges are normalized`, () => {
    const errors = [];

    for (const { grapheme, graphemeData } of graphemeFilePaths) {
      if (graphemeData.mnemonic?.components) {
        for (const [i, component] of [
          ...allGraphemeComponents(graphemeData.mnemonic.components),
        ].entries()) {
          const normalized = normalizeIndexRanges(component.strokes);
          try {
            expect(
              component.strokes,
              `component ${i} strokes are not normalized`,
            ).toEqual(normalized);
          } catch (error) {
            errors.push([grapheme, error]);
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test(`components do not use invalid "hanzi" strings`, async () => {
    const errors = [];

    for (const { grapheme, graphemeData } of graphemeFilePaths) {
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
          try {
            expect(bannedCharacters).not.toContain(component.hanzi);
          } catch (error) {
            errors.push([grapheme, error]);
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test(`number of mnemonic stories matches number of meanings for hanzi`, async () => {
    const errors = [];

    for (const { grapheme, graphemeData } of graphemeFilePaths) {
      if (graphemeData.mnemonic?.stories) {
        const hanzi = graphemeData.hanzi as HanziText;
        const hanziWordMeanings = await lookupHanzi(hanzi);

        const storiesCount = graphemeData.mnemonic.stories.length;
        const meaningsCount = hanziWordMeanings.length;

        try {
          expect(
            storiesCount,
            `hanzi "${hanzi}" has ${storiesCount} mnemonic stories but ${meaningsCount} meanings in dictionary`,
          ).toBe(meaningsCount);
        } catch (error) {
          errors.push([grapheme, error]);
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test(`all strokes are covered by mnemonic components`, async () => {
    const errors = [];

    for (const { grapheme, graphemeData } of graphemeFilePaths) {
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
          try {
            expect(
              allComponentStrokes.has(strokeIndex),
              `stroke ${strokeIndex} is not covered by any mnemonic component`,
            ).toBe(true);
          } catch (error) {
            errors.push([grapheme, error]);
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });

  test(`mnemonic component strokes match the hanzi stroke count`, async () => {
    const errors = [];

    for (const { grapheme, graphemeData } of graphemeFilePaths) {
      if (graphemeData.mnemonic?.components) {
        for (const [, component] of [
          ...allGraphemeComponents(graphemeData.mnemonic.components),
        ].entries()) {
          const primaryHanzi = component.hanzi?.split(`,`)[0];
          if (primaryHanzi != null) {
            const hanziData = getDataForGrapheme(primaryHanzi);
            invariant(
              hanziData,
              `wiki grapheme.json missing for ${primaryHanzi}`,
            );
            const claimedStrokeCount = parseIndexRanges(
              component.strokes,
            ).length;
            const expectedStrokeCount =
              graphemeStrokeCount(hanziData) + (component.strokeDiff ?? 0);

            try {
              expect(
                claimedStrokeCount,
                `${primaryHanzi} stroke count does not match wiki data`,
              ).toEqual(expectedStrokeCount);
            } catch (error) {
              errors.push([grapheme, error]);
            }
          }
        }
      }
    }

    expect(errors).toEqual([]);
  });
});

describe(
  `allGraphemeComponents suite` satisfies HasNameOf<
    typeof allGraphemeComponents
  >,
  () => {
    test(`flat depth`, () => {
      const component1 = { hanzi: `A`, strokes: `0-1` };
      const component2 = { hanzi: `B`, strokes: `2-3` };

      const layout = [`⿰`, component1, component2] as const;
      expect([...allGraphemeComponents(layout)]).toEqual([
        component1,
        component2,
      ]);
    });

    test(`nested depth`, () => {
      const component1 = { hanzi: `A`, strokes: `0-1` };
      const component2 = { hanzi: `B`, strokes: `2-3` };
      const component3 = { hanzi: `C`, strokes: `4-5` };

      const layout = [
        `⿰`,
        component1,
        [`⿱`, component2, component3],
      ] as const;
      expect([...allGraphemeComponents(layout)]).toEqual([
        component1,
        component2,
        component3,
      ]);
    });
  },
);
