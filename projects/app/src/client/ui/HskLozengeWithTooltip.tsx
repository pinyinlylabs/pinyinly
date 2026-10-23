import { Text } from "@/client/ui/Text";
import { HskLozenge } from "./HskLozenge";
import { View } from "./View";
import { getHskLevelDetails } from "./HskLozengeWithTooltip.utils";
import type { HskLevelEntry } from "./HskLozengeWithTooltip.utils";
import { Tooltip } from "./Tooltip";

export function HskLozengeWithTooltip({
  entries,
  size = `md`,
}: {
  entries: readonly HskLevelEntry[];
  size?: `sm` | `md`;
}) {
  const hskLevelDetails = getHskLevelDetails(entries);

  const firstHskLevelDetail = hskLevelDetails[0];
  if (firstHskLevelDetail == null) {
    return null;
  }

  const hasAdditionalLevels = hskLevelDetails.length > 1;

  return (
    <View className="flex-row gap-1">
      <Tooltip placement="top" sideOffset={6}>
        <Tooltip.Trigger asChild>
          <HskLozenge
            hskLevel={firstHskLevelDetail.hskLevel}
            size={size}
            color="muted-fg"
            suffix={hasAdditionalLevels ? `+` : undefined}
            accessibilityRole="button"
            accessibilityLabel={`HSK ${firstHskLevelDetail.hskLevel}${hasAdditionalLevels ? ` and additional levels` : ``}. View HSK levels.`}
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
