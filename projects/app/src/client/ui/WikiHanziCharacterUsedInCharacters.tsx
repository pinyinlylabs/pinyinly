import type { HanziCharacter } from "@/data/model";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { View } from "react-native";
import { CompactWordRows } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

const maxUsedInCharacters = 5;

export function WikiHanziCharacterUsedInCharacters({
  hanzi,
}: {
  hanzi: HanziCharacter;
}) {
  const db = useDb();

  const { data: componentUsageRows } = useLiveQuery(
    (q) =>
      q
        .from({ usage: db.characterComponentUsage })
        .where(({ usage }) => eq(usage.component, hanzi))
        .select(({ usage }) => ({ usedInHanzi: usage.usedInHanzi })),
    [db.characterComponentUsage, hanzi],
  );

  const { data: entriesWithDupes } = useLiveQuery(
    (q) => {
      const usedInHanzi = (componentUsageRows[0]?.usedInHanzi ?? []).filter(
        (item) => item !== hanzi,
      );

      return usedInHanzi.length === 0
        ? null
        : q
            .from({ entry: db.dictionaryCollection })
            .where(({ entry }) => inArray(entry.hanzi, usedInHanzi))
            .orderBy(({ entry }) => entry.hskSortKey, `asc`)
            .orderBy(({ entry }) => entry.hanziCharacterCount, `asc`)
            .orderBy(({ entry }) => entry.hanziWord, `asc`)
            .select(({ entry }) => ({
              hanzi: entry.hanzi,
              hanziWord: entry.hanziWord,
              hsk: entry.hsk,
              gloss: entry.gloss,
              pinyin: entry.pinyin,
            }));
    },
    [db.dictionaryCollection, componentUsageRows, hanzi],
  );

  const entries = (entriesWithDupes ?? [])
    .filter(arrayFilterUnique((item) => item.hanzi))
    .slice(0, maxUsedInCharacters);

  if (entries.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Used in characters">
      <View className="p-3">
        <CompactWordRows dictionaryEntries={entries} />
      </View>
    </WikiTitledBox>
  );
}
