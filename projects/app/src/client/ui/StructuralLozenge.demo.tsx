import { Text, View } from "react-native";
import { StructuralLozenge } from "./StructuralLozenge";

export default () => {
  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="font-sans text-sm text-muted-fg">Medium</Text>
        <View className="flex-row flex-wrap gap-2">
          <StructuralLozenge />
        </View>
      </View>
      <View className="gap-2">
        <Text className="font-sans text-sm text-muted-fg">Small</Text>
        <View className="flex-row flex-wrap gap-2">
          <StructuralLozenge size="sm" />
        </View>
      </View>
    </View>
  );
};
