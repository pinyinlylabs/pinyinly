import type { WikiGraphemeData } from "#data/hanzi.js";
import {
  componentToString,
  graphemeStrokeCount,
  idsNodeToString,
  isHanziGrapheme,
  walkIdsNodeLeafs,
  wikiGraphemeDataSchema,
} from "#data/hanzi.js";
import type { HanziText } from "#data/model.js";
import type { CharactersKey, CharactersValue } from "#dictionary/dictionary.js";
import {
  getIsComponentFormHanzi,
  getIsStructuralHanzi,
  hanziToHanziWordMap,
  loadCharacters,
  lookupHanzi,
} from "#dictionary/dictionary.js";
import { IS_CI } from "#util/env.js";
import { normalizeIndexRanges, parseIndexRanges } from "#util/indexRanges.js";
import { createSpeechFileTests } from "@pinyinly/audio-sprites/testing";
import {
  memoize0,
  memoize1,
  sortComparatorNumber,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import {
  existsSync,
  glob,
  readFileSync,
  writeJsonFileIfChanged,
} from "@pinyinly/lib/fs";
import {
  invariant,
  nonNullable,
  uniqueInvariant,
} from "@pinyinly/lib/invariant";
import * as fontkit from "fontkit";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { projectRoot } from "../helpers.ts";

const wikiDir = path.join(projectRoot, `src/client/wiki`);
const dictionaryDir = path.join(projectRoot, `src/dictionary`);

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
        expect.soft(hasMdx(), hanzi).toBeTruthy();
      }
    }
  });

  test(`should contain a <WikiHanziGraphemeDecomposition>`, () => {
    for (const { hanzi, isGrapheme, hasMdx, getMdx } of data) {
      if (isGrapheme && hasMdx()) {
        const mdx = getMdx();
        const match = [...mdx.matchAll(/<WikiHanziGraphemeDecomposition\s+/g)];
        expect
          .soft(
            match.length,
            `${hanzi} MDX does not have exactly one <WikiHanziGraphemeDecomposition> component`,
          )
          .toEqual(1);
      }
    }
  });
});

