import type { DictionarySearchEntry } from "@/client/query";
import { isHanziCharacter } from "@/data/hanzi";
import type { HanziText, PinyinSoundId } from "@/data/model";
import {
  isFinalSoundId,
  isInitialSoundId,
  splitPinyinUnit,
} from "@/data/pinyin";
import { oneUnitPinyinListOrNull } from "@/dictionary";

export type SoundUsageExample = Pick<
  DictionarySearchEntry,
  `hanziWord` | `hanzi` | `gloss` | `pinyin` | `hsk`
>;

export function pickSoundUsageExamplesForEntries({
  allEntries,
  limit,
  soundId,
}: {
  allEntries: readonly SoundUsageExample[];
  limit: number;
  soundId: PinyinSoundId;
}): SoundUsageExample[] {
  if (!isInitialSoundId(soundId) && !isFinalSoundId(soundId)) {
    return [];
  }

  const seenHanzi = new Set<HanziText>();
  const result: SoundUsageExample[] = [];

  for (const entry of allEntries) {
    const { hanzi, gloss: glosses, pinyin: pinyinList } = entry;

    if (!isHanziCharacter(hanzi) || seenHanzi.has(hanzi)) {
      continue;
    }

    const pinyin = oneUnitPinyinListOrNull(pinyinList);
    if (pinyin == null) {
      continue;
    }

    const split = splitPinyinUnit(pinyin);
    if (split == null) {
      continue;
    }

    const isMatch = isInitialSoundId(soundId)
      ? split.initialSoundId === soundId
      : split.finalSoundId === soundId;

    if (!isMatch) {
      continue;
    }

    const gloss = glosses[0];
    if (gloss == null || gloss.length === 0) {
      continue;
    }

    seenHanzi.add(hanzi);
    result.push(entry);

    if (result.length >= limit) {
      return result;
    }
  }

  return result;
}
