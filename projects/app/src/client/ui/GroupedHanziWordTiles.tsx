import { HanziWordTile } from "@/client/ui/HanziWordTile";
import type { HanziWord } from "@/data/model";
import { hanziFromHanziWord } from "@/dictionary";
import { characterCount } from "@/util/unicode";
import { sortComparatorNumber } from "@pinyinly/lib/collections";
import groupBy from "lodash/groupBy.js";
import { View } from "react-native";

export function GroupedHanziWordTiles({
  hanziWords,
}: {
  hanziWords: readonly HanziWord[];
}) {
  const groups = Object.entries(
    groupBy(hanziWords, (x) => characterCount(hanziFromHanziWord(x))),
  )
    .map(([length, words]) => [Number(length), words.sort()] as const)
    .sort(sortComparatorNumber(([length]) => length));

  return (
    <>
      {groups.map(([length, hanziWords]) => (
        <View className="flex-row flex-wrap gap-2" key={length}>
          {hanziWords.map((hanziWord) => (
            <HanziWordTile hanziWord={hanziWord} key={hanziWord} linked />
          ))}
        </View>
      ))}
    </>
  );
}
