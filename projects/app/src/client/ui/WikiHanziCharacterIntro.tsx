import { intersperse } from "@/client/react";
import type { HanziCharacter, WikiCharacterData } from "@/data/model";
import type { HanziWordWithMeaning } from "@/dictionary/dictionary";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary/dictionary";
import { arrayFilterUniqueWithKey } from "@pinyinly/lib/collections";
import { use } from "react";
import { Text } from "react-native";
import { WikiHanziCharacterDecomposition } from "./WikiHanziCharacterDecomposition";
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
      <MeaningSentence hanzi={characterData.hanzi} meanings={meanings} />

      <WikiHanziCharacterDecomposition
        characterData={characterData}
        illustrationFit={illustrationFit}
        illustrationSrc={illustrationSrc}
      />

      {meanings.length === 1 && meanings[0] != null ? (
        <OnePronunciation hanziWordWithMeaning={meanings[0]} />
      ) : null}
    </>
  );
}

function MeaningSentence({
  hanzi,
  meanings,
}: {
  hanzi: HanziCharacter;
  meanings: readonly HanziWordWithMeaning[];
}) {
  const glosses = meanings.map(([, meaning]) => meaning.gloss[0]);
  const pinyins = meanings
    .map(([, meaning]) => meaning.pinyin?.[0]?.[0])
    .filter((x) => x != null)
    .filter(arrayFilterUniqueWithKey((x) => x));

  return (
    <Text className="pyly-mdx-p">
      <Text className="pyly-bold">{hanzi}</Text> generally means{` `}
      {intersperse(
        glosses.map((gloss, i) => (
          <Text key={i} className="pyly-bold">
            {gloss}
          </Text>
        )),
        <Text> or </Text>,
      )}
      {` `}
      in modern Mandarin.
      {` `}
      {glosses.length === 2 && pinyins.length === 1
        ? `In both cases it’s pronounced `
        : pinyins.length > 1
          ? `Depending on the meaning, it’s pronounced `
          : `It’s pronounced `}
      {intersperse(
        pinyins.map((pinyin, i) => (
          <Text key={i} className="pyly-bold">
            {pinyin}
          </Text>
        )),
        <Text> or </Text>,
      )}
      .
    </Text>
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
