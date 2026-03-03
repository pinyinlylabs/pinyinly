import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export function WikiTitledBox({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: ViewProps[`className`];
}) {
  return (
    <View className={containerClass({ className })}>
      <View className="">
        <Text className="pyly-body-subheading">{title}</Text>
      </View>

      <View className="rounded-lg bg-fg/5">{children}</View>
    </View>
  );
}

const containerClass = tv({
  base: `gap-2`,
});
