import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export function Lozenge({
  children,
  color,
  size = `md`,
  className,
}: {
  children: string;
  color: `blue`;
  size?: `sm` | `md`;
  className?: string;
}) {
  return (
    <View className={lozengeContainerClass({ color, size, className })}>
      <Text className={lozengeTextClass({ color, size })}>{children}</Text>
    </View>
  );
}

const lozengeContainerClass = tv({
  base: `rounded-md border`,
  variants: {
    color: {
      blue: `border-lozenge-blue-border bg-lozenge-blue-bg`,
    },
    size: {
      sm: `px-1.5 py-0.5`,
      md: `px-2 py-1`,
    },
  },
});

const lozengeTextClass = tv({
  base: `font-sans font-semibold`,
  variants: {
    color: {
      blue: `text-lozenge-blue-fg`,
    },
    size: {
      sm: `text-[10px]`,
      md: `text-[12px]`,
    },
  },
});
