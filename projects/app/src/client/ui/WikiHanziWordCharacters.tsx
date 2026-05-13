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
import { getCharacterItemsForWord } from "./WikiHanziWordCharacters.utils";

export function WikiHanziWordCharacters({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();

  const charactersCollection = useMemo(
    () =>
      createCollection(
        localOnlyCollectionOptions({
          initialData: getCharacterItemsForWord(hanzi),
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
        .orderBy(({ character }) => character.position, `asc`)
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
      <View className="p-3">
        <CompactWordRows dictionarySearchEntries={entries} />
      </View>
    </WikiTitledBox>
  );
}