describe(`grapheme.json files`, async () => {
  const getDataForGrapheme = memoize1(
    (grapheme: string): WikiGraphemeData | undefined => {
      const filePath = path.join(wikiDir, grapheme, `grapheme.json`);
      if (existsSync(filePath)) {
        try {
          const json = JSON.parse(readFileSync(filePath, `utf-8`));
          return wikiGraphemeDataSchema.parse(json);
        } catch (error) {
          throw new Error(`failed to read and parse ${filePath}`, {
            cause: error,
          });
        }
      }
    },
  );
  const graphemeFiles = await glob(path.join(wikiDir, `*/`)).then((dirPaths) =>
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
  expect(graphemeFiles.length).toBeGreaterThan(0);
  const isComponentFormHanzi = await getIsComponentFormHanzi();

  test(`graphemes in the dictionary with 5+ strokes have mnemonic components`, async () => {
    const atomicGraphemes = new Set([`非`, `臣`, `襾`, `舟`]);

    for (const { grapheme, graphemeData } of graphemeFiles) {
      const meanings = await lookupHanzi(grapheme);
      if (
        graphemeStrokeCount(graphemeData) <= 4 ||
        meanings.length === 0 ||
        isComponentFormHanzi(grapheme) ||
        graphemeData.traditionalFormOf != null ||
        atomicGraphemes.has(grapheme)
      ) {
        continue;
      }

      invariant(graphemeData.mnemonic != null, `missing mnemonic`);
      expect
        .soft(
          [...walkIdsNodeLeafs(graphemeData.mnemonic.components)].length,
          `${grapheme} missing 2+ mnemonic components`,
        )
        .toBeGreaterThanOrEqual(2);
    }
  });

  test(`component strokes conformance`, async () => {
    for (const { grapheme, graphemeData } of graphemeFiles) {
      if (graphemeData.mnemonic?.components) {
        for (const component of walkIdsNodeLeafs(
          graphemeData.mnemonic.components,
        )) {
          const strokeIndices = parseIndexRanges(component.strokes);
          // no duplicate stroke indicies in components (e.g. ❌ 0-3,2)
          expect
            .soft(() => {
              uniqueInvariant(strokeIndices);
            }, grapheme)
            .not.toThrow();

          if (Array.isArray(graphemeData.strokes)) {
            // at least one stroke if there's SVG stroke data
            expect.soft(strokeIndices.length, grapheme).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test(`component index ranges are normalized`, () => {
    for (const { grapheme, graphemeData } of graphemeFiles) {
      if (graphemeData.mnemonic?.components) {
        for (const [i, component] of [
          ...walkIdsNodeLeafs(graphemeData.mnemonic.components),
        ].entries()) {
          const normalized = normalizeIndexRanges(component.strokes);
          expect
            .soft(
              component.strokes,
              `${grapheme} component ${i} strokes are not normalized`,
            )
            .toEqual(normalized);
        }
      }
    }
  });

  test(`components do not use invalid "hanzi" strings`, async () => {
    const bannedCharacters = new Set();

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

    for (const { grapheme, graphemeData } of graphemeFiles) {
      if (graphemeData.mnemonic?.components) {
        for (const component of walkIdsNodeLeafs(
          graphemeData.mnemonic.components,
        )) {
          expect
            .soft(bannedCharacters, grapheme)
            .not.toContain(component.hanzi);
        }
      }
    }
  });

  test(`number of mnemonic stories matches number of meanings for hanzi`, async () => {
    for (const { grapheme, graphemeData } of graphemeFiles) {
      if (graphemeData.mnemonic?.stories) {
        const hanziWordMeanings = await lookupHanzi(grapheme);

        const storiesCount = graphemeData.mnemonic.stories.length;
        const meaningsCount = hanziWordMeanings.length;

        expect
          .soft(
            storiesCount,
            `${grapheme} has ${storiesCount} mnemonic stories but ${meaningsCount} meanings in dictionary`,
          )
          .toBe(meaningsCount);
      }
    }
  });

  test(`all strokes are covered by mnemonic components`, async () => {
    for (const { grapheme, graphemeData } of graphemeFiles) {
      if (!Array.isArray(graphemeData.strokes)) {
        // There's no point having components referencing strokes if we don't
        // have any SVG stroke paths to draw.
        continue;
      }

      if (graphemeData.mnemonic?.components) {
        const allComponentStrokes = new Set<number>();
        for (const component of walkIdsNodeLeafs(
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
          expect
            .soft(
              allComponentStrokes.has(strokeIndex),
              `${grapheme} stroke ${strokeIndex} is not covered by any mnemonic component`,
            )
            .toBe(true);
        }
      }
    }
  });

  test(`mnemonic component strokes match the hanzi stroke count`, async () => {
    for (const { grapheme, graphemeData } of graphemeFiles) {
      if (graphemeData.mnemonic?.components) {
        for (const [i, component] of [
          ...walkIdsNodeLeafs(graphemeData.mnemonic.components),
        ].entries()) {
          const primaryHanzi = component.hanzi?.split(`,`)[0];
          if (primaryHanzi != null) {
            const hanziData = getDataForGrapheme(primaryHanzi);

            expect
              .soft(
                hanziData,
                `${grapheme} component ${i} (${primaryHanzi}) data`,
              )
              .toBeTruthy();
            if (hanziData == null) {
              continue;
            }

            const claimedStrokeCount = parseIndexRanges(
              component.strokes,
            ).length;

            if (
              claimedStrokeCount === 0 &&
              !Array.isArray(graphemeData.strokes)
            ) {
              // There's no point having components referencing strokes if we don't
              // have any SVG stroke paths to draw.
              continue;
            }

            const expectedStrokeCount =
              graphemeStrokeCount(hanziData) + (component.strokeDiff ?? 0);

            expect
              .soft(
                claimedStrokeCount,
                `${grapheme} component ${i} (${primaryHanzi}) stroke count does not match character data`,
              )
              .toEqual(expectedStrokeCount);
          }
        }
      }
    }
  });

  test(`has font glyph`, async () => {
    const fonts = await getFonts();
    const sourceFontUsage = new Map<(typeof fonts)[number], string[]>();
    const subsetFontMissingChars = new Map<(typeof fonts)[number], string[]>();

    for (const { grapheme } of graphemeFiles) {
      const codePoint = nonNullable(grapheme.codePointAt(0));
      const codePointHuman = `${grapheme} (U+${codePoint.toString(16)})`;

      const hasFontGlyph = fonts.some((font) => {
        // Check the source font, then make sure it's in the source.
        const isInSource = font.source.hasGlyphForCodePoint(codePoint);
        if (isInSource) {
          const usage = sourceFontUsage.get(font) ?? [];
          usage.push(grapheme);
          sourceFontUsage.set(font, usage);

          const subsetHasGlyph = font.subset?.hasGlyphForCodePoint(codePoint);
          if (!subsetHasGlyph) {
            const missing = subsetFontMissingChars.get(font) ?? [];
            missing.push(grapheme);
            subsetFontMissingChars.set(font, missing);
          }

          expect
            .soft(
              subsetHasGlyph,
              `${codePointHuman} should be in ${font.subsetPath}`,
            )
            .toBe(true);
        }

        return isInSource;
      });

      expect.soft(hasFontGlyph, codePointHuman).toBe(true);
    }

    const fontsByUsage = [...sourceFontUsage.entries()].sort(
      sortComparatorNumber(([_, chars]) => -chars.length),
    );

    // Make sure the font usage is in descending order.
    expect(
      fontsByUsage.map(([{ name }]) => name),
      `font order should be match usage`,
    ).toEqual(fonts.map(({ name }) => name));

    const requiredUpdateCommands = [...subsetFontMissingChars.keys()].map(
      (font) => {
        const chars = nonNullable(sourceFontUsage.get(font));
        return `fonttools subset '${font.sourcePath}' --unicodes='${chars.map((c) => nonNullable(c.codePointAt(0)).toString(16)).join(`,`)}'`;
      },
    );

    expect(requiredUpdateCommands, `commands to update font subsets`).toEqual(
      [],
    );
  });

  test(`consistency with characters.asset.json`, async () => {
    const expected = new Map<CharactersKey, CharactersValue>();

    for (const { grapheme, graphemeData } of graphemeFiles) {
      if (graphemeData.mnemonic) {
        expected.set(grapheme, {
          decomposition: idsNodeToString(
            graphemeData.mnemonic.components,
            componentToString,
          ),
        });
      }
    }

    if (!IS_CI) {
      await writeJsonFileIfChanged(
        path.join(dictionaryDir, `characters.asset.json`),
        [...expected.entries()].sort(
          sortComparatorString(([character]) => character),
        ),
        2,
      );
    }

    const actual = await loadCharacters();
    expect(expected).toEqual(actual);
  });
});

interface TestFont {
  name: string;
  subset: fontkit.Font | null;
  source: fontkit.Font;
  sourcePath: string;
  subsetPath: string;
}

async function getFonts(): Promise<TestFont[]> {
  async function openTtf(ttfPath: string): Promise<fontkit.Font | null> {
    let font;
    try {
      font = await fontkit.open(ttfPath);
    } catch (error) {
      console.warn(`couldn't open font at ${ttfPath}: ${error}`);
      return null;
    }
    invariant(font.type === `TTF`, `expected ${ttfPath} to be a TTF font`);
    return font;
  }

  async function getTestFont(relativeBasePath: string): Promise<TestFont> {
    const basePath = path.join(
      projectRoot,
      `src/assets/fonts`,
      relativeBasePath,
    );
    const sourcePath = `${basePath}.ttf`;
    const subsetPath = `${basePath}.subset.ttf`;

    return {
      name: path.basename(relativeBasePath),
      subset: await openTtf(subsetPath),
      subsetPath,
      source: nonNullable(await openTtf(sourcePath)),
      sourcePath,
    };
  }

  return [
    await getTestFont(`MiSans/MiSansVF`),
    await getTestFont(`MiSans/MiSans L3`),
    await getTestFont(`NotoSansSC-VariableFont_wght`),
    await getTestFont(`PinyinlyComponentsVF`),
  ];
}
