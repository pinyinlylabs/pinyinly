import type { HanziCharacter } from "@/data/model";
import type { HanziWordMeaning, HanziWordWithMeaning } from "@/dictionary";
import { arrayFilterUniqueWithKey } from "@pinyinly/lib/collections";
import { Text, View } from "react-native";
import { HanziTile } from "./HanziTile";

export function WikiHanziCharacterMeanings({
  hanzi,
  meanings,
}: {
  hanzi: HanziCharacter;
  meanings: readonly HanziWordWithMeaning[];
}) {
  if (meanings.length > 1) {
    return <MultipleMeanings hanzi={hanzi} meanings={meanings} />;
  } else if (meanings.length === 1 && meanings[0]?.[1] != null) {
    return <SingleMeaning hanzi={hanzi} meaning={meanings[0][1]} />;
  }

  return null;
}

function SingleMeaning({
  hanzi,
  meaning,
}: {
  hanzi: HanziCharacter;
  meaning: HanziWordMeaning;
}) {
  const gloss = meaning.gloss[0];
  const pinyin = meaning.pinyin?.[0];

  return (
    <Text className="pyly-mdx-p">
      <Text className="pyly-bold">{hanzi}</Text> generally means
      {` `}
      <Text className="pyly-bold">{gloss}</Text>
      {` `}
      in modern Mandarin.
      {pinyin == null ? null : (
        <>
          {` `}It’s pronounced <Text className="pyly-bold">{pinyin}</Text>.
        </>
      )}
    </Text>
  );
}

function MultipleMeanings({
  hanzi,
  meanings,
}: {
  hanzi: HanziCharacter;
  meanings: readonly HanziWordWithMeaning[];
}) {
  const pinyins = meanings
    .map(([, meaning]) => meaning.pinyin?.[0])
    .filter((x) => x != null)
    .filter(arrayFilterUniqueWithKey((x) => x));

  return (
    <>
      <Text className="pyly-mdx-p">
        <Text className="pyly-bold">{hanzi}</Text> has{` `}
        <Text className="pyly-bold">
          {cardinalToWord(meanings.length)} main meanings
        </Text>
        {` `}
        in modern Mandarin,{` `}
        {pinyins.length === 1 ? (
          <>
            {countToQuantifierWord(meanings.length)} pronounced{` `}
            <Text className="pyly-bold">{pinyins[0]}</Text>
          </>
        ) : (
          <>
            with <Text className="pyly-bold">different pronunciations</Text>
          </>
        )}
        :
      </Text>
      <View className="flex-row gap-2 px-4">
        {meanings.map(([hanziWord, meaning]) => {
          const gloss = meaning.gloss[0];
          const primaryPinyin = meaning.pinyin?.[0];
          return (
            <HanziTile
              key={hanziWord}
              hanzi={hanzi}
              pinyin={primaryPinyin}
              gloss={gloss}
            />
          );
        })}
      </View>
    </>
  );
}

function countToQuantifierWord(n: number) {
  if (n === 2) {
    return `both`;
  }
  return `all`;
}

function cardinalToWord(n: number): string {
  switch (n) {
    case 1: {
      return `one`;
    }
    case 2: {
      return `two`;
    }
    case 3: {
      return `three`;
    }
    case 4: {
      return `four`;
    }
    case 5: {
      return `five`;
    }
    default: {
      return n.toString();
    }
  }
}
