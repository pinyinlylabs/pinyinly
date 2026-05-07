import { useState } from "react";
import type { ViewProps } from "react-native";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { Icon } from "./Icon";
import { QuickSearchModal } from "./QuickSearchModal";

export function QuickSearchButton({
  className,
}: {
  className?: ViewProps[`className`];
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => {
          setIsModalOpen(true);
        }}
        collapsable={false}
        className={pressableClass({ className })}
      >
        <View className="flex-row items-center gap-2">
          <Icon icon="search" size={16} className="text-fg-dim" />
          <Text className="font-sans text-sm font-medium text-fg-dim">
            Search…
          </Text>
        </View>

        <Text className="font-sans text-xs font-semibold text-fg-dim">⌘K</Text>
      </Pressable>
      {isModalOpen ? (
        <QuickSearchModal
          onDismiss={() => {
            setIsModalOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

const pressableClass = tv({
  base: `
    flex-row items-center justify-between gap-6 rounded-xl bg-bg-high px-3 py-2

    hover:bg-fg/20
  `,
});
