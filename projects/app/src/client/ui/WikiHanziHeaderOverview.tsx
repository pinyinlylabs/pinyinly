import { intersperse } from "@/client/react";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { useBookmarkToggle } from "@/client/ui/hooks/useBookmarkToggle";
import { hskLevelToNumber } from "@/data/hsk";
import type { HanziText } from "@/data/model";
import {
  arrayFilterUnique,
  sortComparatorNumber,
} from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import { Text, View } from "react-native";
import { HskLozenge } from "./HskLozenge";
import { RectButton } from "./RectButton";
import { WikiHanziMeaningsPanel } from "./WikiHanziMeaningsPanel";
import { useDb } from "./hooks/useDb";

export function WikiHanziHeaderOverview({
  hanzi,
  ...rest
}: {
  hanzi: HanziText;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi)),
    [db.dictionarySearch, hanzi],
  );

  const hskLevels = [
    ...dictionarySearchEntries.map((entry) => entry.hsk),
    ...dictionarySearchEntries.map((entry) => entry.hskFirstAppearance),
  ]
    .filter((x) => x != null)
    .filter(arrayFilterUnique())
    .sort(sortComparatorNumber(hskLevelToNumber));
  const pinyins = dictionarySearchEntries
    .map((entry) => entry.pinyin?.[0])
    .filter((x) => x != null);
  const glosses = dictionarySearchEntries
    .map((entry) => entry.gloss[0])
    .filter((x) => x != null);

  const { isPriority, toggle } = useBookmarkToggle(hanzi);
  const uniquePinyins = pinyins.filter(arrayFilterUnique());

  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center gap-1">
        <View className="flex-1 flex-row gap-1">
          {hskLevels.map((hskLevel) => (
            <HskLozenge hskLevel={hskLevel} key={hskLevel} />
          ))}
        </View>
        <RectButton
          variant="bare"
          iconStart={isPriority ? `bookmark-filled` : `bookmark`}
          onPress={toggle}
          className="opacity-70"
        />
      </View>
      <View>
        <HeaderTitleProvider.ScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <View className="gap-1">
        {uniquePinyins.length === 0 ? null : (
          <View className="flex-row gap-1">
            {intersperse(
              uniquePinyins.map((pinyin, i) => (
                <Text className="font-sans text-[16px] text-fg-dim" key={i}>
                  {pinyin}
                </Text>
              )),
              <Text className="text-fg-dim/50">•</Text>,
            )}
          </View>
        )}
        {glosses.length === 0 ? null : (
          <ExpandableGlosses hanzi={hanzi} glosses={glosses} />
        )}
      </View>
    </View>
  );
}

function ExpandableGlosses({
  hanzi,
  glosses,
}: {
  hanzi: HanziText;
  glosses: readonly string[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <View className="flex-row items-center gap-1">
        <View>
          <Text>
            {intersperse(
              glosses.map((gloss, i) => (
                <Text className="font-sans text-[16px] text-fg-loud" key={i}>
                  {gloss}
                </Text>
              )),
              <Text className="text-fg">; </Text>,
            )}
          </Text>
        </View>

        <RectButton
          iconStart={expanded ? `chevron-up-circled` : `chevron-down-circled`}
          onPress={() => {
            setExpanded((value) => !value);
          }}
          variant="bare"
          className="opacity-70"
        />
      </View>
      {expanded ? (
        <View className="mt-2">
          <WikiHanziMeaningsPanel hanzi={hanzi} />
        </View>
      ) : null}
    </>
  );
}
