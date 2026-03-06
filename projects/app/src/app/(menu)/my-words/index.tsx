import { PriorityWordsList } from "@/client/ui/PriorityWordsList";
import { Text, View } from "react-native";

export default function MyWordsPage() {
  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">My Words</Text>
      </View>

      {/* Priority words list */}
      <PriorityWordsList />
    </View>
  );
}
