import type { HanziCharacter } from "@/data/model";
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
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./hooks/useDb";
import { WikiHanziCharacterMultipleMeaningsHeaderOverview } from "./WikiHanziCharacterMultipleMeaningsHeaderOverview";
import { useSkillSrsStates } from "./hooks/useSkillSrsStates";
import { WikiHanziSkillLevelBreakdownBox } from "./WikiHanziSkillLevelBreakdown";

export function WikiHanziBodyCharacter({
  hanzi,
  onModalDismiss,
}: {
  hanzi: HanziCharacter;
  onModalDismiss?: () => void;
}) {
  const db = useDb();
  const skillSrsStates = useSkillSrsStates();

  const { data: dictionaryEntry } = useLiveQuery({
    query: (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .findOne(),
  });

  const hanziWord = dictionaryEntry?.hanziWord ?? null;

  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-10 bg-bg pb-7">
        <WikiHanziCharacterMultipleMeaningsHeaderOverview
          hanzi={hanzi}
          hanziWord={hanziWord}
          skillSrsStates={skillSrsStates}
          onModalDismiss={onModalDismiss}
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
