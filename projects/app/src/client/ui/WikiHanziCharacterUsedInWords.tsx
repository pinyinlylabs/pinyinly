import type { HanziCharacter } from "@/data/model";
import { and, eq, like, not, useLiveQuery } from "@tanstack/react-db";
import { View } from "@/client/ui/View";
import { CompactWordRows } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

const maxUsedInWords = 5;

export function WikiHanziCharacterUsedInWords({
  hanzi,
}: {
  hanzi: HanziCharacter;
}) {
  const db = useDb();
  const { data: dictionaryEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) =>
          and(like(entry.hanzi, `%${hanzi}%`), not(eq(entry.hanzi, hanzi))),
        )
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziCharacterCount, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanzi: entry.hanzi,
          hanziWord: entry.hanziWord,
          hsk: entry.hsk,
          gloss: entry.gloss,
          pinyin: entry.pinyin,
        }))
        .distinct()
        .limit(maxUsedInWords),
    [db.dictionaryCollection, hanzi],
  );

  if (dictionaryEntries.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Used in words">
      <View className="p-3">
        <CompactWordRows dictionaryEntries={dictionaryEntries} />
      </View>
    </WikiTitledBox>
  );
}
