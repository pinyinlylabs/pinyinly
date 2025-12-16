import { HanziWordTile } from "@/client/ui/HanziWordTile";
import { loadDictionary } from "@/dictionary";
import { use } from "react";
import { Text, View } from "react-native";

export default function SkillsHsk2Page() {
  const dictionary = use(loadDictionary());

  return (
    <View className="gap-5">
      <View>
        <Text className="pyly-body-title">HSK 2</Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {dictionary.hsk2HanziWords.map((hanziWord) => (
          <HanziWordTile hanziWord={hanziWord} key={hanziWord} linked />
        ))}
      </View>
    </View>
  );
}
