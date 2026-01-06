import { GroupedHanziWordTiles } from "@/client/ui/GroupedHanziWordTiles";
import { loadDictionary } from "@/dictionary";
import { use } from "react";
import { Text, View } from "react-native";

export default function SkillsHsk3Page() {
  const dictionary = use(loadDictionary());

  return (
    <View className="gap-5">
      <View>
        <Text className="pyly-body-title">HSK 3</Text>
      </View>

      <GroupedHanziWordTiles hanziWords={dictionary.hsk3HanziWords} />
    </View>
  );
}
