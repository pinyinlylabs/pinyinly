import { hskLevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useIntersectionObserver } from "@uidotdev/usehooks";
import { Text, View } from "react-native";
import { useDb } from "./hooks/useDb";
import { WikiHanziBody } from "./WikiHanziBody";
import type { WikiHanziHeaderOverviewDataProps } from "./WikiHanziHeaderOverview";
import { WikiHanziHeaderOverview } from "./WikiHanziHeaderOverview";

export function WikiHanziPageImpl({ hanzi }: { hanzi: HanziText }) {
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
    <>
      <Header
        hanzi={hanzi}
        pinyins={pinyins}
        glosses={glosses}
        meanings={dictionarySearchEntries}
        hskLevels={hskLevels}
      />

      <WikiHanziBody hanzi={hanzi} />
    </>
  );
}

function Header({
  glosses,
  pinyins,
  hanzi,
  hskLevels,
  meanings,
  ...rest
}: WikiHanziHeaderOverviewDataProps) {
  true satisfies IsExhaustedRest<typeof rest>;

  const [ref, entry] = useIntersectionObserver();

  const showHeaderHanziTile = entry != null && !entry.isIntersecting;

  return (
    <>
      <StickyScrollHeader hanzi={hanzi} show={showHeaderHanziTile} />

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
