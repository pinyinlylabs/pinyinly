import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { hsk30LevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { HskLozenge } from "./HskLozenge";
import { WikiHanziMeaningsPanel } from "./WikiHanziMeaningsPanel";
import { useDb } from "./hooks/useDb";

export function WikiHanziWordHeaderOverview({
  hanzi,
  ...rest
}: {
  hanzi: HanziText;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

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
    .filter((x) => x != null)
    .filter(arrayFilterUnique())
    .sort(sortComparatorNumber(hsk30LevelToNumber));

  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center gap-1">
        <View className="flex-1 flex-row gap-1">
          {hskLevels.map((hskLevel) => (
            <HskLozenge hskLevel={hskLevel} key={hskLevel} />
          ))}
        </View>
      </View>
      <View>
        <HeaderTitleProvider.ScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <WikiHanziMeaningsPanel hanzi={hanzi} />
    </View>
  );
}
