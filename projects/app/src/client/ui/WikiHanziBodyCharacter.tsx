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
import { WikiHanziCharacterHeaderOverview } from "./WikiHanziCharacterHeaderOverview";
import { WikiHanziCharacterChooseAMeaning } from "./WikiHanziCharacterChooseAMeaning";

export function WikiHanziBodyCharacter({ hanzi }: { hanzi: HanziCharacter }) {
  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-10 bg-bg py-7">
        <WikiHanziCharacterHeaderOverview hanzi={hanzi} />

        <WikiHanziCharacterChooseAMeaning hanzi={hanzi} />

        <WikiHanziCharacterMeaning hanzi={hanzi} />

        <WikiHanziCharacterPronunciation hanzi={hanzi} />

        <WikiHanziCharacterDecompositionComponents hanzi={hanzi} />

        <WikiHanziCharacterUsedInCharacters hanzi={hanzi} />

        <WikiHanziCharacterUsedInWords hanzi={hanzi} />

        <WikiHanziRelatedMeanings hanzi={hanzi} />

        <WikiHanziSamePronunciation hanzi={hanzi} />

        <WikiAiExplanation hanzi={hanzi} />

        <WikiHanziExternalResources hanzi={hanzi} />
      </View>
    </PylyMdxComponents>
  );
}
