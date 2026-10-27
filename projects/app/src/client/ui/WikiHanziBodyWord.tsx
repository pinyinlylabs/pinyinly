import type { HanziText, HanziWord } from "@/data/model";
import { View } from "@/client/ui/View";
import { useState } from "react";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { WikiAiExplanation } from "./WikiAiExplanation";
import { WikiHanziExternalResources } from "./WikiHanziExternalResources";
import { WikiHanziRelatedMeanings } from "./WikiHanziRelatedMeanings";
import { WikiHanziSamePronunciation } from "./WikiHanziSamePronunciation";
import { WikiHanziWordHeaderOverview } from "./WikiHanziWordHeaderOverview";
import { WikiHanziWordCharacters } from "./WikiHanziWordCharacters";
import { useSkillSrsStates } from "./hooks/useSkillSrsStates";
import { WikiHanziSkillLevelBreakdownBox } from "./WikiHanziSkillLevelBreakdown";

export function WikiHanziBodyWord({
  hanzi,
  onModalDismiss,
}: {
  hanzi: HanziText;
  onModalDismiss?: () => void;
}) {
  const [studyHanziWord, setStudyHanziWord] = useState<HanziWord | null>(null);
  const skillSrsStates = useSkillSrsStates();

  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-10 bg-bg pb-7">
        <WikiHanziWordHeaderOverview
          hanzi={hanzi}
          studyHanziWord={studyHanziWord}
          onHanziWordSelected={setStudyHanziWord}
          skillSrsStates={skillSrsStates}
          onModalDismiss={onModalDismiss}
        />

        <WikiHanziWordCharacters hanzi={hanzi} />

        <WikiHanziRelatedMeanings hanzi={hanzi} />

        <WikiHanziSamePronunciation hanzi={hanzi} />

        <WikiAiExplanation hanzi={hanzi} />

        {studyHanziWord == null ? null : (
          <WikiHanziSkillLevelBreakdownBox
            hanziWord={studyHanziWord}
            skillSrsStates={skillSrsStates}
          />
        )}

        <WikiHanziExternalResources hanzi={hanzi} />
      </View>
    </PylyMdxComponents>
  );
}
