import { hsk30LevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { HskLozenge } from "./HskLozenge";
import { View } from "./View";
import { useDb } from "./hooks/useDb";

export function WikiHanziHskLozenges({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();
  const { data: dictionaryEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionaryCollection, hanzi],
  );

  const hskLevels = [
    ...dictionaryEntries.map((entry) => entry.hsk),
    ...dictionaryEntries.map((entry) => entry.hskFirstAppearance),
  ]
    .filter((level) => level != null)
    .filter(arrayFilterUnique())
    .sort(sortComparatorNumber(hsk30LevelToNumber));

  return (
    <View className="flex-row gap-1">
      {hskLevels.map((hskLevel) => (
        <HskLozenge hskLevel={hskLevel} key={hskLevel} />
      ))}
    </View>
  );
}
