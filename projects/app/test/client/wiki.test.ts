// pyly-not-src-test

import {
  readDictionaryJson,
  unparseDictionaryJson,
} from "#bin/util/dictionary.ts";
import {
  dataDir,
  dictionaryFilePath,
  projectRoot,
  wikiDir,
} from "#bin/util/paths.ts";
import {
  characterStrokeCount,
  idsApplyTransforms,
  idsNodeToString,
  isHanziCharacter,
  makeVerticalMergeCharacterIdsTransform,
  parseIds,
  walkIdsNodeLeafs,
} from "#data/hanzi.js";
import type {
  CharactersKey,
  CharactersValue,
  HanziCharacter,
  HanziText,
  IdsNode,
  CharacterJson,
} from "#data/model.js";
import { characterJsonSchema } from "#data/model.js";
import { matchAllPinyinUnits, normalizePinyinText } from "#data/pinyin.js";
import {
  buildHanziWord,
  getIsComponentFormHanzi,
  getIsStructuralHanzi,
  hanziFromHanziWord,
  loadDictionary,
} from "#dictionary.js";
import { loadCedictDictionary } from "#test/data/cedict.ts";
import { buildCharactersToCheck } from "#test/data/helpers.ts";
import { getFonts } from "#test/helpers.ts";
import type { StrokeSpecAtom } from "#util/strokeSpec.js";
import {
  flattenStrokeSpecRanges,
  normalizeStrokeSpec,
  parseStrokeSpec,
} from "#util/strokeSpec.js";
import { buildStrokeSpecSegmentPaths } from "#util/strokeSpecSvgProcessor.js";
import { createAudioFileTests } from "@pinyinly/audio-sprites/testing";
import {
  memoize0,
  memoize1,
  sortComparatorNumber,
  sortComparatorString,
} from "@pinyinly/lib/collections";
import {
  existsSync,
  glob,
  mkdir,
  readdir,
  readFileSync,
  rm,
} from "@pinyinly/lib/fs";
import { invariant, nonNullable } from "@pinyinly/lib/invariant";
import { jsonCodec } from "@pinyinly/lib/zod";
import isEqual from "lodash/isEqual";
import path from "node:path";
import SVGPathCommander from "svg-path-commander";
import { describe, expect, test } from "vitest";

