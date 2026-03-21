import { isHanziCharacter } from "@/data/hanzi";
import type { HanziText } from "@/data/model";
import { and, eq, like, not, useLiveQuery } from "@tanstack/react-db";
import { View } from "react-native";
import { CompactWordRows } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

const maxUsedInWords = 5;

export function WikiHanziCharacterUsedInWords({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) =>
          and(like(entry.hanzi, `%${hanzi}%`), not(eq(entry.hanzi, hanzi))),
        )
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziCharacterCount, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          hsk: entry.hsk,
          gloss: entry.gloss,
          pinyin: entry.pinyin,
        }))
        .distinct()
        .limit(maxUsedInWords),
    [db.dictionarySearch, hanzi],
  );

  if (!isHanziCharacter(hanzi)) {
    return null;
  }

  if (dictionarySearchEntries.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Used in words" className="mx-4">
      <View className="gap-1 p-3">
        <CompactWordRows dictionarySearchEntries={dictionarySearchEntries} />
      </View>
    </WikiTitledBox>
  );
}
