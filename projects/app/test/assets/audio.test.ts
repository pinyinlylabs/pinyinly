// pyly-not-src-test
import "#assets/audio/manifest.json";
import "#assets/audio/manifest.pinyin.json";

import { audioDir, pinyinAudioDir, projectRoot } from "#bin/util/paths.ts";
import { sortComparatorString } from "@pinyinly/lib/collections";
import type { FileNamePart, Voice } from "#bin/util/speech.ts";
import { generateSpeech } from "#bin/util/speech.ts";
import type { PinyinSoundId } from "#data/model.ts";
import {
  defaultPinyinSoundInstructions,
  normalizePinyinUnit,
  splitPinyinUnitTone,
} from "#data/pinyin.js";
import {
  getPinyinUnits,
  getPinyinUnitToHanziCharacter,
} from "#test/data/helpers.ts";
import "#types/hanzi.d.ts";
import { isCi } from "#util/env.ts";
import {
  buildAndTestSprites,
  createAudioFileTests,
} from "@pinyinly/audio-sprites/testing";
import { readFile, writeJsonFileIfChanged } from "@pinyinly/lib/fs";
// oxlint-disable-next-line no-restricted-imports
import path from "node:path";
import { describe, expect, test } from "vitest";
import { z } from "zod/v4";

test(`test sprites`, { timeout: Infinity }, async () => {
  const manifestPath = path.join(projectRoot, `src/assets/audio/manifest.json`);
  await buildAndTestSprites({
    manifestPath,
    autoFix: !isCi,
    spriteFileSizes: [{ name: /^pinyin-/u, minSize: `50kB`, maxSize: `3MB` }],
  });
});

test(`pinyin runtime manifest matches source sprite manifest`, async () => {
  const sourceManifestPath = path.join(audioDir, `manifest.json`);
  const runtimeManifestPath = path.join(audioDir, `manifest.pinyin.json`);

  const sourceManifest = sourceSpriteManifestSchema.parse(
    JSON.parse(await readFile(sourceManifestPath, `utf8`)) as unknown,
  );
  const expectedRuntimeManifest =
    buildPinyinSoundRuntimeManifest(sourceManifest);

  if (!isCi) {
    await writeJsonFileIfChanged(
      runtimeManifestPath,
      expectedRuntimeManifest,
      2,
    );
  }

  const runtimeManifest = pinyinSoundRuntimeManifestSchema.parse(
    JSON.parse(await readFile(runtimeManifestPath, `utf8`)) as unknown,
  );

  expect(runtimeManifest).toEqual(expectedRuntimeManifest);
});

