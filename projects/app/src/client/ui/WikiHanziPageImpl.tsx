import { hskLevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import { loadDictionary } from "@/dictionary";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { use, useState } from "react";
import { Text, View } from "react-native";
import { useIntersectionObserver, useTimeout } from "usehooks-ts";
import { PylyMdxComponents } from "./PylyMdxComponents";
import type { WikiHanziHeaderOverviewDataProps } from "./WikiHanziHeaderOverview";
import { WikiHanziHeaderOverview } from "./WikiHanziHeaderOverview";
import { WikiMdxHanziMeaning } from "./WikiMdxHanziMeaning";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
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
    <>
      <Header
        hanzi={hanzi}
        pinyins={pinyins}
        glosses={glosses}
        hskLevels={hskLevels}
      />

      <PylyMdxComponents>
        <View className="flex-1 gap-6 bg-bg py-7">
          <WikiMdxHanziMeaning hanzi={hanzi} />
        </View>
      </PylyMdxComponents>
    </>
  );
}

function Header({
  glosses,
  pinyins,
  hanzi,
  hskLevels,
  ...rest
}: WikiHanziHeaderOverviewDataProps) {
  true satisfies IsExhaustedRest<typeof rest>;

  // Fix some glitchiness when opening the modal by delaying showing the
  // header hanzi tile until after a short timeout.
  const [uiStable, setUiStable] = useState(false);
  useTimeout(() => {
    setUiStable(true);
  }, 250);

  const [ref1, isIntersecting1] = useIntersectionObserver({
    // threshold: 1,
    initialIsIntersecting: true,
  });

  const showHeaderHanziTile = uiStable && !isIntersecting1;

  return (
    <>
      <StickyScrollHeader hanzi={hanzi} show={showHeaderHanziTile} />

      <WikiHanziHeaderOverview
        hanzi={hanzi}
        hskLevels={hskLevels}
        pinyins={pinyins}
        glosses={glosses}
        hanziScrollRef={ref1}
      />
    </>
  );
}

function StickyScrollHeader({ hanzi, show }: { hanzi: string; show: boolean }) {
  return (
    <View className="sticky top-0 z-10">
      <View
        className={`sticky top-0 z-10 h-[56px] flex-row content-between items-center bg-bg/90 pl-4`}
      >
        <View className="flex-1 content-center items-center">
          <Text
            className={`
              text-3xl text-fg-loud

              ${show ? `opacity-100 transition-opacity` : `opacity-0`}
            `}
          >
            {hanzi}
          </Text>
        </View>
      </View>
    </View>
  );
}
