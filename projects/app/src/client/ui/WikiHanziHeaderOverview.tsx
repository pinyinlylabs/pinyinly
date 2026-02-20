import { intersperse } from "@/client/react";
import type { HanziText, HskLevel } from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { Text, View } from "react-native";
import { HskLozenge } from "./HskLozenge";

export interface WikiHanziHeaderOverviewDataProps {
  hskLevels: readonly HskLevel[];
  glosses?: readonly string[];
  hanzi: HanziText;
  pinyins?: readonly string[];
}

export function WikiHanziHeaderOverview({
  hskLevels,
  hanzi,
  pinyins,
  glosses,
  hanziScrollRef,
  ...rest
}: {
  hanziScrollRef: (node?: Element | null) => void;
} & WikiHanziHeaderOverviewDataProps) {
  true satisfies IsExhaustedRest<typeof rest>;

  return (
    <View className="gap-[10px] pl-4">
      <View className="flex-row gap-1">
        {hskLevels.map((hskLevel) => (
          <HskLozenge hskLevel={hskLevel} key={hskLevel} />
        ))}
      </View>
      <View>
        {/* Scroll detector */}
        <View
          className="h-0 w-full"
          ref={(el) => {
            hanziScrollRef(el as Element | null);
          }}
        />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <View className="gap-1">
        {pinyins == null ? null : (
          <View className="flex-row gap-1">
            {intersperse(
              pinyins.map((pinyin, i) => (
                <Text className="font-sans text-[16px] text-fg-dim" key={i}>
                  {pinyin}
                </Text>
              )),
              <Text className="text-fg-dim/50">•</Text>,
            )}
          </View>
        )}
        {glosses == null ? null : (
          <View className="flex-row gap-1">
            {intersperse(
              glosses.map((gloss, i) => (
                <Text className="font-sans text-[16px] text-fg-loud" key={i}>
                  {gloss}
                </Text>
              )),
              <Text className="text-fg">;</Text>,
            )}
            {/* TODO: make this expand/collapse the definition */}
            {/* <IconImage
                  icon="chevron-down-circled"
                  size={20}
                  className="opacity-50"
                /> */}
          </View>
        )}
      </View>
    </View>
  );
}
