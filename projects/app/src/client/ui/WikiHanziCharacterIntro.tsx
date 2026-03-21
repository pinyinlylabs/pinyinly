import type { DictionarySearchEntry } from "@/client/query";
import type { WikiCharacterData } from "@/data/model";
import { hanziFromHanziWord } from "@/dictionary";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { View } from "react-native";
import { WikiHanziCharacterDecomposition } from "./WikiHanziCharacterDecomposition";
import { WikiHanziCharacterPronunciation } from "./WikiHanziCharacterPronunciation";
import { getSharedPrimaryPronunciation } from "./WikiHanziCharacterIntro.utils";
import { useDb } from "./hooks/useDb";

interface WikiHanziCharacterIntroProps {
  characterData: WikiCharacterData;
}

export function WikiHanziCharacterIntro({
  characterData,
}: WikiHanziCharacterIntroProps) {
  const db = useDb();
  const { data: meanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, characterData.hanzi))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          gloss: entry.gloss,
          pinyin: entry.pinyin,
        })),
    [db.dictionarySearch, characterData.hanzi],
  );
  const pronunciation = getSharedPrimaryPronunciation(meanings);
  const firstMeaning = meanings[0];

  return (
    <>
      <WikiHanziCharacterDecomposition characterData={characterData} />

      {pronunciation == null || firstMeaning == null ? null : (
        <>
          <View className="h-2" />
          <OnePronunciation
            meaning={firstMeaning}
            pinyinUnit={pronunciation.pinyinUnit}
          />
        </>
      )}
    </>
  );
}

function OnePronunciation({
  meaning,
  pinyinUnit,
}: {
  meaning: Pick<DictionarySearchEntry, `hanziWord` | `gloss` | `pinyin`>;
  pinyinUnit: NonNullable<
    ReturnType<typeof getSharedPrimaryPronunciation>
  >[`pinyinUnit`];
}) {
  const { hanziWord } = meaning;

  const gloss = meaning.gloss[0];
  const hanzi = hanziFromHanziWord(hanziWord);

  return gloss == null ? null : (
    <WikiHanziCharacterPronunciation
      gloss={gloss}
      hanzi={hanzi}
      pinyinUnit={pinyinUnit}
    />
  );
}
