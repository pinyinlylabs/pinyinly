import type { PropsOf } from "@pinyinly/lib/types";
import { Text } from "@/client/ui/Text";
import {
  pinyinUnitNumericToDiacritic,
  splitPinyinUnitTone,
} from "@/data/pinyin";
import { RectButton } from "./RectButton";
import { ScopedVariables } from "./ScopedVariables";

interface PinyinOptionButtonProps extends Omit<
  PropsOf<typeof RectButton>,
  `variant` | `children` | `onPress`
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
    <ScopedVariables
      variables={showActive ? { "--color-fg": `var(--color-cyanold)` } : {}}
    >
      <RectButton
        {...props}
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
    </ScopedVariables>
  );
}
