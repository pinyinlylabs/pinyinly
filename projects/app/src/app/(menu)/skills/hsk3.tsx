import { HanziWordTile } from "@/client/ui/HanziWordTile";
import { allHsk3HanziWords } from "@/dictionary";
import { use } from "react";
import { Text, View } from "react-native";

export default function SkillsHsk3Page() {
  const hanziWords = use(allHsk3HanziWords());

  return (
    <View className="gap-5">
      <View>
        <Text className="pyly-body-title">HSK 3</Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {hanziWords.map((hanziWord) => (
          <HanziWordTile hanziWord={hanziWord} key={hanziWord} linked />
        ))}
      </View>
    </View>
  );
}
