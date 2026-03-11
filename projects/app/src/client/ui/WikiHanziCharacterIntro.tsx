import type { PinyinUnit, WikiCharacterData } from "@/data/model";
import { loadDictionary } from "@/dictionary";
import { use } from "react";
import { View } from "react-native";
import { WikiHanziCharacterDecomposition } from "./WikiHanziCharacterDecomposition";
import { getSharedPrimaryPronunciation } from "./WikiHanziCharacterIntro.utils";
import { WikiHanziCharacterPronunciation } from "./WikiHanziCharacterPronunciation";

interface WikiHanziCharacterIntroProps {
  characterData: WikiCharacterData;
}

export function WikiHanziCharacterIntro({
  characterData,
}: WikiHanziCharacterIntroProps) {
  const dictionary = use(loadDictionary());
  const meanings = dictionary.lookupHanzi(characterData.hanzi);
  const pronunciation = getSharedPrimaryPronunciation(meanings);

  return (
    <>
      <WikiHanziCharacterDecomposition characterData={characterData} />

      {pronunciation == null ? null : (
        <>
          <View className="h-2" />
          <OnePronunciation
            hanzi={characterData.hanzi}
            gloss={pronunciation.gloss}
            pinyinUnit={pronunciation.pinyinUnit}
          />
        </>
      )}
    </>
  );
}

function OnePronunciation({
  gloss,
  hanzi,
  pinyinUnit,
}: {
  gloss: string;
  hanzi: WikiCharacterData[`hanzi`];
  pinyinUnit: PinyinUnit;
}) {
  return (
    <WikiHanziCharacterPronunciation
      gloss={gloss}
      hanzi={hanzi}
      pinyinUnit={pinyinUnit}
    />
  );
}
