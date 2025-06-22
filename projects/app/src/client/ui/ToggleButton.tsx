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
        bg-blue/50

        hover:bg-blue/55
      `,
      false: `
        bg-fg/20

        hover:bg-fg/25
      `,
    },
  },
});

const dotClass = tv({
  base: `left-0 size-5 rounded-full transition-all`,
  variants: {
    isActive: {
      true: `left-1/2 bg-blue`,
      false: `
        bg-fg/50

        group-hover:bg-fg/80
      `,
    },
  },
});
