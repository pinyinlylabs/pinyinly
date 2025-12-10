import type { WikiCharacterData } from "@/data/model";
import type { HanziWordWithMeaning } from "@/dictionary";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import { use } from "react";
import { View } from "react-native";
import { WikiHanziCharacterDecomposition } from "./WikiHanziCharacterDecomposition";
import { WikiHanziCharacterMeanings } from "./WikiHanziCharacterMeanings";
import { WikiHanziCharacterPronunciation } from "./WikiHanziCharacterPronunciation";

interface WikiHanziCharacterIntroProps {
  characterData: WikiCharacterData;
  illustrationSrc?: RnRequireSource;
  illustrationFit?: `cover` | `contain`;
}

export function WikiHanziCharacterIntro({
  characterData,
  illustrationSrc,
  illustrationFit,
}: WikiHanziCharacterIntroProps) {
  const dictionary = use(loadDictionary());
  const meanings = dictionary.lookupHanzi(characterData.hanzi);

  return (
    <>
      <WikiHanziCharacterMeanings
        hanzi={characterData.hanzi}
        meanings={meanings}
      />

      <View className="h-2" />

      <WikiHanziCharacterDecomposition
        characterData={characterData}
        illustrationFit={illustrationFit}
        illustrationSrc={illustrationSrc}
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
  const primaryPinyin = meaning.pinyin?.[0]?.[0];

  return gloss == null || primaryPinyin == null ? null : (
    <WikiHanziCharacterPronunciation
      gloss={gloss}
      hanzi={hanzi}
      primaryPinyin={primaryPinyin}
    />
  );
}
