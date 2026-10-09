import type { DictionaryCollectionEntry } from "@/client/query";
import type { HanziWord, PinyinUnit } from "@/data/model";
import { oneUnitPinyinListOrNull } from "@/dictionary";

export interface SharedPrimaryPronunciationData {
  gloss: string;
  hanziWord: HanziWord;
  pinyinUnit: PinyinUnit;
}

export function getSharedPrimaryPronunciation(
  meanings: readonly Pick<
    DictionaryCollectionEntry,
    `hanziWord` | `gloss` | `pinyin`
  >[],
  selectedMeaning?: HanziWord | null,
): SharedPrimaryPronunciationData | null {
  const candidates = meanings.flatMap((meaning) => {
    const gloss = meaning.gloss[0];
    const primaryPinyin = oneUnitPinyinListOrNull(meaning.pinyin);

    return gloss == null || primaryPinyin == null
      ? []
      : [
          {
            gloss,
            hanziWord: meaning.hanziWord,
            pinyinUnit: primaryPinyin,
          },
        ];
  });

  return (
    (selectedMeaning == null
      ? undefined
      : candidates.find((meaning) => meaning.hanziWord === selectedMeaning)) ??
    candidates[0] ??
    null
  );
}
