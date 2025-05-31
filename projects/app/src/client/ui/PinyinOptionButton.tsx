import { Text } from "react-native";
import { RectButton2 } from "./RectButton2";
import type { PropsOf } from "./types";

interface PinyinOptionButtonProps
  extends Omit<PropsOf<typeof RectButton2>, `variant` | `children`> {
  pinyin: string;
  shortcutKey: string;
}

export function PinyinOptionButton({
  pinyin,
  shortcutKey,
  ...props
}: PinyinOptionButtonProps) {
  return (
    <RectButton2 variant="option" className="flex-row gap-2" {...props}>
      <Text className="hhh-text-button-option">{pinyin}</Text>
      <Text className="hhh-text-caption">{shortcutKey}</Text>
    </RectButton2>
  );
}
