import type { HanziText } from "@/data/model";
import { View } from "react-native";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { WikiHanziCharacterUsedInWords } from "./WikiHanziCharacterUsedInWords";
import { WikiHanziWordCharacters } from "./WikiHanziWordCharacters";
import { WikiMdxHanziMeaning } from "./WikiMdxHanziMeaning";
import { WikiUserMeanings } from "./WikiUserMeanings";

export function WikiHanziBody({ hanzi }: { hanzi: HanziText }) {
  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-6 bg-bg py-7">
        <WikiHanziWordCharacters hanzi={hanzi} />

        <WikiUserMeanings hanzi={hanzi} />

        <WikiMdxHanziMeaning hanzi={hanzi} />

        <WikiHanziCharacterUsedInWords hanzi={hanzi} />
      </View>
    </PylyMdxComponents>
  );
}
