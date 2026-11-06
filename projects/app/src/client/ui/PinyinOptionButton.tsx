import type { PropsOf } from "@pinyinly/lib/types";
import { Text } from "@/client/ui/Text";
import {
  pinyinUnitNumericToDiacritic,
  splitPinyinUnitTone,
} from "@/data/pinyin";
import { RectButton } from "./RectButton";

interface PinyinOptionButtonProps extends Omit<
  PropsOf<typeof RectButton>,
  `variant` | `children` | `onPress` | `color`
> {
  active?: boolean;
  pinyin: string;
  shortcutKey: string;
  onPress?: (pinyin: string) => void;
}

export function PinyinOptionButton({
  active = false,
  pinyin,
  shortcutKey,
  onPress,
  ...props
}: PinyinOptionButtonProps) {
  const showActive =
    active &&
    splitPinyinUnitTone(pinyinUnitNumericToDiacritic(pinyin)).tone !== 5;

  return (
    <RectButton
      {...props}
      color={showActive ? `cyanold` : undefined}
      onPress={() => {
        onPress?.(pinyin);
      }}
      active={showActive}
      variant="option"
      preventPressFocus
    >
      <Text className="font-sans text-base/snug font-medium text-fg">
        {pinyin}
      </Text>
      {` `}
      <Text className="font-sans text-sm/snug text-fg/50">{shortcutKey}</Text>
    </RectButton>
  );
}
