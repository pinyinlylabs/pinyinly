import type { HanziText } from "@/data/model";
import { View } from "@/client/ui/View";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { WikiAiExplanation } from "./WikiAiExplanation";
import { WikiHanziExternalResources } from "./WikiHanziExternalResources";
import { WikiHanziRelatedMeanings } from "./WikiHanziRelatedMeanings";
import { WikiHanziSamePronunciation } from "./WikiHanziSamePronunciation";
import { WikiHanziWordHeaderOverview } from "./WikiHanziWordHeaderOverview";
import { WikiHanziWordCharacters } from "./WikiHanziWordCharacters";

export function WikiHanziBodyWord({ hanzi }: { hanzi: HanziText }) {
  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-10 bg-bg py-7">
        <WikiHanziWordHeaderOverview hanzi={hanzi} />

        <WikiHanziWordCharacters hanzi={hanzi} />

        <WikiHanziRelatedMeanings hanzi={hanzi} />

        <WikiHanziSamePronunciation hanzi={hanzi} />

        <WikiAiExplanation hanzi={hanzi} />

        <WikiHanziExternalResources hanzi={hanzi} />
      </View>
    </PylyMdxComponents>
  );
}
