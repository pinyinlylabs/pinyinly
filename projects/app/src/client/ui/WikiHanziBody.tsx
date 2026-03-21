import type { HanziText } from "@/data/model";
import { View } from "react-native";
import { PylyMdxComponents } from "./PylyMdxComponents";
import { WikiHanziCharacterUsedInWords } from "./WikiHanziCharacterUsedInWords";
import { WikiHanziWordCharacters } from "./WikiHanziWordCharacters";
import { WikiMdxHanziMeaning } from "./WikiMdxHanziMeaning";

export function WikiHanziBody({ hanzi }: { hanzi: HanziText }) {
  return (
    <PylyMdxComponents>
      <View className="flex-1 gap-6 bg-bg py-7">
        <WikiHanziWordCharacters hanzi={hanzi} />

        <WikiMdxHanziMeaning hanzi={hanzi} />

        <WikiHanziCharacterUsedInWords hanzi={hanzi} />
      </View>
    </PylyMdxComponents>
  );
}
