import { WikiDictionarySearch } from "@/client/ui/WikiDictionarySearch";
import { Text, View } from "react-native";

export default function WikiIndexPage() {
  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="pyly-body-title">Wiki</Text>
        <Text className="pyly-body-caption text-fg-dim">
          Explore characters, words, and meanings with stories, breakdowns, and
          pronunciation.
        </Text>
      </View>

      <WikiDictionarySearch />
    </View>
  );
}
