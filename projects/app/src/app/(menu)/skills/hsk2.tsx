import { GroupedHanziWordTiles } from "@/client/ui/GroupedHanziWordTiles";
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

      <GroupedHanziWordTiles hanziWords={dictionary.hsk2HanziWords} />
    </View>
  );
}
