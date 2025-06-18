import { ScrollView, Text, View } from "react-native";

export default function OverviewPage() {
  return (
    <ScrollView contentContainerClassName="py-safe-offset-4 px-safe-or-4 items-center">
      <View className="max-w-[600px] gap-4">
        <Text className="hhh-body-title">Overview Page</Text>
      </View>
    </ScrollView>
  );
}
