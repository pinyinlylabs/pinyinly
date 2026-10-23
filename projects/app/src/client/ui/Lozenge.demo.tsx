import { View } from "@/client/ui/View";
import { Lozenge } from "./Lozenge";
import { Text } from "./Text";
import { Tooltip } from "./Tooltip";

export default () => (
  <View className="flex-row items-center gap-2">
    <Lozenge color="cyan">HSK 2</Lozenge>
    <Lozenge
      kind="icon"
      color="blue"
      icon="bookmark-filled"
      accessibilityLabel="Bookmarked"
      iconTintColorClassName="accent-blue"
    />
    <Lozenge color="violet" progress={0.5}>
      Rank 3
    </Lozenge>
    <Tooltip>
      <Tooltip.Trigger asChild>
        <Lozenge
          color="amber"
          accessibilityRole="button"
          accessibilityLabel="Component"
        >
          Component
        </Lozenge>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Text className="font-sans text-sm text-fg">
          Focus or hover this lozenge to show its tooltip.
        </Text>
      </Tooltip.Content>
    </Tooltip>
    <Tooltip>
      <Tooltip.Trigger asChild>
        <Lozenge
          kind="icon"
          color="muted-fg"
          icon="bookmark-filled"
          accessibilityRole="button"
          accessibilityLabel="Bookmarked"
        />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Text className="font-sans text-sm text-fg">
          Icon lozenges use the same interactive focus styling.
        </Text>
      </Tooltip.Content>
    </Tooltip>
  </View>
);
