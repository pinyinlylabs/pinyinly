import { useState } from "react";
import type { ViewProps } from "react-native";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { RectButton } from "./RectButton";

export function WikiTitledBox({
  title,
  children,
  className,
  headerCustomAction,
  onEditingChange,
}: {
  title: string;
  children: React.ReactNode;
  className?: ViewProps[`className`];
  headerCustomAction?: React.ReactNode;
  onEditingChange?: (isEditing: boolean) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const headerAction =
    headerCustomAction ??
    (onEditingChange == null ? null : isEditing ? (
      <RectButton
        variant="barePrimary"
        onPress={() => {
          setIsEditing(false);
          onEditingChange(false);
        }}
      >
        Done
      </RectButton>
    ) : (
      <RectButton
        variant="bareDim"
        iconStart="pencil"
        onPress={() => {
          setIsEditing(true);
          onEditingChange(true);
        }}
      >
        Edit
      </RectButton>
    ));

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
