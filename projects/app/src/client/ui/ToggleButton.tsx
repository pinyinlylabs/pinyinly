import { Pressable, View } from "react-native";
import { tv } from "tailwind-variants";

export function ToggleButton({
  isActive,
  onPress,
}: {
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={lozengeClass({ isActive })}
      accessibilityRole="switch"
      accessibilityState={{ checked: isActive }}
      onPress={onPress}
    >
      <View className={dotClass({ isActive })} />
    </Pressable>
  );
}

const lozengeClass = tv({
  base: `group box-content w-10 rounded-full p-1 transition-all`,
  variants: {
    isActive: {
      true: `
        bg-blue/100

        hover:bg-blue/95
      `,
      false: `
        bg-fg/20

        hover:bg-fg/25
      `,
    },
  },
});

const dotClass = tv({
  base: `left-0 size-5 rounded-full bg-fg transition-all`,
  variants: {
    isActive: {
      true: `left-1/2`,
    },
  },
});
