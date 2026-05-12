import type { HanziText } from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView, View } from "react-native";
import { HeaderTitleProvider } from "./HeaderTitleProvider";
import { CloseButton } from "./CloseButton";
import { RectButton } from "./RectButton";
import { WikiHanziBody } from "./WikiHanziBody";

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
  onExpand,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
  onExpand: () => void;
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
    <HeaderTitleProvider>
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        className={
          // Use a linear gradient on the background so that rubber band
          // scrolling showing the correct color at the top and bottom.
          `h-screen`
        }
        contentContainerClassName="pb-10 min-h-full"
      >
        <Header
          onDismiss={onDismiss}
          onExpand={onExpand}
          isBackgroundVisible={isHeaderBackgroundVisible}
        />

        <View className="px-safe-or-4">
          <WikiHanziBody hanzi={hanzi} />
        </View>
      </ScrollView>
    </HeaderTitleProvider>
  );
}

function Header({
  onDismiss,
  onExpand,
  isBackgroundVisible,
  ...rest
}: {
  onDismiss: () => void;
  onExpand: () => void;
  isBackgroundVisible: boolean;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  return (
    <View className="sticky top-0 z-10">
      <View className="sticky top-0 z-10 h-[56px] flex-row items-center px-4">
        {isBackgroundVisible ? (
          <View
            className={`
              pointer-events-none absolute -inset-x-2 -bottom-10 top-0 bg-bg/90 backdrop-blur-sm

              [mask-image:linear-gradient(to_top,transparent,black_50%,black)]
            `}
          />
        ) : null}

        <View className="w-20 items-start">
          <CloseButton onPress={onDismiss} />
        </View>

        <View className="flex-1 content-center items-center">
          <HeaderTitleProvider.TitleText className="font-sans text-3xl text-fg-loud" />
        </View>

        <View className="w-20 items-end">
          <RectButton variant="bare" onPress={onExpand} iconStart="size">
            Expand
          </RectButton>
        </View>
      </View>
    </View>
  );
}
