import type { LinearGradientProps } from "expo-linear-gradient";
import { LinearGradient } from "expo-linear-gradient";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CloseButton } from "./CloseButton";

export const ReferencePageHeader = ({
  title,
  subtitle,
  gradientColors,
}: {
  title: string | null;
  subtitle: string | null;
  gradientColors: LinearGradientProps[`colors`];
}) => {
  const insets = useSafeAreaInsets();

  return (
    <>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ paddingTop: insets.top }}
      >
        <View className="h-[250px] items-center justify-center">
          <Text className="text-[60px] text-[white]">{title ?? `⁉️`}</Text>
        </View>
        <View className="absolute left-4 top-safe-or-4">
          <CloseButton />
        </View>
      </LinearGradient>

      <View className="h-[52px] items-center justify-center bg-bg-1">
        <Text className="text-[23px] text-fg">{subtitle ?? ``}</Text>
      </View>
    </>
  );
};
