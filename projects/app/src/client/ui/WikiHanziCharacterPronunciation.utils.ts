import type { DictionaryCollectionEntry } from "@/client/query";
import type { PinyinUnit } from "@/data/model";
import { oneUnitPinyinListOrNull } from "@/dictionary";

export interface SharedPrimaryPronunciationData {
  gloss: string;
  pinyinUnit: PinyinUnit;
}

export function getSharedPrimaryPronunciation(
  meanings: readonly Pick<DictionaryCollectionEntry, `gloss` | `pinyin`>[],
): SharedPrimaryPronunciationData | null {
  const candidates = meanings.flatMap((meaning) => {
    const gloss = meaning.gloss[0];
    const primaryPinyin = oneUnitPinyinListOrNull(meaning.pinyin);

    return gloss == null || primaryPinyin == null
      ? []
      : [
          {
            gloss,
            pinyinUnit: primaryPinyin,
          },
        ];
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates[0] ?? null;
}
