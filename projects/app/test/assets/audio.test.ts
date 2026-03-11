// pyly-not-src-test
import "#assets/audio/manifest.json";

import { pinyinAudioDir, projectRoot } from "#bin/util/paths.ts";
import type { Voice } from "#bin/util/speech.ts";
import { generateSpeech } from "#bin/util/speech.ts";
import { loadPylyPinyinChart, normalizePinyinText } from "#data/pinyin.js";
import { isCi } from "#util/env.ts";
import {
  createSpeechFileTests,
  testSprites,
} from "@pinyinly/audio-sprites/testing";
import path from "node:path";
import { describe, expect, test } from "vitest";

test(`test sprites`, async () => {
  const manifestPath = path.join(projectRoot, `src/assets/audio/manifest.json`);
  const result = await testSprites(manifestPath, !isCi);

  expect(result.needsRegeneration).toBe(false);
});

// Tone-specific instructions for better pronunciation
const TONE_INSTRUCTIONS: Record<number, string> = {
  1: `You are teaching Chinese pronunciation, focusing on the different tones in Chinese. Pronounce the pinyin using the first tone (High/Level — High and flat pitch, similar to a high, sustained musical note).`,
  2: `You are teaching Chinese pronunciation, focusing on the different tones in Chinese. Pronounce the pinyin using the second tone (Rising — Starts mid-range and rises high, similar to the intonation of a question like "Huh?" or "What?").`,
  3: `You are teaching Chinese pronunciation, focusing on the different tones in Chinese. Pronounce the pinyin using the third tone (Falling-Rising — Starts low, dips to a lower pitch, then rises slightly. Often described as a low, dipping tone).`,
  4: `You are teaching Chinese pronunciation, focusing on the different tones in Chinese. Pronounce the pinyin using the fourth tone (Falling — Starts high and drops sharply, sounding quick, strong, and abrupt, like an angry command).`,
  5: `You are teaching Chinese pronunciation, focusing on the different tones in Chinese. Pronounce the pinyin using the neutral tone (Light — Short and light with no specific pitch contour, usually used on grammatical particles or the second syllable of certain words).`,
};

test(
  `should have audio files for all pinyin units`,
  { timeout: 600_000 },
  async () => {
    const VOICE: Voice = `nova`;

    // Get all pinyin units from the chart
    const chart = loadPylyPinyinChart();
    const allPinyinUnits = new Set<string>();

    // Collect all pinyin units as tone numbers (e.g., "bang1", "bang4")
    for (const unit of chart.units) {
      for (let i = 1; i <= 4; i++) {
        allPinyinUnits.add(`${unit}${i}`);
      }
    }

    // Check which files are missing for all pinyin units
    const allMissingItems: string[] = [];

    for (const pinyinUnit of allPinyinUnits) {
      const normalized = normalizePinyinText(pinyinUnit);
      const exists = await generateSpeech({
        phrase: normalized,
        voice: VOICE,
        outputDir: pinyinAudioDir,
        baseFileName: pinyinUnit,
        format: `m4a`,
        check: true,
      });
      if (!exists) {
        allMissingItems.push(pinyinUnit);
      }
    }

    if (allMissingItems.length > 0) {
      if (isCi) {
        expect(
          allMissingItems,
          `Missing pinyin audio items. Run locally to generate them.`,
        ).toEqual([]);
      } else {
        // Locally, generate only the missing pinyin items with tone-specific instructions
        for (const pinyinUnit of allMissingItems) {
          const normalized = normalizePinyinText(pinyinUnit);
          // Extract tone number from the end of the pinyin unit (1-5)
          const toneMatch = pinyinUnit.match(/(\d)$/);
          const toneNumber = toneMatch ? Number.parseInt(toneMatch[1]!, 10) : 1;
          const instructions = TONE_INSTRUCTIONS[toneNumber];

          // oxlint-disable-next-line no-console
          console.log(
            `generating audio for missing item in ${pinyinAudioDir}: ${pinyinUnit}`,
          );
          const ok = await generateSpeech({
            phrase: normalized,
            voice: VOICE,
            outputDir: pinyinAudioDir,
            baseFileName: pinyinUnit,
            format: `m4a`,
            instructions,
            samples: 5,
          });
          expect
            .soft(
              ok,
              `Failed to generate audio for missing item in ${pinyinAudioDir}: ${pinyinUnit}`,
            )
            .toBe(true);
        }
      }
    }
  },
);

describe(`pinyin speech files`, async () => {
  await createSpeechFileTests({
    audioGlob: path.join(pinyinAudioDir, `**/*.{mp3,m4a,aac}`),
    projectRoot,
    autoFixLoudness: false,
    autoFixTrimSilence: !isCi,
    skipLoudness: true,
  });
});
