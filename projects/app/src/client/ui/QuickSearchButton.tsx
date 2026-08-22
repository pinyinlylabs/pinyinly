import { useState } from "react";
import type { ViewProps } from "react-native";
import { Pressable } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
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
          <Icon icon="search" size={16} tintColorClassName="accent-muted-fg" />
          <Text className="font-sans text-base font-medium text-muted-fg">
            Search…
          </Text>
        </View>

        <Text className="font-sans text-sm font-semibold text-muted-fg">
          ⌘ K
        </Text>
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
