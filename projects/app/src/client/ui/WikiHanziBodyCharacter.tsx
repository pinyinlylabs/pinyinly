import type { HanziCharacter } from "@/data/model";
import { View } from "react-native";
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

export function WikiHanziBodyCharacter({ hanzi }: { hanzi: HanziCharacter }) {
  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-10 bg-bg py-7">
        <WikiHanziCharacterHeaderOverview hanzi={hanzi} />

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
