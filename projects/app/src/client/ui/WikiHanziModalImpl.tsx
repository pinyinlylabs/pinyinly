import { hskLevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { ScrollView, Text, View } from "react-native";
import { CloseButton } from "./CloseButton";
import { WikiHanziBody } from "./WikiHanziBody";
import type { WikiHanziHeaderOverviewDataProps } from "./WikiHanziHeaderOverview";
import { WikiHanziHeaderOverview } from "./WikiHanziHeaderOverview";
import { useDb } from "./hooks/useDb";

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
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

  return (
    <ScrollView
      className={
        // Use a linear gradient on the background so that rubber band
        // scrolling showing the correct color at the top and bottom.
        `h-screen`
      }
      contentContainerClassName="pb-10 min-h-full"
    >
      <Header
        hanzi={hanzi}
        pinyins={pinyins}
        hskLevels={hskLevels}
        glosses={glosses}
        meanings={dictionarySearchEntries}
        onDismiss={onDismiss}
      />

      <WikiHanziBody hanzi={hanzi} />
    </ScrollView>
  );
}

function Header({
  glosses,
  pinyins,
  hanzi,
  hskLevels,
  onDismiss,
  meanings,
  ...rest
}: {
  onDismiss: () => void;
} & WikiHanziHeaderOverviewDataProps) {
  true satisfies IsExhaustedRest<typeof rest>;

  const [ref, entry] = useIntersectionObserver();

  const showHeaderHanziTile = entry != null && !entry.isIntersecting;

  return (
    <>
      <View className="sticky top-0 z-10">
        <View
          className={`
            sticky top-0 z-10 h-[56px] flex-row content-between items-center bg-bg/90 pl-4
          `}
        >
          <CloseButton onPress={onDismiss} />

          <View className="flex-1 content-center items-center">
            <Text
              className={`
                font-sans text-3xl text-fg-loud

                ${showHeaderHanziTile ? `opacity-100 transition-opacity` : `opacity-0`}
              `}
            >
              {hanzi}
            </Text>
          </View>

          <View className="invisible">
            <CloseButton onPress={onDismiss} />
          </View>
        </View>
      </View>

      <WikiHanziHeaderOverview
        hanzi={hanzi}
        hskLevels={hskLevels}
        pinyins={pinyins}
        glosses={glosses}
        meanings={meanings}
        hanziScrollRef={ref}
      />
    </>
  );
}
