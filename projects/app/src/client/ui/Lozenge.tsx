import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export function Lozenge({
  children,
  color,
}: {
  children: string;
  color: `blue`;
}) {
  return (
    <View className={lozengeContainerClass({ color })}>
      <Text className={lozengeTextClass({ color })}>{children}</Text>
    </View>
  );
}

const lozengeContainerClass = tv({
  base: `self-start rounded-md border px-2 py-1`,
  variants: {
    color: {
      blue: `border-lozenge-blue-border bg-lozenge-blue-bg`,
    },
  },
});

const lozengeTextClass = tv({
  base: `font-sans text-[12px] font-semibold`,
  variants: {
    color: {
      blue: `text-lozenge-blue-fg`,
    },
  },
});
