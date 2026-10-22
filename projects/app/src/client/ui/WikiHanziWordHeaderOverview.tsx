import { HeaderProvider } from "@/client/ui/HeaderProvider";
import type { HanziText, HanziWord } from "@/data/model";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useState } from "react";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useSkillSrsStates } from "./hooks/useSkillSrsStates";
import { WikiHanziHskLozenges } from "./WikiHanziHskLozenges";
import { WikiHanziMeaningsPanel } from "./WikiHanziMeaningsPanel";
import { WikiHanziProgressLozenge } from "./WikiHanziProgressLozenge";
import { WikiHanziBookmarkMenu } from "./WikiHanziBookmarkMenu";
import { WikiHanziBookmarkLozenge } from "./WikiHanziBookmarkLozenge";
import { WikiHanziSkillLevelBreakdownBox } from "./WikiHanziSkillLevelBreakdown";

export function WikiHanziWordHeaderOverview({
  hanzi,
  onModalDismiss,
  ...rest
}: {
  hanzi: HanziText;
  onModalDismiss?: () => void;
}) {
  true satisfies IsExhaustedRest<typeof rest>;

  const skillSrsStates = useSkillSrsStates();
  const [studyHanziWord, setStudyHanziWord] = useState<HanziWord | null>(null);

  return (
    <View className="gap-[10px]">
      <View className="flex-row items-center gap-1">
        <View className="flex-1 flex-row items-center gap-1">
          <WikiHanziBookmarkLozenge hanziWord={studyHanziWord} />
          <WikiHanziHskLozenges hanzi={hanzi} />
          <WikiHanziProgressLozenge
            hanzi={hanzi}
            hanziWord={studyHanziWord}
            skillSrsStates={skillSrsStates}
          />
        </View>
        <HeaderProvider.ActionsPortal>
          <WikiHanziBookmarkMenu
            hanziWord={studyHanziWord}
            hanzi={hanzi}
            onModalDismiss={onModalDismiss}
          />
        </HeaderProvider.ActionsPortal>
      </View>
      <View>
        <HeaderProvider.ScrollTrigger title={hanzi} />
        <Text className="font-sans text-[48px] font-semibold text-fg-loud">
          {hanzi}
        </Text>
      </View>
      <WikiHanziMeaningsPanel
        hanzi={hanzi}
        selectedHanziWord={studyHanziWord}
        onHanziWordSelected={(hanziWord) => {
          setStudyHanziWord(hanziWord);
        }}
      />
      {studyHanziWord == null ? null : (
        <WikiHanziSkillLevelBreakdownBox
          hanziWord={studyHanziWord}
          skillSrsStates={skillSrsStates}
        />
      )}
    </View>
  );
}
