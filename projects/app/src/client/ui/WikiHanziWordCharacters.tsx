import { matchAllHanziCharacters } from "@/data/hanzi";
import type { HanziText } from "@/data/model";
import {
  createCollection,
  eq,
  localOnlyCollectionOptions,
  useLiveQuery,
} from "@tanstack/react-db";
import { View } from "react-native";
import { CompactWordRows } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { useMemo } from "react";

export function WikiHanziWordCharacters({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();

  const charactersCollection = useMemo(
    () =>
      createCollection(
        localOnlyCollectionOptions({
          initialData: matchAllHanziCharacters(hanzi).map((char) => ({
            hanzi: char,
          })),
          getKey: (item) => item.hanzi,
        }),
      ),
    [hanzi],
  );

  const { data: entriesWithDupes } = useLiveQuery(
    (q) =>
      q
        .from({ character: charactersCollection })
        .join({ entry: db.dictionarySearch }, ({ character, entry }) =>
          eq(character.hanzi, entry.hanzi),
        )
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry, character }) => ({
          hanzi: character.hanzi,
          hanziWord: entry.hanziWord,
          hsk: entry.hsk,
          gloss: entry.gloss,
          pinyin: entry.pinyin,
        })),
    [db.dictionarySearch, charactersCollection],
  );

  const entries = entriesWithDupes.filter(arrayFilterUnique((x) => x.hanzi));

  if (entries.length < 2) {
    return null;
  }

  return (
    <WikiTitledBox title="Characters">
      <View className="gap-1 p-3">
        <CompactWordRows dictionarySearchEntries={entries} />
      </View>
    </WikiTitledBox>
  );
}
