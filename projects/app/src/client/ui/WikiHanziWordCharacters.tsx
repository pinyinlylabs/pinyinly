import { matchAllHanziCharacters } from "@/data/hanzi";
import type { HanziText } from "@/data/model";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { View } from "react-native";
import { CompactWordRows } from "./WikiHanziCharacterUsedInWords";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";
import { arrayFilterUnique } from "@pinyinly/lib/collections";

export function WikiHanziWordCharacters({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();
  const characters = matchAllHanziCharacters(hanzi);
  const { data: entries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => inArray(entry.hanzi, characters))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          hanzi: entry.hanzi,
          hsk: entry.hsk,
          gloss: entry.gloss,
          pinyin: entry.pinyin,
        })),
    [characters, db.dictionarySearch],
  );

  if (characters.length < 2) {
    return null;
  }

  const entriesByHanzi = new Map(
    entries.map((entry) => [entry.hanzi, entry] as const),
  );
  const dictionarySearchEntries = characters
    .filter(arrayFilterUnique())
    .flatMap((char) => {
      const entry = entriesByHanzi.get(char);
      return entry == null ? [] : [entry];
    });

  if (dictionarySearchEntries.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Characters" className="mx-4">
      <View className="gap-1 p-3">
        <CompactWordRows dictionarySearchEntries={dictionarySearchEntries} />
      </View>
    </WikiTitledBox>
  );
}
