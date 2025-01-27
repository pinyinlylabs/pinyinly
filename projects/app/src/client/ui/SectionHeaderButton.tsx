import { Text } from "react-native";
import { RectButton } from "./RectButton";
import { PropsOf } from "./types";

export type SectionHeaderButtonProps = {
  title: string;
  subtitle: string;
} & PropsOf<typeof RectButton>;

/**
 * Ensures on web that the top status bar background color matches the view background.
 */
export function SectionHeaderButton({
  title,
  subtitle,
  ...rectButtonProps
}: SectionHeaderButtonProps) {
  return (
    <RectButton
      {...rectButtonProps}
      borderRadius={rectButtonProps.borderRadius ?? 10}
      color={rectButtonProps.color ?? `#333`}
    >
      <Text className="mb-[5px] select-none self-start text-xs font-bold uppercase text-[white] opacity-80">
        {title}
      </Text>
      <Text className="select-none self-start font-bold text-[white]">
        {subtitle}
      </Text>
    </RectButton>
  );
}
