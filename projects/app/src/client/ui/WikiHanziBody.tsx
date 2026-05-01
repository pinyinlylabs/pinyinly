import type { HanziText } from "@/data/model";
import { View } from "react-native";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { WikiAiExplanation } from "./WikiAiExplanation";
import { WikiHanziCharacterDecomposition } from "./WikiHanziCharacterDecomposition";
import { WikiHanziCharacterUsedAsComponent } from "./WikiHanziCharacterUsedAsComponent";
import { WikiHanziExternalResources } from "./WikiHanziExternalResources";
import { WikiHanziCharacterPronunciation } from "./WikiHanziCharacterPronunciation";
import { WikiHanziCharacterUsedInWords } from "./WikiHanziCharacterUsedInWords";
import { WikiHanziWordCharacters } from "./WikiHanziWordCharacters";

export function WikiHanziBody({ hanzi }: { hanzi: HanziText }) {
  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-6 bg-bg py-7">
        <WikiHanziWordCharacters hanzi={hanzi} />

        <WikiHanziCharacterDecomposition hanzi={hanzi} />

        <WikiHanziCharacterPronunciation hanzi={hanzi} />

        <WikiHanziCharacterUsedInWords hanzi={hanzi} />

        <WikiHanziCharacterUsedAsComponent hanzi={hanzi} />

        <WikiAiExplanation hanzi={hanzi} />

        <WikiHanziExternalResources hanzi={hanzi} />
      </View>
    </PylyMdxComponents>
  );
}
