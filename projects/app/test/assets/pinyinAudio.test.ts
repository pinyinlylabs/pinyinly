// pyly-not-src-test
import { pinyinAudioDir } from "#bin/util/paths.ts";
import { generateSpeech } from "#bin/util/speech.ts";
import type { PinyinText } from "#data/model.js";
import { loadPylyPinyinChart, normalizePinyinText } from "#data/pinyin.js";
import { isCi } from "#util/env.js";
import { describe, expect, test } from "vitest";

const VOICES = [`nova`, `shimmer`] as const;

describe(`pinyin audio assets`, () => {
  test(`should have audio files for all pinyin units`, async () => {
    // Get all pinyin units from the chart
    const chart = loadPylyPinyinChart();
    const allPinyinUnits = new Set<string>();

    // Collect all pinyin units as tone numbers (e.g., "bang1", "bang4")
    for (const unit of chart.units) {
      for (let i = 1; i <= 5; i++) {
        const normalized = normalizePinyinText(`${unit}${i}`);
        if (
          normalized === (`bāng` as PinyinText) ||
          normalized === (`bàng` as PinyinText)
        ) {
          allPinyinUnits.add(`${unit}${i}`);
        }
      }
    }

    // Check which files are missing for all pinyin units
    const allMissingItems: Array<{
      pinyinUnit: string;
      voice: (typeof VOICES)[number];
    }> = [];

    for (const pinyinUnit of allPinyinUnits) {
      for (const voice of VOICES) {
        const normalized = normalizePinyinText(pinyinUnit);
        const exists = await generateSpeech({
          phrase: normalized,
          voice,
          outputDir: pinyinAudioDir,
          baseFileName: pinyinUnit,
          format: `m4a`,
          check: true,
        });
        if (!exists) {
          allMissingItems.push({ pinyinUnit, voice });
        }
      }
    }

    if (allMissingItems.length > 0) {
      if (isCi) {
        expect(
          allMissingItems,
          `Missing pinyin+voice audio items. Run locally to generate them.`,
        ).toHaveLength(0);
      } else {
        // Locally, generate only the missing pinyin+voice items
        for (const { pinyinUnit, voice } of allMissingItems) {
          const normalized = normalizePinyinText(pinyinUnit);
          // oxlint-disable-next-line no-console
          console.log(
            `generating audio for missing item in ${pinyinAudioDir}: ${pinyinUnit} (${voice})`,
          );
          const ok = await generateSpeech({
            phrase: normalized,
            voice,
            outputDir: pinyinAudioDir,
            baseFileName: pinyinUnit,
            format: `m4a`,
          });
          expect
            .soft(
              ok,
              `Failed to generate audio for missing item in ${pinyinAudioDir}: ${pinyinUnit} (${voice})`,
            )
            .toBe(true);
        }
      }
    }
  });
});
