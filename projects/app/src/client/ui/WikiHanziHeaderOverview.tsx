import { intersperse } from "@/client/react";
import { isHanziCharacter } from "@/data/hanzi";
import type { HanziText, HskLevel } from "@/data/model";
import type { HanziWordWithMeaning } from "@/dictionary";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useState } from "react";
import { Text, View } from "react-native";
import { HskLozenge } from "./HskLozenge";
import { RectButton } from "./RectButton";
import { WikiHanziCharacterMeanings } from "./WikiHanziCharacterMeanings";

export interface WikiHanziHeaderOverviewDataProps {
  hskLevels: readonly HskLevel[];
  glosses: readonly string[] | undefined;
  hanzi: HanziText;
  pinyins: readonly string[] | undefined;
  meanings: readonly HanziWordWithMeaning[] | undefined;
}

export function WikiHanziHeaderOverview({
  hskLevels,
  hanzi,
  pinyins,
  glosses,
  meanings,
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
          <ExpandableGlosses
            hanzi={hanzi}
            glosses={glosses}
            meanings={meanings}
          />
        )}
      </View>
    </View>
  );
}

function ExpandableGlosses({
  hanzi,
  glosses,
  meanings,
}: {
  hanzi: HanziText;
  glosses: readonly string[];
  meanings: readonly HanziWordWithMeaning[] | undefined;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <View className="flex-row items-center gap-1">
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

        {meanings == null || !isHanziCharacter(hanzi) ? null : (
          <RectButton
            iconStart={expanded ? `chevron-up-circled` : `chevron-down-circled`}
            onPress={() => {
              setExpanded((value) => !value);
            }}
            variant="bare"
            className="opacity-70"
          />
        )}
      </View>
      {meanings == null || !isHanziCharacter(hanzi) || !expanded ? null : (
        <View className="mt-2 rounded-lg bg-fg/5 p-4">
          <WikiHanziCharacterMeanings hanzi={hanzi} meanings={meanings} />
        </View>
      )}
    </>
  );
}
