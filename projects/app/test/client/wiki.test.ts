import {
  characterStrokeCount,
  componentToString,
  idsApplyTransforms,
  idsNodeToString,
  isHanziCharacter,
  makeVerticalMergeCharacterIdsTransform,
  mapIdsNodeLeafs,
  walkIdsNodeLeafs,
} from "#data/hanzi.js";
import { wikiCharacterDataSchema } from "#data/model.js";
import type { HanziText, WikiCharacterData } from "#data/model.js";
import {
  buildHanziWord,
  getIsComponentFormHanzi,
  getIsStructuralHanzi,
  loadCharacters,
  loadDictionary,
} from "#dictionary.js";
import type { CharactersKey, CharactersValue } from "#dictionary.js";
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
import path from "node:path";
import { describe, expect, test } from "vitest";
import { dataDir, getFonts, projectRoot, wikiDir } from "../helpers.ts";

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
  const dictionary = await loadDictionary();

  const data = meaningFilePaths.map((filePath) => {
    const hanzi = path.basename(path.dirname(filePath)) as HanziText;
    const isStructural = isStructuralHanzi(hanzi);
    const isInDictionary = dictionary.lookupHanzi(hanzi).length > 0;
    const projectRelPath = path.relative(projectRoot, filePath);
    const hasMdx = memoize0(() => existsSync(filePath));
    const hasCharacterData = memoize0(() =>
      existsSync(path.join(path.dirname(filePath), `character.json`)),
    );
    const getMdx = memoize0(() => readFileSync(filePath, `utf-8`));

    return {
      hanzi,
      isStructural,
      isInDictionary,
      projectRelPath,
      hasMdx,
      getMdx,
      hasCharacterData,
      filePath,
    };
  });

  test(`existence`, () => {
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

  test(`should contain a <WikiHanziCharacterIntro>`, () => {
    for (const { hanzi, hasMdx, getMdx } of data) {
      if (isHanziCharacter(hanzi) && hasMdx()) {
        const mdx = getMdx();
        const match = [...mdx.matchAll(/<WikiHanziCharacterIntro\s+/g)];
        expect
          .soft(
            match.length,
            `${hanzi} MDX does not have exactly one <WikiHanziCharacterIntro> component`,
          )
          .toEqual(1);
      }
    }
  });

  test(`should export characterData when character.json exists`, () => {
    for (const { hanzi, hasMdx, getMdx, hasCharacterData } of data) {
      if (!hasMdx()) {
        continue;
      }

      if (!hasCharacterData()) {
        continue;
      }

      const mdx = getMdx();
      expect
        .soft(
          mdx,
          `${hanzi} MDX has character.json but does not export characterData`,
        )
        .toMatch(/export\s*\{\s*characterData\s*\}/);
    }
  });
});

