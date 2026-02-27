import { hskLevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import { loadDictionary } from "@/dictionary";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { use } from "react";
import { ScrollView, Text, View } from "react-native";
import { CloseButton } from "./CloseButton";
import { PylyMdxComponents } from "./PylyMdxComponents";
import type { WikiHanziHeaderOverviewDataProps } from "./WikiHanziHeaderOverview";
import { WikiHanziHeaderOverview } from "./WikiHanziHeaderOverview";
import { WikiMdxHanziMeaning } from "./WikiMdxHanziMeaning";

export function WikiHanziModalImpl({
  hanzi,
  onDismiss,
}: {
  hanzi: HanziText;
  onDismiss: () => void;
}) {
  const dictionary = use(loadDictionary());
  const hanziWordMeanings = dictionary.lookupHanzi(hanzi);
  const hskLevels = hanziWordMeanings
    .map(([_, meaning]) => meaning.hsk)
    .filter((x) => x != null)
    .filter(arrayFilterUnique())
    .sort(sortComparatorNumber(hskLevelToNumber));
  const pinyins = hanziWordMeanings
    .map(([_, meaning]) => meaning.pinyin?.[0])
    .filter((x) => x != null);
  const glosses = hanziWordMeanings
    .map(([_, meaning]) => meaning.gloss[0])
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
        meanings={hanziWordMeanings}
        onDismiss={onDismiss}
      />

      <PylyMdxComponents>
        <View className="flex-1 gap-6 bg-bg py-7">
          <WikiMdxHanziMeaning hanzi={hanzi} />
        </View>
      </PylyMdxComponents>
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
