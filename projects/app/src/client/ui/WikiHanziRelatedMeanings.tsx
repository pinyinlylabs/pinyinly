import type { HanziText } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { View } from "react-native";
import { CompactWordRows } from "./CompactWordRows";
import type { CompactWordRowsEntry } from "./CompactWordRows";
import { useDb } from "./hooks/useDb";
import { WikiTitledBox } from "./WikiTitledBox";
import { buildRelatedMeaningMatches } from "./WikiHanziRelatedMeanings.utils";

export function WikiHanziRelatedMeanings({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();

  const { data: currentEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionarySearch, hanzi],
  );

  const { data: allEntries } = useLiveQuery(
    (q) => q.from({ entry: db.dictionarySearch }),
    [db.dictionarySearch],
  );

  const relatedMatches = buildRelatedMeaningMatches({
    currentEntries,
    allEntries,
    hanzi,
  });
  const relatedWordRows: CompactWordRowsEntry[] = relatedMatches.map(
    ({ entry }) => ({
      ...entry,
      hsk: entry.hsk ?? null,
      pinyin: entry.pinyin ?? null,
    }),
  );

  if (relatedWordRows.length === 0) {
    return null;
  }

  return (
    <WikiTitledBox title="Similar meaning to">
      <View className="gap-4 p-3">
        <CompactWordRows dictionarySearchEntries={relatedWordRows} />
      </View>
    </WikiTitledBox>
  );
}
