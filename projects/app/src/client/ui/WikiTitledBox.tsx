import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export function WikiTitledBox({
  title,
  children,
  className,
  headerAction,
}: {
  title: string;
  children: React.ReactNode;
  className?: ViewProps[`className`];
  headerAction?: React.ReactNode;
}) {
  return (
    <View className={containerClass({ className })}>
      <View className="flex-row items-center">
        <Text className="pyly-body-subheading flex-1">{title}</Text>
        {headerAction}
      </View>

      <View className="rounded-lg bg-fg/5">{children}</View>
    </View>
  );
}

const containerClass = tv({
  base: `gap-2`,
});
