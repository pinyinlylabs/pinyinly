import type { HanziCharacter } from "@/data/model";
import { View } from "@/client/ui/View";
import { WikiHanziCharacterMeaning } from "./WikiHanziCharacterMeaning";
import { DemoBetaFeaturesKnob, LittlePrimaryHeader } from "./demo/components";

export default () => {
  return (
    <View className="max-w-125 flex-1 gap-2">
      <DemoBetaFeaturesKnob />
      <WikiHanziCharacterMeaning
        hanzi={`看` as HanziCharacter}
        hanziWord={null}
      />

      <LittlePrimaryHeader title="No mnemonic" />

      <WikiHanziCharacterMeaning
        hanzi={`看` as HanziCharacter}
        hanziWord={null}
      />
    </View>
  );
};
