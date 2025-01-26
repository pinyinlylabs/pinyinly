import { Image } from "expo-image";
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function WebsitePage() {
  return (
    <View className="items-center">
      <Text className="mt-4 text-2xl text-text">haohaohow</Text>
      <Image
        source={require(`@/assets/adaptive-icon.png`)}
        style={[{ flexShrink: 1, width: 100, height: 100 }]}
      />
      <View className="h-[100px]"></View>
      <Link href={`/company`} className="text-text">
        Company
      </Link>
      <Link href={`/dashboard`} className="text-text">
        Dashboard
      </Link>
    </View>
  );
}
