import type { HanziCharacter, HanziWord } from "@/data/model";
import { View } from "@/client/ui/View";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { WikiAiExplanation } from "./WikiAiExplanation";
import { WikiHanziCharacterDecompositionComponents } from "./WikiHanziCharacterDecompositionComponents";
import { WikiHanziCharacterMeaning } from "./WikiHanziCharacterMeaning";
import { WikiHanziCharacterUsedInCharacters } from "./WikiHanziCharacterUsedInCharacters";
import { WikiHanziExternalResources } from "./WikiHanziExternalResources";
import { WikiHanziCharacterPronunciation } from "./WikiHanziCharacterPronunciation";
import { WikiHanziCharacterUsedInWords } from "./WikiHanziCharacterUsedInWords";
import { WikiHanziRelatedMeanings } from "./WikiHanziRelatedMeanings";
import { WikiHanziSamePronunciation } from "./WikiHanziSamePronunciation";
import { WikiHanziCharacterHeaderOverview } from "./WikiHanziCharacterHeaderOverview";
import { WikiHanziCharacterChooseAMeaning } from "./WikiHanziCharacterChooseAMeaning";
import { useState } from "react";
import { useSkillSrsStates } from "./hooks/useSkillSrsStates";
import { WikiHanziSkillLevelBreakdownBox } from "./WikiHanziSkillLevelBreakdown";

export function WikiHanziBodyCharacterMultipleMeanings({
  hanzi,
  onModalDismiss,
}: {
  hanzi: HanziCharacter;
  onModalDismiss?: () => void;
}) {
  const [hanziWord, setHanziWord] = useState<HanziWord | null>(null);
  const skillSrsStates = useSkillSrsStates();

  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-10 bg-bg pb-7">
        <WikiHanziCharacterHeaderOverview
          hanzi={hanzi}
          hanziWord={hanziWord}
          skillSrsStates={skillSrsStates}
          onModalDismiss={onModalDismiss}
        />

        <WikiHanziCharacterChooseAMeaning
          hanzi={hanzi}
          hanziWord={hanziWord}
          onHanziWordChanged={setHanziWord}
        />

        <WikiHanziCharacterMeaning hanzi={hanzi} hanziWord={hanziWord} />

        <WikiHanziCharacterPronunciation hanzi={hanzi} hanziWord={hanziWord} />

        <WikiHanziCharacterDecompositionComponents hanzi={hanzi} />

        <WikiHanziCharacterUsedInCharacters hanzi={hanzi} />

        <WikiHanziCharacterUsedInWords hanzi={hanzi} />

        <WikiHanziRelatedMeanings hanzi={hanzi} />

        <WikiHanziSamePronunciation hanzi={hanzi} />

        <WikiAiExplanation hanzi={hanzi} />

        {hanziWord == null ? null : (
          <WikiHanziSkillLevelBreakdownBox
            hanziWord={hanziWord}
            skillSrsStates={skillSrsStates}
          />
        )}

        <WikiHanziExternalResources hanzi={hanzi} />
      </View>
    </PylyMdxComponents>
  );
}
