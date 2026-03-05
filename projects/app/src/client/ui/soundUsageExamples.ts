import { isHanziCharacter } from "@/data/hanzi";
import type {
  HanziText,
  HanziWord,
  PinyinSoundId,
  PinyinUnit,
} from "@/data/model";
import { splitPinyinUnit } from "@/data/pinyin";
import type { HanziWordMeaning } from "@/dictionary";
import { hanziFromHanziWord, oneUnitPinyinOrNull } from "@/dictionary";
import type { DeepReadonly } from "ts-essentials";

export interface SoundUsageExample {
  hanziWord: HanziWord;
  hanzi: HanziText;
  pinyin: PinyinUnit;
  gloss: string;
}

export function pickSoundUsageExamplesForEntries({
  allEntries,
  limit,
  soundId,
}: {
  allEntries: readonly [HanziWord, DeepReadonly<HanziWordMeaning>][];
  limit: number;
  soundId: PinyinSoundId;
}): SoundUsageExample[] {
  if (!isInitialSoundId(soundId) && !isFinalSoundId(soundId)) {
    return [];
  }

  const seenHanzi = new Set<HanziText>();
  const result: SoundUsageExample[] = [];

  for (const [hanziWord, meaning] of allEntries) {
    const hanzi = hanziFromHanziWord(hanziWord);

    if (!isHanziCharacter(hanzi) || seenHanzi.has(hanzi)) {
      continue;
    }

    const pinyin = oneUnitPinyinOrNull(meaning);
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

    const gloss = meaning.gloss[0];
    if (gloss == null || gloss.length === 0) {
      continue;
    }

    seenHanzi.add(hanzi);
    result.push({ hanzi, hanziWord, pinyin, gloss });

    if (result.length >= limit) {
      return result;
    }
  }

  return result;
}

function isInitialSoundId(soundId: PinyinSoundId): boolean {
  return soundId.endsWith(`-`);
}

function isFinalSoundId(soundId: PinyinSoundId): boolean {
  return soundId.startsWith(`-`);
}
