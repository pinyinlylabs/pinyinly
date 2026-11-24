import type { HanziCharacter } from "@/data/model";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { View } from "@/client/ui/View";
import { CompactWordRows } from "./CompactWordRows";
import type { CompactWordRowsEntry } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";

const maxUsedInCharacters = 5;

export function WikiHanziCharacterUsedInCharacters({
  hanzi,
}: {
  hanzi: HanziCharacter;
}) {
  const db = useDb();

  const { data: componentUsageRows } = useLiveQuery({
    query: (q) =>
      q
        .from({ usage: db.characterComponentUsage })
        .where(({ usage }) => eq(usage.component, hanzi))
        .select(({ usage }) => ({ usedInHanzi: usage.usedInHanzi })),
  });

  const { data: entriesWithDupes } = useLiveQuery({
    query: (q) => {
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
              hskFirstAppearance: entry.hskFirstAppearance,
              gloss: entry.gloss,
              pinyin: entry.pinyin,
            }));
    },
  });

  const usedInHanzi = (componentUsageRows[0]?.usedInHanzi ?? []).filter(
    (item) => item !== hanzi,
  );
  const dictionaryEntriesByHanzi = new Map(
    (entriesWithDupes ?? [])
      .filter(arrayFilterUnique((item) => item.hanzi))
      .map((entry) => [entry.hanzi, entry]),
  );
  const missingDictionaryEntries = usedInHanzi.filter(
    (item, index) =>
      !dictionaryEntriesByHanzi.has(item) &&
      usedInHanzi.indexOf(item) === index,
  );
  const rankedEntries: CompactWordRowsEntry[] = [
    ...(entriesWithDupes ?? [])
      .filter(arrayFilterUnique((item) => item.hanzi))
      .map((entry) => ({
        hanzi: entry.hanzi,
        hanziWord: entry.hanziWord,
        hsk: entry.hsk,
        hskFirstAppearance: entry.hskFirstAppearance,
        gloss: entry.gloss,
        pinyin: entry.pinyin,
      })),
    ...missingDictionaryEntries.map((item) => ({
      hanzi: item,
      hanziWord: null,
      hsk: null,
      hskFirstAppearance: null,
      gloss: null,
      pinyin: null,
    })),
  ];
  const entries = rankedEntries
    .sort(
      (a, b) => (a.hanziWord == null ? 1 : 0) - (b.hanziWord == null ? 1 : 0),
    )
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
