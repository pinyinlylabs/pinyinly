import { hskLevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { ScrollView, View } from "react-native";
import { HeaderTitleProvider } from "./HeaderTitleProvider";
import { CloseButton } from "./CloseButton";
import { RectButton } from "./RectButton";
import { WikiHanziBody } from "./WikiHanziBody";
import { WikiHanziHeaderOverview } from "./WikiHanziHeaderOverview";
import { useDb } from "./hooks/useDb";

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
  onExpand,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
  onExpand: () => void;
}) {
  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionarySearch, hanzi],
  );

  const hskLevels = dictionarySearchEntries
    .map((entry) => entry.hsk)
    .filter((x) => x != null)
    .filter(arrayFilterUnique())
    .sort(sortComparatorNumber(hskLevelToNumber));
  const pinyins = dictionarySearchEntries
    .map((entry) => entry.pinyin?.[0])
    .filter((x) => x != null);
  const glosses = dictionarySearchEntries
    .map((entry) => entry.gloss[0])
    .filter((x) => x != null);
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
          <WikiHanziHeaderOverview
            hanzi={hanzi}
            hskLevels={hskLevels}
            pinyins={pinyins}
            glosses={glosses}
          />

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

              [-webkit-mask-image:linear-gradient(to_top,transparent,black_50%,black)]

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