describe(`character.json files`, async () => {
  const getCharacterData = memoize1(
    (character: string): WikiCharacterData | undefined => {
      const filePath = path.join(wikiDir, character, `character.json`);
      if (existsSync(filePath)) {
        try {
          const json = JSON.parse(readFileSync(filePath, `utf-8`)) as unknown;
          return wikiCharacterDataSchema.parse(json);
        } catch (error) {
          throw new Error(`failed to read and parse ${filePath}`, {
            cause: error,
          });
        }
      }
    },
  );
  const characterFiles = await glob(path.join(wikiDir, `*/`)).then((dirPaths) =>
    dirPaths.flatMap((dirPath) => {
      const character = path.basename(dirPath) as HanziText;
      const filePath = path.join(wikiDir, character, `character.json`);
      return isHanziCharacter(character)
        ? ([
            {
              character,
              characterData: nonNullable(getCharacterData(character)),
              filePath,
            },
          ] as const)
        : [];
    }),
  );
  expect(characterFiles.length).toBeGreaterThan(0);
  const isComponentFormHanzi = await getIsComponentFormHanzi();

  test(`𠮛 is used instead of ⿱一口 in decompositions`, async () => {
    const specs: [pattern: string, replacement: string, ignored: string[]][] = [
      [`⿱一口`, `𠮛`, [`事`]],
    ];

    for (const [pattern, replacement, ignored] of specs) {
      let transform;

      if (pattern.startsWith(`⿱`)) {
        transform = makeVerticalMergeCharacterIdsTransform(
          pattern[1]!,
          pattern[2]!,
          replacement,
        );
      }

      invariant(transform != null, `unable to parse transform for ${pattern}`);

      for (const { character, characterData } of characterFiles) {
        if (character === replacement || ignored.includes(character)) {
          continue;
        }

        if (characterData.mnemonic?.components) {
          const x = mapIdsNodeLeafs(characterData.mnemonic.components, (x) =>
            componentToString(x),
          );
          const x2 = idsApplyTransforms(x, [transform]);

          const xString = idsNodeToString(x, (x) => x);
          const x2String = idsNodeToString(x2, (x) => x);
          expect
            .soft(x2String, `${character} normalized form`)
            .toEqual(xString);
        }
      }
    }
  });

  test(`characters in the dictionary with 5+ strokes have mnemonic components`, async () => {
    const atomicCharacters = new Set([`非`, `臣`, `襾`, `舟`, `母`, `𩰋`]);
    const dictionary = await loadDictionary();

    for (const { character, characterData } of characterFiles) {
      const meanings = dictionary.lookupHanzi(character);
      if (
        characterStrokeCount(characterData) <= 4 ||
        meanings.length === 0 ||
        isComponentFormHanzi(character) ||
        characterData.simplifiedForm != null ||
        atomicCharacters.has(character)
      ) {
        continue;
      }

      expect
        .soft(characterData.mnemonic, `${character} to have mnemonic`)
        .toBeDefined();
      if (characterData.mnemonic != null) {
        expect
          .soft(
            [...walkIdsNodeLeafs(characterData.mnemonic.components)].length,
            `${character} missing 2+ mnemonic components`,
          )
          .toBeGreaterThanOrEqual(2);
      }
    }
  });

  test(`component strokes conformance`, async () => {
    for (const { character, characterData } of characterFiles) {
      if (characterData.mnemonic?.components) {
        for (const component of walkIdsNodeLeafs(
          characterData.mnemonic.components,
        )) {
          const strokeIndices = parseIndexRanges(component.strokes);
          // no duplicate stroke indicies in components (e.g. ❌ 0-3,2)
          expect
            .soft(() => {
              uniqueInvariant(strokeIndices);
            }, character)
            .not.toThrow();

          if (Array.isArray(characterData.strokes)) {
            // at least one stroke if there's SVG stroke data
            expect.soft(strokeIndices.length, character).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  test(`component index ranges are normalized`, () => {
    for (const { character, characterData } of characterFiles) {
      if (characterData.mnemonic?.components) {
        for (const [i, component] of [
          ...walkIdsNodeLeafs(characterData.mnemonic.components),
        ].entries()) {
          const normalized = normalizeIndexRanges(component.strokes);
          expect
            .soft(
              component.strokes,
              `${character} component ${i} strokes are not normalized`,
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

    for (const { character, characterData } of characterFiles) {
      if (characterData.mnemonic?.components) {
        for (const component of walkIdsNodeLeafs(
          characterData.mnemonic.components,
        )) {
          expect
            .soft(bannedCharacters, character)
            .not.toContain(component.hanzi);
        }
      }
    }
  });

  test(`number of mnemonic hints matches number of meanings for hanzi`, async () => {
    const dictionary = await loadDictionary();

    for (const { character, characterData } of characterFiles) {
      if (characterData.mnemonic?.hints) {
        const hanziWordMeanings = dictionary.lookupHanzi(character);

        const hintsCount = characterData.mnemonic.hints.length;
        const meaningsCount = hanziWordMeanings.length;

        expect
          .soft(
            hintsCount,
            `${character} has ${hintsCount} mnemonic hints but ${meaningsCount} meanings in dictionary`,
          )
          .toBe(meaningsCount);
      }
    }
  });

  test(`all mnemonic hint meaningKeys are valid dictionary entries`, async () => {
    const dictionary = await loadDictionary();

    for (const { character, characterData } of characterFiles) {
      if (characterData.mnemonic?.hints) {
        for (const hint of characterData.mnemonic.hints) {
          const hanziWord = buildHanziWord(character, hint.meaningKey);
          expect
            .soft(
              dictionary.lookupHanziWord(hanziWord),
              `${character} has mnemonic hint with meaningKey "${hint.meaningKey}" but no dictionary entry for ${hanziWord}`,
            )
            .not.toBeNull();
        }
      }
    }
  });

  test(`all strokes are covered by mnemonic components`, async () => {
    for (const { character, characterData } of characterFiles) {
      if (!Array.isArray(characterData.strokes)) {
        // There's no point having components referencing strokes if we don't
        // have any SVG stroke paths to draw.
        continue;
      }

      if (characterData.mnemonic?.components) {
        const allComponentStrokes = new Set<number>();
        for (const component of walkIdsNodeLeafs(
          characterData.mnemonic.components,
        )) {
          const strokeIndices = parseIndexRanges(component.strokes);
          for (const index of strokeIndices) {
            allComponentStrokes.add(index);
          }
        }

        const totalStrokes = characterStrokeCount(characterData);
        const expectedStrokes = Array.from(
          { length: totalStrokes },
          (_, i) => i,
        );

        for (const strokeIndex of expectedStrokes) {
          expect
            .soft(
              allComponentStrokes.has(strokeIndex),
              `${character} stroke ${strokeIndex} is not covered by any mnemonic component`,
            )
            .toBe(true);
        }
      }
    }
  });

  test(`mnemonic component strokes match the hanzi stroke count`, async () => {
    for (const { character, characterData } of characterFiles) {
      if (characterData.mnemonic?.components) {
        for (const [i, component] of [
          ...walkIdsNodeLeafs(characterData.mnemonic.components),
        ].entries()) {
          const primaryHanzi = component.hanzi?.split(`,`)[0];
          if (primaryHanzi != null) {
            const hanziData = getCharacterData(primaryHanzi);

            expect
              .soft(
                hanziData,
                `${character} component ${i} (${primaryHanzi}) data`,
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
              !Array.isArray(characterData.strokes)
            ) {
              // There's no point having components referencing strokes if we don't
              // have any SVG stroke paths to draw.
              continue;
            }

            const expectedStrokeCount =
              characterStrokeCount(hanziData) + (component.strokeDiff ?? 0);

            expect
              .soft(
                claimedStrokeCount,
                `${character} component ${i} (${primaryHanzi}) stroke count does not match character data`,
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

    for (const { character } of characterFiles) {
      const codePoint = nonNullable(character.codePointAt(0));
      const codePointHuman = `${character} (U+${codePoint.toString(16)})`;

      const hasFontGlyph = fonts.some((font) => {
        // Check the source font for the glyph, then ensure it's present in the subset font.
        const isInSource = font.source.hasGlyphForCodePoint(codePoint);
        if (isInSource) {
          const usage = sourceFontUsage.get(font) ?? [];
          usage.push(character);
          sourceFontUsage.set(font, usage);

          const subsetHasGlyph = font.subset?.hasGlyphForCodePoint(codePoint);
          if (subsetHasGlyph !== true) {
            const missing = subsetFontMissingChars.get(font) ?? [];
            missing.push(character);
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
      `font order should match usage`,
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

    for (const { character, characterData } of characterFiles) {
      expected.set(character, {
        decomposition:
          characterData.mnemonic == null
            ? undefined
            : idsNodeToString(
                characterData.mnemonic.components,
                componentToString,
              ),
        componentFormOf: characterData.componentFormOf,
        isStructural: characterData.isStructural,
        canonicalForm: characterData.canonicalForm,
      });
    }

    if (!IS_CI) {
      await writeJsonFileIfChanged(
        path.join(dataDir, `characters.asset.json`),
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
