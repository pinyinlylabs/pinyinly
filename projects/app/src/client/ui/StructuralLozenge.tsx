import { Lozenge } from "./Lozenge";
import { Tooltip } from "./Tooltip";
import { Text } from "react-native";

export function StructuralLozenge({ size = `md` }: { size?: `sm` | `md` }) {
  return (
    <Tooltip placement="top" sideOffset={6}>
      <Tooltip.Trigger accessibilityRole="button">
        <Lozenge color="amber" size={size} className="uppercase">
          Component
        </Lozenge>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Text className="font-sans text-sm text-fg">
          Components only appear in other characters, not as standalone words.
        </Text>
      </Tooltip.Content>
    </Tooltip>
  );
}
