import { Text } from "react-native";
import { tv } from "tailwind-variants";
import { RectButton } from "./RectButton";
import type { PropsOf } from "./types";

interface PinyinOptionButtonProps
  extends Omit<PropsOf<typeof RectButton>, `variant` | `children` | `onPress`> {
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
  return (
    <RectButton
      {...props}
      variant="option"
      className={buttonClass({ className })}
      onPress={() => {
        onPress?.(pinyin);
      }}
      onTouchEnd={(e) => {
        // Using `onTouchEnd` instead of `onPress` to avoid the keyboard closing
        // when the button is pressed. This is a workaround for the issue where
        // the keyboard closes when pressing a button after typing in a
        // TextInput.
        //
        // `onPress` is still needed for non-touch devices (like desktop).
        e.preventDefault();
        onPress?.(pinyin);

        // Pass-through
        props.onTouchEnd?.(e);
      }}
      onPointerDown={(e) => {
        // Prevent focus loss on mouse/trackpad devices like desktop. The `onPress`
        e.preventDefault();

        // Pass-through
        props.onPointerDown?.(e);
      }}
    >
      <Text className="pyly-button-option">{pinyin}</Text>
      <Text className="pyly-button-option-caption">{shortcutKey}</Text>
    </RectButton>
  );
}

const buttonClass = tv({
  base: `flex-row gap-2`,
});
