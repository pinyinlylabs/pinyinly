import { PriorityWordsList } from "@/client/ui/PriorityWordsList";
import { Text, View } from "react-native";

export default function BookmarksPage() {
  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Bookmarks</Text>
      </View>

      {/* Bookmarks list */}
      <PriorityWordsList />
    </View>
  );
}
