import type { HanziText } from "@/data/model";
import { isHanziCharacter } from "@/data/hanzi";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { View } from "react-native";
import { CompactWordRows } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

const maxUsedAsComponent = 5;

export function WikiHanziCharacterUsedAsComponent({
  hanzi,
}: {
  hanzi: HanziText;
}) {
  const db = useDb();
  const isSingleCharacter = isHanziCharacter(hanzi);

  const { data: componentUsageRows } = useLiveQuery(
    (q) =>
      isSingleCharacter
        ? q
            .from({ usage: db.characterComponentUsage })
            .where(({ usage }) => eq(usage.component, hanzi))
            .select(({ usage }) => ({ usedInHanzi: usage.usedInHanzi }))
        : null,
    [db.characterComponentUsage, hanzi, isSingleCharacter],
  );

  const { data: entriesWithDupes } = useLiveQuery(
    (q) => {
      const usedInHanzi = isSingleCharacter
        ? ((componentUsageRows ?? [])[0]?.usedInHanzi ?? []).filter(
            (item) => item !== hanzi,
          )
        : [];

      return usedInHanzi.length === 0
        ? null
        : q
            .from({ entry: db.dictionarySearch })
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
    [db.dictionarySearch, componentUsageRows, hanzi, isSingleCharacter],
  );

  const entries = (entriesWithDupes ?? [])
    .filter(arrayFilterUnique((item) => item.hanzi))
    .slice(0, maxUsedAsComponent);

  if (!isSingleCharacter || entries.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Used as component in">
      <View className="gap-1 p-3">
        <CompactWordRows dictionarySearchEntries={entries} />
      </View>
    </WikiTitledBox>
  );
}
