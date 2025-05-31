import { Text } from "react-native";
import { tv } from "tailwind-variants";
import { RectButton2 } from "./RectButton2";
import type { PropsOf } from "./types";

interface PinyinOptionButtonProps
  extends Omit<
    PropsOf<typeof RectButton2>,
    `variant` | `children` | `onPress`
  > {
  pinyin: string;
  shortcutKey: string;
  onPress?: (pinyin: string) => void;
}

export function PinyinOptionButton({
  pinyin,
  shortcutKey,
  className,
  onPress,
  ...props
}: PinyinOptionButtonProps) {
  const handlePress = () => {
    onPress?.(pinyin);
  };
  return (
    <RectButton2
      variant="option"
      className={buttonClass({ className })}
      onPress={handlePress}
      {...props}
    >
      <Text className="hhh-text-button-option">{pinyin}</Text>
      <Text className="hhh-text-caption">{shortcutKey}</Text>
    </RectButton2>
  );
}

const buttonClass = tv({
  base: `flex-row gap-2`,
});
