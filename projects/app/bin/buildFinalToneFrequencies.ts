#!/usr/bin/env tsx

/**
 * Generates final+tone frequency data from dictionary entries.
 * Usage: tsx buildFinalToneFrequencies.ts
 */

import type { PinyinSoundId, PinyinUnit } from "#data/model.ts";
import { matchAllPinyinUnits, splitPinyinUnit } from "#data/pinyin.js";
import { loadDictionaryJson } from "#dictionary.js";
import { writeJsonFileIfChanged } from "@pinyinly/lib/fs";
import path from "node:path";

interface FinalToneCount {
  finalSoundId: PinyinSoundId;
  tone: number;
  count: number;
}

async function buildFinalToneFrequencies(): Promise<FinalToneCount[]> {
  const frequencyMap = new Map<string, number>();
  const dictionaryJson = await loadDictionaryJson();

  for (const [_hanziWord, meaning] of dictionaryJson) {
    const pinyinArray = Array.isArray(meaning.pinyin)
      ? meaning.pinyin
      : [meaning.pinyin];

    for (const pinyinText of pinyinArray) {
      if (typeof pinyinText !== `string`) {
        continue;
      }

      // Extract all pinyin units from the text
      const units = matchAllPinyinUnits(pinyinText);

      for (const unit of units) {
        const split = splitPinyinUnit(unit as PinyinUnit);
        if (split == null) {
          continue;
        }

        const key = `${split.finalSoundId}:${split.tone}`;
        frequencyMap.set(key, (frequencyMap.get(key) ?? 0) + 1);
      }
    }
  }

  // Convert to array and sort by count descending
  const frequencies: FinalToneCount[] = [];
  for (const [key, count] of frequencyMap.entries()) {
    const [finalSoundId, toneStr] = key.split(`:`);
    if (
      finalSoundId == null ||
      finalSoundId === `` ||
      toneStr == null ||
      toneStr === ``
    ) {
      continue;
    }
    const tone = Number.parseInt(toneStr, 10);
    if (Number.isNaN(tone)) {
      continue;
    }

    frequencies.push({
      finalSoundId: finalSoundId as PinyinSoundId,
      tone,
      count,
    });
  }

  // Sort by count descending, then by finalSoundId, then by tone
  frequencies.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    if (a.finalSoundId !== b.finalSoundId) {
      return a.finalSoundId.localeCompare(b.finalSoundId);
    }
    return a.tone - b.tone;
  });

  return frequencies;
}

async function main() {
  console.log(`Building final+tone frequencies from dictionary...`);

  const frequencies = await buildFinalToneFrequencies();

  console.log(`Found ${frequencies.length} unique final+tone combinations`);
  console.log(
    `Top 10 most frequent: ${frequencies
      .slice(0, 10)
      .map((f) => `${f.finalSoundId}+${f.tone} (${f.count})`)
      .join(`, `)}`,
  );

  const outputPath = path.join(
    import.meta.dirname,
    `../src/data/finalToneFrequencies.asset.json`,
  );

  // Group by finalSoundId for easier lookup
  const groupedByFinal: Record<string, Record<number, number>> = {};
  for (const freq of frequencies) {
    groupedByFinal[freq.finalSoundId] ??= {};
    const toneMap = groupedByFinal[freq.finalSoundId];
    if (toneMap != null) {
      toneMap[freq.tone] = freq.count;
    }
  }

  await writeJsonFileIfChanged(outputPath, groupedByFinal, 1);

  console.log(`✅ Wrote frequencies to ${outputPath}`);
}

await main();
