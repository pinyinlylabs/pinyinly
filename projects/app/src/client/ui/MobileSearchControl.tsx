import { Modal, Platform, Pressable } from "react-native";
import { useState } from "react";
import { Icon } from "./Icon";
import { QuickSearchResults } from "./QuickSearchResults";
import { TextInputSingle } from "./TextInputSingle";
import { View } from "./View";

export function MobileSearchControl() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(``);

  function closeSearch() {
    setQuery(``);
    setIsOpen(false);
  }

  const searchOverlay = (
    <View className="size-full bg-bg pt-safe-offset-2 px-safe-or-4">
      <View className="h-14 flex-row items-center gap-2">
        <View className="relative flex-1">
          <Icon
            icon="search"
            size={20}
            tintColorClassName="accent-muted-fg"
            className="pointer-events-none absolute top-1/2 left-3 z-10 -translate-y-1/2"
          />
          <TextInputSingle
            autoFocus
            accessibilityLabel="Search"
            placeholder="Search dictionary"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            className="pl-10"
          />
        </View>
        <Pressable
          accessibilityLabel="Close search"
          accessibilityRole="button"
          onPress={closeSearch}
          className="size-8 items-center justify-center"
        >
          <Icon icon="close" size={32} />
        </Pressable>
      </View>
      <View className="flex-1">
        <QuickSearchResults
          query={query}
          onChangeQuery={setQuery}
          onSelect={closeSearch}
        />
      </View>
    </View>
  );

  return (
    <>
      <View className="relative size-8">
        <Icon
          icon="search"
          size={24}
          className="pointer-events-none absolute inset-0 m-auto"
        />
        <TextInputSingle
          accessibilityLabel="Open search"
          placeholder={undefined}
          value={query}
          onChangeText={setQuery}
          onFocus={() => {
            setIsOpen(true);
          }}
          autoCorrect={false}
          caretHidden
          className="size-8 cursor-pointer px-0 text-transparent outline-none"
          variant="bare"
        />
      </View>

      {isOpen && Platform.OS === `web` ? (
        <View
          className="bg-bg"
          style={{
            position: `fixed`,
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            zIndex: 30,
          }}
        >
          {searchOverlay}
        </View>
      ) : null}
      {isOpen && Platform.OS !== `web` ? (
        <Modal
          visible
          transparent={false}
          animationType="none"
          onRequestClose={closeSearch}
        >
          {searchOverlay}
        </Modal>
      ) : null}
    </>
  );
}