describe(`pinyin sounds`, () => {
  test.skipIf(isCi)(
    `should have audio files for all pinyin units`,
    {
      // In local dev don't timeout, since we want to be able to generate
      // missing files. In CI, use the default timeout to avoid hanging
      // indefinitely.
      timeout: isCi ? undefined : Infinity,
    },
    async () => {
      const VOICE: Voice = `nova`;

      const pinyinUnitToHanziCharacter = await getPinyinUnitToHanziCharacter();

      // These pinyin aren't used so there's basically no pronunciation for
      // them. This list should probably live somewhere else.
      const pinyinToSkip = new Set([`běng`, `rē`, `ré`, `rě`]);

      const missingItems: {
        hanzi: string;
        pinyin: string;
      }[] = [];

      for (const pinyin of getPinyinUnits()) {
        if (pinyinToSkip.has(pinyin)) {
          continue;
        }

        const hanzi = pinyinUnitToHanziCharacter.get(pinyin);

        // Skip pinyin units that don't have hanzi examples, there's another
        // test that checks that all pinyin units have hanzi examples, so this
        // should be caught there.
        if (hanzi == null) {
          continue;
        }

        const exists = await generateSpeech({
          phrase: hanzi,
          voice: VOICE,
          outputDir: pinyinAudioDir,
          fileNameParts: buildAudioFileNameParts(pinyin, hanzi),
          format: `m4a`,
          check: true,
        });

        if (!exists) {
          missingItems.push({ hanzi, pinyin });
        }
      }

      if (missingItems.length > 0) {
        if (isCi) {
          expect(
            missingItems,
            `Missing pinyin audio items. Run locally to generate them.`,
          ).toEqual([]);
        } else {
          for (const item of missingItems) {
            const normalized = normalizePinyinUnit(item.pinyin);
            const { tone } = splitPinyinUnitTone(normalized);
            const instructions = buildToneInstructions(normalized, tone);

            // oxlint-disable-next-line no-console
            console.log(
              `generating audio for missing item in ${pinyinAudioDir}: ${item.pinyin} (${item.hanzi})\n
 - Instructions: ${instructions}\n
 - Prompt: ${item.hanzi}`,
            );

            const ok = await generateSpeech({
              phrase: item.hanzi,
              voice: VOICE,
              outputDir: pinyinAudioDir,
              fileNameParts: buildAudioFileNameParts(item.pinyin, item.hanzi),
              format: `m4a`,
              instructions: instructions,
              samples: 5,
            });

            expect
              .soft(
                ok,
                `Failed to generate audio for missing item in ${pinyinAudioDir}: ${item.pinyin}`,
              )
              .toBe(true);
          }
        }
      }
    },
  );

  describe.skipIf(isCi)(`speech source files`, async () => {
    await createAudioFileTests({
      audioGlob: path.join(pinyinAudioDir, `**/*.{mp3,m4a,aac}`),
      projectRoot,
      autoFixLoudness: false,
      autoFixTrimSilence: !isCi,
      autoFixEmpty: !isCi,
      skipLoudness: true,
    });
  });

  test(`all pinyin units have hanzi examples`, async () => {
    const pinyinUnits = new Set(getPinyinUnits());
    const pinyinUnitsWithHanzi = new Set(
      (await getPinyinUnitToHanziCharacter()).keys(),
    );

    const missing = pinyinUnits.symmetricDifference(pinyinUnitsWithHanzi);

    // Incrementally reduce this list to zero to increase coverage of sounds
    // that can be played.
    expect(missing).toMatchInlineSnapshot(`
      Set {
        "ǎ",
        "à",
        "ê",
        "ēr",
        "án",
        "ǎng",
        "ě",
        "éi",
        "ěi",
        "èi",
        "én",
        "ěn",
        "ōng",
        "óng",
        "ǒng",
        "òng",
        "ēng",
        "éng",
        "ěng",
        "èng",
        "óu",
        "ó",
        "ǒ",
        "ò",
        "zhēi",
        "zhéi",
        "zhěi",
        "zhèi",
        "zháo",
        "zhán",
        "zhén",
        "zháng",
        "zhéng",
        "zhóng",
        "ché",
        "chǎi",
        "chào",
        "shái",
        "shǎi",
        "shēi",
        "shěi",
        "shèi",
        "shóu",
        "shán",
        "sháng",
        "rī",
        "rí",
        "rǐ",
        "rē",
        "ré",
        "rāo",
        "rōu",
        "rǒu",
        "rān",
        "ràn",
        "rēn",
        "rāng",
        "rěng",
        "rèng",
        "rōng",
        "ròng",
        "zí",
        "zǎ",
        "zà",
        "zē",
        "zě",
        "zái",
        "zēi",
        "zěi",
        "zèi",
        "zóu",
        "zēn",
        "zén",
        "záng",
        "zǎng",
        "zéng",
        "zěng",
        "zóng",
        "cá",
        "cà",
        "cē",
        "cé",
        "cě",
        "cēi",
        "céi",
        "cěi",
        "cèi",
        "cōu",
        "cóu",
        "cǒu",
        "cēn",
        "cěn",
        "cèn",
        "cǎng",
        "càng",
        "cěng",
        "cǒng",
        "còng",
        "sí",
        "sá",
        "sē",
        "sé",
        "sě",
        "sái",
        "sǎi",
        "sēi",
        "séi",
        "sěi",
        "sèi",
        "sáo",
        "sóu",
        "sán",
        "sén",
        "sěn",
        "sèn",
        "sáng",
        "séng",
        "sěng",
        "sèng",
        "sóng",
        "béi",
        "bán",
        "bén",
        "báng",
        "pǎ",
        "pǎi",
        "pěi",
        "pǒu",
        "pòu",
        "pǎn",
        "pěn",
        "pèn",
        "pūn",
        "pún",
        "pǔn",
        "pùn",
        "mē",
        "mé",
        "mě",
        "mè",
        "māi",
        "mēi",
        "mòu",
        "mēn",
        "měn",
        "màng",
        "mēng",
        "fāi",
        "fái",
        "fǎi",
        "fài",
        "fōu",
        "fòu",
        "fiāo",
        "fiáo",
        "fiǎo",
        "fiào",
        "fō",
        "fǒ",
        "fò",
        "dě",
        "dè",
        "dái",
        "dēi",
        "déi",
        "děi",
        "dèi",
        "dáo",
        "dóu",
        "dán",
        "dēn",
        "dén",
        "děn",
        "dèn",
        "dáng",
        "déng",
        "dóng",
        "tá",
        "tē",
        "té",
        "tě",
        "tǎi",
        "tēi",
        "téi",
        "těi",
        "tèi",
        "tēng",
        "těng",
        "tèng",
        "nā",
        "nē",
        "né",
        "ně",
        "nāi",
        "nái",
        "nēi",
        "néi",
        "nōu",
        "nóu",
        "nǒu",
        "nàn",
        "nēn",
        "nén",
        "něn",
        "nēng",
        "něng",
        "nèng",
        "nōng",
        "nǒng",
        "lō",
        "ló",
        "lǒ",
        "lò",
        "lē",
        "lé",
        "lě",
        "lāi",
        "lǎi",
        "lēi",
        "lān",
        "lēn",
        "lén",
        "lěn",
        "lèn",
        "lēng",
        "lōng",
        "lòng",
        "gái",
        "gēi",
        "géi",
        "gèi",
        "gáo",
        "góu",
        "gán",
        "gáng",
        "géng",
        "gèng",
        "gīn",
        "gín",
        "gǐn",
        "gìn",
        "gīng",
        "gíng",
        "gǐng",
        "gìng",
        "góng",
        "ká",
        "kà",
        "kái",
        "kēi",
        "kéi",
        "kěi",
        "kèi",
        "káo",
        "kóu",
        "kán",
        "kēn",
        "kén",
        "kǎng",
        "kéng",
        "kěng",
        "kèng",
        "kiū",
        "kiú",
        "kiǔ",
        "kiù",
        "kiāng",
        "kiáng",
        "kiǎng",
        "kiàng",
        "kóng",
        "há",
        "hǎ",
        "hà",
        "hě",
        "hāi",
        "héi",
        "hěi",
        "hèi",
        "hēn",
        "hǎng",
        "hěng",
        "hèng",
        "yué",
        "yuě",
        "nǖ",
        "nǘ",
        "nüē",
        "nüé",
        "nüě",
        "lǖ",
        "lüē",
        "lüé",
        "lüě",
        "lüān",
        "lüán",
        "lüǎn",
        "lüàn",
        "lǖn",
        "lǘn",
        "lǚn",
        "lǜn",
        "juě",
        "juè",
        "juán",
        "jún",
        "jǔn",
        "quě",
        "qǔn",
        "qùn",
        "xǔn",
        "wó",
        "wái",
        "wéng",
        "mū",
        "mú",
        "duí",
        "duǐ",
        "duán",
        "dún",
        "duāng",
        "duáng",
        "duǎng",
        "duàng",
        "tǔn",
        "tùn",
        "nū",
        "nuō",
        "nuǒ",
        "nuī",
        "nuí",
        "nuǐ",
        "nuì",
        "nuān",
        "nuán",
        "nuàn",
        "nūn",
        "nún",
        "nǔn",
        "nùn",
        "luān",
        "lǔn",
        "gú",
        "guá",
        "guái",
        "guí",
        "guán",
        "gūn",
        "gún",
        "guáng",
        "kú",
        "kuá",
        "kuō",
        "kuó",
        "kuǒ",
        "kuāi",
        "kuái",
        "kuán",
        "kuàn",
        "kún",
        "kuǎng",
        "huǎ",
        "huāi",
        "huǎi",
        "hǔn",
        "huàng",
        "zhuá",
        "zhuà",
        "zhuǒ",
        "zhuò",
        "zhuāi",
        "zhuái",
        "zhuí",
        "zhuǐ",
        "zhuán",
        "zhún",
        "zhùn",
        "zhuáng",
        "zhuǎng",
        "chuá",
        "chuǎ",
        "chuà",
        "chuó",
        "chuǒ",
        "chuǐ",
        "chuì",
        "chùn",
        "shuá",
        "shuà",
        "shuó",
        "shuǒ",
        "shuái",
        "shuī",
        "shuí",
        "shuán",
        "shuǎn",
        "shūn",
        "shún",
        "shuáng",
        "shuàng",
        "rū",
        "ruā",
        "ruá",
        "ruǎ",
        "ruà",
        "ruō",
        "ruó",
        "ruǒ",
        "ruī",
        "ruān",
        "ruàn",
        "rūn",
        "rǔn",
        "zù",
        "zuō",
        "zuí",
        "zuán",
        "zún",
        "cǔ",
        "cuí",
        "cuán",
        "cuǎn",
        "sǔ",
        "suó",
        "suò",
        "suán",
        "suǎn",
        "sún",
        "sùn",
        "yó",
        "yǒ",
        "yò",
        "yāi",
        "yái",
        "yǎi",
        "yài",
        "biè",
        "biáo",
        "bián",
        "bín",
        "bǐn",
        "biāng",
        "biáng",
        "biǎng",
        "biàng",
        "bíng",
        "piā",
        "piá",
        "piǎ",
        "pià",
        "pié",
        "piè",
        "pǐng",
        "pìng",
        "mié",
        "miě",
        "miū",
        "miú",
        "miǔ",
        "miān",
        "mīn",
        "mìn",
        "mīng",
        "diā",
        "diá",
        "dià",
        "diě",
        "diè",
        "diáo",
        "diú",
        "diǔ",
        "diù",
        "dián",
        "dīn",
        "dín",
        "dǐn",
        "dìn",
        "diāng",
        "diáng",
        "diǎng",
        "diàng",
        "díng",
        "tié",
        "tìng",
        "niā",
        "niá",
        "niǎ",
        "nià",
        "niě",
        "niāo",
        "niáo",
        "niù",
        "nīn",
        "nín",
        "nǐn",
        "nìn",
        "niāng",
        "niǎng",
        "nīng",
        "liā",
        "liá",
        "lià",
        "lié",
        "liě",
        "liāo",
        "liān",
        "liāng",
        "jián",
        "jín",
        "jiáng",
        "jíng",
        "jióng",
        "jiòng",
        "qiá",
        "qiǎ",
        "qiē",
        "qiù",
        "qiǒng",
        "qiòng",
        "xiǎ",
        "xiú",
        "xín",
        "xǐn",
        "xiǒng",
      }
    `);
  });

  const TONE_DESCRIPTION_BY_NUMBER: Record<number, string> = {
    1: `the first tone (${defaultPinyinSoundInstructions[`1` as PinyinSoundId]} — High and flat pitch, similar to a high, sustained musical note)`,
    2: `the second tone (${defaultPinyinSoundInstructions[`2` as PinyinSoundId]} — Starts mid-range and rises high, similar to the intonation of a question like "Huh?" or "What?")`,
    3: `the third tone (${defaultPinyinSoundInstructions[`3` as PinyinSoundId]} — Starts low, dips to a lower pitch, then rises slightly. Often described as a low, dipping tone)`,
    4: `the fourth tone (${defaultPinyinSoundInstructions[`4` as PinyinSoundId]} — Starts high and drops sharply, sounding quick, strong, and abrupt, like an angry command)`,
    5: `the neutral tone (${defaultPinyinSoundInstructions[`5` as PinyinSoundId]} — Short and light with no specific pitch contour, usually used on grammatical particles or the second syllable of certain words)`,
  };

  function buildAudioFileNameParts(
    pinyinUnit: string,
    hanzi: string,
  ): FileNamePart[] {
    return [
      { text: pinyinUnit, key: true },
      { text: hanzi, key: false },
      { text: `:voice:`, key: true },
    ] as const;
  }

  function buildToneInstructions(
    normalizedPinyin: string,
    toneNumber: number,
  ): string {
    const toneDescription = TONE_DESCRIPTION_BY_NUMBER[toneNumber];
    expect(
      toneDescription,
      `missing tone description for ${toneNumber}`,
    ).toBeTypeOf(`string`);

    return `You are teaching Chinese pronunciation, focusing on the different tones in Chinese. Pronounce the character using "${normalizedPinyin}" ${toneDescription}.`;
  }
});

