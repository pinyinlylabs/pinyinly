import { CircleButton } from "@/client/ui/CircleButton";
import { Link } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";

export default function LearnPage() {
  return (
    <View className="flex-1 items-center justify-center gap-[8px]">
      <Link href="/dashboard" asChild>
        <CircleButton color="purple" />
      </Link>
      <StatusBar style="auto" />
    </View>
  );
}
