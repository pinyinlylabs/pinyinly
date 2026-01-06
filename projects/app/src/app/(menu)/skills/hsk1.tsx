import { GroupedHanziWordTiles } from "@/client/ui/GroupedHanziWordTiles";
import { loadDictionary } from "@/dictionary";
import { use } from "react";
import { Text, View } from "react-native";

export default function SkillsHsk1Page() {
  const dictionary = use(loadDictionary());

  return (
    <View className="gap-5">
      <View>
        <Text className="pyly-body-title">HSK 1</Text>
      </View>

      <GroupedHanziWordTiles hanziWords={dictionary.hsk1HanziWords} />
    </View>
  );
}
