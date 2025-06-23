import { Pressable, View } from "react-native";
import { tv } from "tailwind-variants";

export function ToggleButton({
  isActive: _isActive,
  onPress,
}: {
  isActive: boolean | null | undefined;
  onPress: () => void;
}) {
  // Coerce `null` to `undefined` to work with tailwind-variants.
  const isActive = _isActive ?? `null`;

  return (
    <Pressable
      className={lozengeClass({ isActive })}
      accessibilityRole="switch"
      accessibilityState={{ checked: isActive === true }}
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
      null: `bg-fg/20`,
    },
  },
});

const dotClass = tv({
  base: `size-5 rounded-full bg-[white] transition-all`,
  variants: {
    isActive: {
      true: `left-1/2`,
      false: `left-0`,
      null: `invisible`,
    },
  },
});
