import { intersperse } from "@/client/react";
import { MenuContext } from "@/client/ui/MenuContext";
import { useBookmarkToggle } from "@/client/ui/hooks/useBookmarkToggle";
import type { HanziText, HskLevel } from "@/data/model";
import { arrayFilterUnique } from "@pinyinly/lib/collections";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useState } from "react";
import { Text, View } from "react-native";
import { HskLozenge } from "./HskLozenge";
import { RectButton } from "./RectButton";
import { WikiHanziMeaningsPanel } from "./WikiHanziMeaningsPanel";

export interface WikiHanziHeaderOverviewDataProps {
  hskLevels: readonly HskLevel[];
  glosses: readonly string[] | undefined;
  hanzi: HanziText;
  pinyins: readonly string[] | undefined;
}

export function WikiHanziHeaderOverview({
  hskLevels,
  hanzi,
  pinyins,
  glosses,
  ...rest
}: WikiHanziHeaderOverviewDataProps) {
  true satisfies IsExhaustedRest<typeof rest>;

  const { isPriority, toggle } = useBookmarkToggle(hanzi);
  const uniquePinyins = pinyins?.filter(arrayFilterUnique());

  return (
    <View className="gap-[10px] pl-4">
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
        <MenuContext.TitleScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <View className="gap-1">
        {uniquePinyins == null ? null : (
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
        {glosses == null ? null : (
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
        <View className="mt-2 rounded-lg bg-fg/5 p-4">
          <WikiHanziMeaningsPanel hanzi={hanzi} />
        </View>
      ) : null}
    </>
  );
}