const sourceSpriteSegmentSchema = z.object({
  sprite: z.number().int().min(0),
  start: z.number().min(0),
  duration: z.number().min(0),
});

const sourceSpriteManifestSchema = z.object({
  spriteFiles: z.array(z.string()),
  segments: z.record(z.string(), sourceSpriteSegmentSchema),
});

const pinyinSoundRuntimeManifestSchema = z.object({
  spriteFiles: z.array(z.string()),
  segments: z.record(z.string(), z.string()),
});

type SourceSpriteManifest = z.infer<typeof sourceSpriteManifestSchema>;
type PinyinSoundRuntimeManifest = z.infer<
  typeof pinyinSoundRuntimeManifestSchema
>;

const PINYIN_SEGMENT_PREFIX = `pinyin/`;
const DECIMAL_PLACES = 2;
const DECIMAL_MULTIPLIER = 10 ** DECIMAL_PLACES;

function roundDownToDecimals(value: number): number {
  return Math.floor(value * DECIMAL_MULTIPLIER) / DECIMAL_MULTIPLIER;
}

function roundUpToDecimals(value: number): number {
  return Math.ceil(value * DECIMAL_MULTIPLIER) / DECIMAL_MULTIPLIER;
}

function encodeRuntimeSegment(
  runtimeSpriteIndex: number,
  clips: readonly [number, number][],
): string {
  const encodedClips = clips
    .map(([start, duration]) => `${start}-${duration}`)
    .join(`,`);

  return `${runtimeSpriteIndex}:${encodedClips}`;
}