describe(`speech files`, async () => {
  await createAudioFileTests({
    audioGlob: path.join(wikiDir, `**/*.{mp3,m4a,aac}`),
    projectRoot,
    autoFixLoudness: false,
    autoFixTrimSilence: false,
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

describe(`character.json files`, async () => {
  const characterStrokeSvgsDir = path.join(
    projectRoot,
    `public`,
    `raw`,
    `svgs`,
  );

  const getCharacterJson = memoize1(
    (character: string): CharacterJson | undefined => {
      const filePath = path.join(wikiDir, character, `character.json`);
      if (existsSync(filePath)) {
        try {
          const json = JSON.parse(readFileSync(filePath, `utf-8`)) as unknown;
          return characterJsonSchema.parse(json);
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
              characterJson: nonNullable(getCharacterJson(character)),
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

      for (const { character, characterJson } of characterFiles) {
        if (character === replacement || ignored.includes(character)) {
          continue;
        }

        if (characterJson.decompositions != null) {
          for (const ids of Object.keys(characterJson.decompositions)) {
            const x = parseIds(ids);
            const x2 = idsApplyTransforms(x, [transform]);

            const xString = idsNodeToString(x, (x) => x);
            const x2String = idsNodeToString(x2, (x) => x);
            expect
              .soft(x2String, `${character} normalized form`)
              .toEqual(xString);
          }
        }
      }
    }
  });

  test(`characters in the dictionary with 5+ strokes have decompositions`, async () => {
    const atomicCharacters = new Set([
      `非`,
      `臣`,
      `襾`,
      `舟`,
      `母`,
      `𩰋`,
      `𡗗`,
      `年`,
      `耳`,
    ]);
    const dictionary = await loadDictionary();

    for (const { character, characterJson, filePath } of characterFiles) {
      const meanings = dictionary.lookupHanzi(character);
      const svgStrokeCount = characterStrokeCount(characterJson);
      if (
        svgStrokeCount <= 4 ||
        meanings.length === 0 ||
        isComponentFormHanzi(character) ||
        characterJson.simplifiedForm != null ||
        atomicCharacters.has(character)
      ) {
        continue;
      }

      expect
        .soft(characterJson, `${filePath} to have mnemonic`)
        .toHaveProperty(`mnemonic`);
      expect
        .soft(characterJson.mnemonic, `${filePath} to have mnemonic`)
        .toBeDefined();

      expect(
        Object.keys(characterJson.decompositions ?? {}).length,
        `${filePath} has at least one decomposition`,
      ).toBeGreaterThan(0);
    }
  });

  test(`decomposition strokes conformance`, async () => {
    for (const { character, characterJson } of characterFiles) {
      if (
        characterJson.decompositions != null &&
        Array.isArray(characterJson.svg.strokes)
      ) {
        for (const [ids, strokeSpecs] of Object.entries(
          characterJson.decompositions,
        )) {
          expect
            .soft(strokeSpecs.length, `${character} IDS: ${ids}`)
            .toBeGreaterThan(0);
        }
      }
    }
  });

  test(`.mnemonic.decomposition reference exists in .decompositions`, async () => {
    for (const { characterJson, filePath } of characterFiles) {
      if (characterJson.mnemonic?.decomposition == null) {
        continue;
      }

      expect
        .soft(Object.keys(characterJson.decompositions ?? {}), `${filePath}`)
        .toContain(characterJson.mnemonic.decomposition);
    }
  });

  test(`decompositions don't reference the current character causing infinite loops`, async () => {
    for (const { character, characterJson, filePath } of characterFiles) {
      if (characterJson.decompositions != null) {
        for (const ids of Object.keys(characterJson.decompositions)) {
          const leafs = [...walkIdsNodeLeafs(parseIds(ids))];
          expect
            .soft(leafs, `${filePath} IDS: ${ids}`)
            .not.toContain(character);
        }
      }
    }
  });

  test(`stroke medians conformance`, async () => {
    for (const { character, characterJson } of characterFiles) {
      if (characterJson.svg.medians == null) {
        continue;
      }

      expect
        .soft(
          Array.isArray(characterJson.svg.strokes),
          `${character} medians require SVG strokes`,
        )
        .toBe(true);
      if (!Array.isArray(characterJson.svg.strokes)) {
        continue;
      }

      expect
        .soft(
          characterJson.svg.medians.length,
          `${character} medians length must match strokes length`,
        )
        .toBe(characterJson.svg.strokes.length);

      for (const [i, medianPath] of characterJson.svg.medians.entries()) {
        const totalLength = SVGPathCommander.getTotalLength(medianPath);
        expect
          .soft(
            Number.isFinite(totalLength) && totalLength > 0,
            `${character} median ${i} should be a valid non-empty SVG path`,
          )
          .toBe(true);
      }
    }
  });

  test(`decomposition stroke specs are normalized`, async () => {
    for (const { characterJson, filePath } of characterFiles) {
      if (characterJson.decompositions) {
        const expected = {
          ...characterJson,
          decompositions: Object.fromEntries(
            Object.entries(characterJson.decompositions).map(
              ([ids, strokeSpecs]) => [
                ids,
                strokeSpecs.map(normalizeStrokeSpec),
              ],
            ),
          ),
        };

        await expect.soft(expected).toMatchJsonFileSnapshot(filePath);
      }
    }
  });

  test.skip(`mnemonic decomposition IDS does not use invalid "hanzi" strings`, async () => {
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
    ].flatMap((x) => x.split(/\s+/gu))) {
      bannedCharacters.add(char);
    }

    const charactersToCheck = await buildCharactersToCheck();
    for (const { character, characterJson, filePath } of characterFiles) {
      if (charactersToCheck.has(character)) {
        const ids = characterJson.mnemonic?.decomposition;
        if (ids) {
          for (const leaf of walkIdsNodeLeafs(
            parseIds(ids) as IdsNode<HanziCharacter>,
          )) {
            if (characterJson.mnemonic?.components?.[leaf]?.label != null) {
              // If there's a label defined for the component, then it's okay to
              // use it in the mnemonic decomposition, even if it's a banned
              // character.
              continue;
            }
            expect
              .soft(bannedCharacters, `${filePath} IDS: ${ids} leaf: ${leaf}`)
              .not.toContain(leaf);
          }
        }
      }
    }
  });

  test(`number of mnemonic hints matches number of meanings for hanzi`, async () => {
    const dictionary = await loadDictionary();

    for (const { character, characterJson } of characterFiles) {
      if (characterJson.mnemonic?.hints) {
        const hanziWordMeanings = dictionary.lookupHanzi(character);

        const hintsCount = characterJson.mnemonic.hints.length;
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

    for (const { character, characterJson } of characterFiles) {
      if (characterJson.mnemonic?.hints) {
        for (const hint of characterJson.mnemonic.hints) {
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

  test(`all strokes are covered by decompositions`, async () => {
    const charactersToCheck = await buildCharactersToCheck();

    for (const { character, characterJson, filePath } of characterFiles) {
      if (!charactersToCheck.has(character)) {
        continue;
      }

      if (
        characterJson.decompositions == null ||
        Object.keys(characterJson.decompositions).length === 0
      ) {
        continue;
      }

      const allComponentStrokes = new Set<number>();
      function processStrokeSpecAtom(atom: StrokeSpecAtom) {
        switch (atom.kind) {
          case `range`: {
            for (let i = atom.start; i <= atom.end; i++) {
              allComponentStrokes.add(i);
            }
            break;
          }
          case `slice`: {
            allComponentStrokes.add(atom.stroke);
            break;
          }
        }
      }

      for (const strokeSpecs of Object.values(characterJson.decompositions)) {
        for (const strokeSpec of strokeSpecs) {
          for (const item of parseStrokeSpec(strokeSpec)) {
            for (const atom of item) {
              processStrokeSpecAtom(atom);
            }
          }
        }
      }

      const totalStrokes = characterStrokeCount(characterJson);
      const expectedStrokes = Array.from({ length: totalStrokes }, (_, i) => i);

      for (const strokeIndex of expectedStrokes) {
        expect
          .soft(
            allComponentStrokes.has(strokeIndex),
            `${filePath} stroke ${strokeIndex} is not covered by any mnemonic component`,
          )
          .toBe(true);
      }
    }
  });

  test(`decomposition strokes match the hanzi stroke count`, async () => {
    const charactersToCheck = await buildCharactersToCheck();

    for (const { character, characterJson, filePath } of characterFiles) {
      if (charactersToCheck.has(character) && characterJson.decompositions) {
        for (const [ids, strokeSpecs] of Object.entries(
          characterJson.decompositions,
        )) {
          let i = -1;
          for (const leaf of walkIdsNodeLeafs(parseIds(ids))) {
            i++;

            const hanziData = getCharacterJson(leaf);
            if (Array.isArray(hanziData?.svg.strokes)) {
              const strokeSpecText = nonNullable(strokeSpecs[i]);
              const strokeSpec = flattenStrokeSpecRanges(
                parseStrokeSpec(strokeSpecText),
              );

              expect
                .soft(
                  strokeSpec.length,
                  `${filePath} IDS ${ids} (${leaf}) stroke count`,
                )
                .toEqual(hanziData.svg.strokes.length);
            }
          }
        }
      }
    }
  });

  test(`.strokes is SVG paths not just a count`, async () => {
    const charactersToCheck = await buildCharactersToCheck();

    for (const { character, characterJson, filePath } of characterFiles) {
      if (charactersToCheck.has(character)) {
        expect
          .soft(
            characterJson.svg.strokes,
            `${filePath} .strokes should be an array of SVG paths`,
          )
          .toBeTypeOf(`object`);
      }
    }
  });

  test(`svg.segments is populated from decompositions`, async () => {
    const charactersToCheck = await buildCharactersToCheck();

    for (const { character, characterJson, filePath } of characterFiles) {
      if (charactersToCheck.has(character)) {
        let segments: Record<string, string> | undefined = undefined;

        const strokeSpecTexts = Object.values(
          characterJson.decompositions ?? {},
        ).flat();

        if (strokeSpecTexts.length > 0) {
          if (!Array.isArray(characterJson.svg.strokes)) {
            continue;
          }
          expect
            .soft(
              characterJson.svg.strokes,
              `${filePath} svg.strokes should not be a number`,
            )
            .not.toBeTypeOf(`number`);
          if (!Array.isArray(characterJson.svg.strokes)) {
            continue;
          }

          const result = buildStrokeSpecSegmentPaths(
            characterJson.svg.strokes,
            characterJson.svg.medians,
            strokeSpecTexts,
          );
          if (Object.keys(result).length > 0) {
            segments = result;
          }
        }

        const expected = {
          ...characterJson,
          svg: {
            ...characterJson.svg,
            segments,
          },
        };

        await expect.soft(expected).toMatchJsonFileSnapshot(filePath);
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

    for (const { character, characterJson } of characterFiles) {
      expected.set(character, {
        mnemonic: characterJson.mnemonic?.decomposition,
        ...(characterJson.decompositions == null
          ? {}
          : { decompositions: characterJson.decompositions }),
        ...(characterJson.componentFormOf === undefined
          ? {}
          : { componentFormOf: characterJson.componentFormOf }),
        ...(characterJson.isStructural === undefined
          ? {}
          : { isStructural: characterJson.isStructural }),
        ...(characterJson.canonicalForm === undefined
          ? {}
          : { canonicalForm: characterJson.canonicalForm }),
      });
    }

    await expect(
      [...expected.entries()].sort(
        sortComparatorString(([character]) => character),
      ),
    ).toMatchJsonFileSnapshot(path.join(dataDir, `characters.asset.json`));
  });

  test(`consistency with public/raw/svgs/*.json`, async () => {
    const expected = new Map<
      HanziText,
      {
        strokes: string[];
        medians?: string[];
        segments?: Record<string, string>;
      }
    >();

    for (const { character, characterJson } of characterFiles) {
      if (Array.isArray(characterJson.svg.strokes)) {
        const hasMedians =
          Array.isArray(characterJson.svg.medians) &&
          characterJson.svg.medians.length > 0;
        const hasSegments =
          characterJson.svg.segments != null &&
          Object.keys(characterJson.svg.segments).length > 0;
        expected.set(character, {
          strokes: characterJson.svg.strokes,
          ...(hasMedians ? { medians: characterJson.svg.medians } : {}),
          ...(hasSegments ? { segments: characterJson.svg.segments } : {}),
        });
      }
    }

    await mkdir(characterStrokeSvgsDir, { recursive: true });

    const expectedFileNames = new Set(
      [...expected.keys()].map((character) => `${character}.json`),
    );

    for (const fileName of await readdir(characterStrokeSvgsDir)) {
      if (!fileName.endsWith(`.json`) || expectedFileNames.has(fileName)) {
        continue;
      }

      await rm(path.join(characterStrokeSvgsDir, fileName));
    }

    for (const [character, strokeData] of expected.entries()) {
      await expect
        .soft(strokeData, `${character} stroke data`)
        .toMatchJsonFileSnapshot(
          path.join(characterStrokeSvgsDir, `${character}.json`),
        );
    }
  });

  async function* getAllCharacterJson(): AsyncIterableIterator<{
    character: HanziCharacter;
    characterJson: CharacterJson;
    filePath: string;
  }> {
    const characterJsonFilePaths = await glob(
      path.join(wikiDir, `*`, `/character.json`),
    );
    for (const filePath of characterJsonFilePaths) {
      const characterJson = jsonCodec(characterJsonSchema).parse(
        readFileSync(filePath, `utf-8`),
        { reportInput: true },
      );

      yield {
        character: characterJson.hanzi,
        characterJson,
        filePath,
      };
    }
  }

  test(`.curriculumMeanings creates dictionary.asset.json entries`, async () => {
    const dict = await readDictionaryJson();

    for await (const { characterJson } of getAllCharacterJson()) {
      if (characterJson.curriculumMeanings != null) {
        // Delete any existing hanzi words
        {
          const existingHanziWords = dict
            .keys()
            .filter((x) => hanziFromHanziWord(x) === characterJson.hanzi);

          for (const hanziWord of existingHanziWords) {
            dict.delete(hanziWord);
          }
        }

        // Insert new hanzi words
        for (const [
          order,
          meaning,
        ] of characterJson.curriculumMeanings.entries()) {
          dict.set(meaning.id, {
            order,
            gloss: [meaning.gloss],
            pinyin: [meaning.pinyin],
            hsk: meaning.hsk3,
          });
        }

        await expect(unparseDictionaryJson(dict)).toMatchJsonFileSnapshot(
          dictionaryFilePath,
        );
      }
    }
  });

  test(`.curriculumMeanings[*].branches[*].occurrences pinyin exists in CEDICT data`, async () => {
    const dict = await readDictionaryJson();
    const cedictDictionary = await loadCedictDictionary();

    for await (const { filePath, characterJson } of getAllCharacterJson()) {
      if (characterJson.curriculumMeanings != null) {
        // Delete any existing hanzi words
        {
          const existingHanziWords = dict
            .keys()
            .filter((x) => hanziFromHanziWord(x) === characterJson.hanzi);

          for (const hanziWord of existingHanziWords) {
            dict.delete(hanziWord);
          }
        }

        // Insert new hanzi words
        for (const meaning of characterJson.curriculumMeanings) {
          if (!meaning.branches) {
            continue;
          }

          for (const branch of meaning.branches) {
            for (const [hanziStr, pinyin] of Object.entries(
              branch.occurrences,
            )) {
              const hanzi = hanziStr as HanziText;
              const entries = cedictDictionary.lookupHanzi(hanzi);
              if (
                entries.some(
                  (entry) => normalizePinyinText(entry.pinyin) === pinyin,
                )
              ) {
                continue;
              }

              // No dictionary match, try to find one.
              const equalPinyinEntries = entries.filter((entry) =>
                isEqual(
                  matchAllPinyinUnits(normalizePinyinText(entry.pinyin)),
                  matchAllPinyinUnits(pinyin),
                ),
              );
              invariant(
                equalPinyinEntries.length === 1,
                `expected exactly one CEDICT entry for ${hanzi} with pinyin ${pinyin}, but found ${equalPinyinEntries.length}`,
              );

              const entry = nonNullable(equalPinyinEntries[0]);
              branch.occurrences[hanzi] = normalizePinyinText(entry.pinyin);
            }
          }
        }

        await expect(characterJson).toMatchJsonFileSnapshot(filePath);
      }
    }
  });
});
