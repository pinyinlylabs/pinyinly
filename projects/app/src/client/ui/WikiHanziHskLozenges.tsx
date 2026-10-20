import type { HanziText } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Text } from "./Text";
import { Tooltip } from "./Tooltip";
import { HskLozenge } from "./HskLozenge";
import { View } from "./View";
import { useDb } from "./hooks/useDb";
import { getWikiHskLevelDetails } from "./WikiHanziHskLozenges.utils";

export function WikiHanziHskLozenges({ hanzi }: { hanzi: HanziText }) {
  const db = useDb();
  const { data: dictionaryEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionaryCollection, hanzi],
  );

  const hskLevelDetails = getWikiHskLevelDetails(dictionaryEntries);

  const firstHskLevelDetail = hskLevelDetails[0];
  if (firstHskLevelDetail == null) {
    return null;
  }

  const hasAdditionalLevels = hskLevelDetails.length > 1;

  return (
    <View className="flex-row gap-1">
      <Tooltip placement="top" sideOffset={6}>
        <Tooltip.Trigger
          accessibilityRole="button"
          accessibilityLabel={`HSK ${firstHskLevelDetail.hskLevel}${hasAdditionalLevels ? ` and additional levels` : ``}. View HSK levels.`}
        >
          <HskLozenge
            hskLevel={firstHskLevelDetail.hskLevel}
            color="muted-fg"
            suffix={hasAdditionalLevels ? `+` : undefined}
          />
        </Tooltip.Trigger>
        <Tooltip.Content className="gap-2">
          <Text className="font-sans text-sm font-semibold text-fg">
            HSK levels
          </Text>
          {hskLevelDetails.map(({ hskLevel, isDirect, isFirstAppearance }) => (
            <View className="flex-row items-center gap-2" key={hskLevel}>
              <HskLozenge hskLevel={hskLevel} size="sm" color="muted-fg" />
              <Text className="font-sans text-xs text-fg">
                {[
                  isDirect ? `Listed directly` : null,
                  isFirstAppearance
                    ? `Earliest character appearance in HSK vocabulary`
                    : null,
                ]
                  .filter((description) => description != null)
                  .join(` · `)}
              </Text>
            </View>
          ))}
        </Tooltip.Content>
      </Tooltip>
    </View>
  );
}
