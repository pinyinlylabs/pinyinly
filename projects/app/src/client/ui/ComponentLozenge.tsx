import { Lozenge } from "./Lozenge";
import { Tooltip } from "./Tooltip";
import { Text } from "@/client/ui/Text";

export function ComponentLozenge({
  isStructural,
  size = `md`,
}: {
  isStructural: boolean;
  size?: `sm` | `md`;
}) {
  return (
    <Tooltip placement="top" sideOffset={6}>
      <Tooltip.Trigger asChild>
        <Lozenge
          color="amber"
          size={size}
          className="uppercase"
          accessibilityRole="button"
          accessibilityLabel="Component"
        >
          Component
        </Lozenge>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Text className="font-sans text-sm text-fg">
          {isStructural
            ? `This character is only used as a component in other characters.`
            : `This character is used as a component and also as a character on its own.`}
        </Text>
      </Tooltip.Content>
    </Tooltip>
  );
}
