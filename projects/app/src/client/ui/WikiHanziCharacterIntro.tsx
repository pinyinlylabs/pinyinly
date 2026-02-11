import { useHanziWordHintOverrides } from "@/client/hooks/useUserSetting";
import { isHanziCharacter } from "@/data/hanzi";
import type { HanziWord, PinyinUnit, WikiCharacterData } from "@/data/model";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import type { HanziWordWithMeaning } from "@/dictionary";
import { use } from "react";
import { View } from "react-native";
import { WikiHanziCharacterDecomposition } from "./WikiHanziCharacterDecomposition";
import { WikiHanziCharacterMeanings } from "./WikiHanziCharacterMeanings";
import { WikiHanziCharacterPronunciation } from "./WikiHanziCharacterPronunciation";

interface WikiHanziCharacterIntroProps {
  characterData: WikiCharacterData;
}

export function WikiHanziCharacterIntro({
  characterData,
}: WikiHanziCharacterIntroProps) {
  const dictionary = use(loadDictionary());
  const meanings = dictionary.lookupHanzi(characterData.hanzi);
  const primaryHanziWord =
    meanings[0]?.[0] ?? (`${characterData.hanzi}:unknown` as HanziWord);
  const primaryHintImageId =
    useHanziWordHintOverrides(primaryHanziWord).imageId;

  return (
    <>
      <WikiHanziCharacterMeanings
        hanzi={characterData.hanzi}
        meanings={meanings}
      />

      <View className="h-2" />

      <WikiHanziCharacterDecomposition
        characterData={characterData}
        illustrationAssetId={primaryHintImageId}
      />

      {meanings.length === 1 && meanings[0] != null ? (
        <>
          <View className="h-2" />
          <OnePronunciation hanziWordWithMeaning={meanings[0]} />
        </>
      ) : null}
    </>
  );
}

function OnePronunciation({
  hanziWordWithMeaning,
}: {
  hanziWordWithMeaning: HanziWordWithMeaning;
}) {
  const [hanziWord, meaning] = hanziWordWithMeaning;

  const gloss = meaning.gloss[0];
  const hanzi = hanziFromHanziWord(hanziWord);

  const primaryPinyin =
    isHanziCharacter(hanzi) && meaning.pinyin?.[0] != null
      ? (meaning.pinyin[0] as PinyinUnit)
      : null;

  return gloss == null || primaryPinyin == null ? null : (
    <WikiHanziCharacterPronunciation
      gloss={gloss}
      hanzi={hanzi}
      pinyinUnit={primaryPinyin}
    />
  );
}
