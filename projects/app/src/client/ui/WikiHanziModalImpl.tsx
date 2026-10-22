import type { HanziText } from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView } from "react-native";
import { View } from "@/client/ui/View";
import { HeaderProvider } from "./HeaderProvider";
import { CloseButton } from "./CloseButton";
import { WikiHanziBody } from "./WikiHanziBody";
import { WikiHanziModalContext } from "./WikiHanziModalContext";

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
  onModalDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
  onModalDismiss: () => void;
}) {
  const [isHeaderBackgroundVisible, setIsHeaderBackgroundVisible] =
    useState(false);

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const shouldShowBackground = event.nativeEvent.contentOffset.y > 8;
    setIsHeaderBackgroundVisible((prev) => {
      if (prev === shouldShowBackground) {
        return prev;
      }
      return shouldShowBackground;
    });
  }

  return (
    <HeaderProvider actionsSlotEnabled>
      <WikiHanziModalContext.Provider value={{ isInWikiHanziModal: true }}>
        <ScrollView
          onScroll={handleScroll}
          scrollEventThrottle={16}
          className={
            // Use a linear gradient on the background so that rubber band
            // scrolling showing the correct color at the top and bottom.
            `h-screen`
          }
          contentContainerClassName="min-h-full pb-10"
        >
          <Header
            onDismiss={onDismiss}
            isBackgroundVisible={isHeaderBackgroundVisible}
          />

          <View className="px-safe-or-4">
            <WikiHanziBody hanzi={hanzi} onModalDismiss={onModalDismiss} />
          </View>
        </ScrollView>
      </WikiHanziModalContext.Provider>
    </HeaderProvider>
  );
}

function Header({
  onDismiss,
  isBackgroundVisible,
  ...rest
}: {
  onDismiss: () => void;
  isBackgroundVisible: boolean;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  return (
    <View className="sticky top-0 z-10">
      <View className="sticky top-0 z-10 h-14 flex-row items-center px-4">
        {isBackgroundVisible ? (
          <View
            className={`
              pointer-events-none absolute -inset-x-2 top-0 -bottom-10 bg-bg/90
              [mask-image:linear-gradient(to_top,transparent,black_50%,black)] backdrop-blur-sm
            `}
          />
        ) : null}

        <View className="w-20 items-start">
          <CloseButton onPress={onDismiss} />
        </View>

        <View className="flex-1 content-center items-center">
          <HeaderProvider.TitleText className="font-sans text-3xl text-fg-loud" />
        </View>

        <View className="w-20 items-end">
          <HeaderProvider.ActionsSlot />
        </View>
      </View>
    </View>
  );
}