function getPinyinFromRelativeAudioPath(relativePath: string): string | null {
  if (!relativePath.startsWith(PINYIN_SEGMENT_PREFIX)) {
    return null;
  }

  const fileName = relativePath.slice(PINYIN_SEGMENT_PREFIX.length);
  if (!fileName.endsWith(`.m4a`)) {
    return null;
  }

  const pinyinSeparator = fileName.indexOf(`-`);
  if (pinyinSeparator <= 0) {
    return null;
  }

  return fileName.slice(0, pinyinSeparator);
}

function buildPinyinSoundRuntimeManifest(
  sourceManifest: SourceSpriteManifest,
): PinyinSoundRuntimeManifest {
  const pinyinSegments = Object.entries(sourceManifest.segments)
    .filter(
      ([relativePath]) => getPinyinFromRelativeAudioPath(relativePath) != null,
    )
    .sort(sortComparatorString(([relativePath]) => relativePath));

  const sourceSpriteIndexes = [
    ...new Set(pinyinSegments.map(([, segment]) => segment.sprite)),
  ].sort((a, b) => a - b);

  const runtimeSpriteFiles: string[] = [];
  const runtimeSpriteIndexBySourceSpriteIndex = new Map<number, number>();

  for (const sourceSpriteIndex of sourceSpriteIndexes) {
    const sourceSpriteFileName = sourceManifest.spriteFiles[sourceSpriteIndex];
    if (sourceSpriteFileName == null) {
      throw new Error(
        `Missing sprite filename for source sprite index ${sourceSpriteIndex}`,
      );
    }

    const runtimeSpriteIndex = runtimeSpriteFiles.length;
    runtimeSpriteFiles.push(sourceSpriteFileName);
    runtimeSpriteIndexBySourceSpriteIndex.set(
      sourceSpriteIndex,
      runtimeSpriteIndex,
    );
  }

  const segmentsByPinyin = new Map<string, [number, Array<[number, number]>]>();

  for (const [relativePath, sourceSegment] of pinyinSegments) {
    const pinyin = getPinyinFromRelativeAudioPath(relativePath);
    if (pinyin == null) {
      continue;
    }

    const runtimeSpriteIndex = runtimeSpriteIndexBySourceSpriteIndex.get(
      sourceSegment.sprite,
    );
    if (runtimeSpriteIndex == null) {
      throw new Error(
        `Missing runtime sprite index mapping for source sprite index ${sourceSegment.sprite}`,
      );
    }

    const clip: [number, number] = [
      roundDownToDecimals(sourceSegment.start),
      roundUpToDecimals(sourceSegment.duration),
    ];

    const existing = segmentsByPinyin.get(pinyin);
    if (existing == null) {
      segmentsByPinyin.set(pinyin, [runtimeSpriteIndex, [clip]]);
      continue;
    }

    const [existingRuntimeSpriteIndex, clips] = existing;
    if (existingRuntimeSpriteIndex !== runtimeSpriteIndex) {
      throw new Error(
        `Pinyin "${pinyin}" spans multiple sprites (${existingRuntimeSpriteIndex} and ${runtimeSpriteIndex}).`,
      );
    }

    clips.push(clip);
  }

  const runtimeSegments = Object.fromEntries(
    [...segmentsByPinyin.entries()]
      .sort(sortComparatorString(([pinyin]) => pinyin))
      .map(([pinyin, [runtimeSpriteIndex, clips]]) => {
        const sortedClips = [...clips].sort(
          ([startA]: [number, number], [startB]: [number, number]) =>
            startA - startB,
        );

        return [pinyin, encodeRuntimeSegment(runtimeSpriteIndex, sortedClips)];
      }),
  );

  return pinyinSoundRuntimeManifestSchema.parse({
    spriteFiles: runtimeSpriteFiles,
    segments: runtimeSegments,
  });
}
