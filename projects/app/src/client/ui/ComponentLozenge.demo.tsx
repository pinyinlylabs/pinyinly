import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { ComponentLozenge } from "./ComponentLozenge";

export default () => {
  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="font-sans text-sm text-muted-fg">Medium</Text>
        <View className="flex-row flex-wrap gap-2">
          <ComponentLozenge isStructural />
        </View>
      </View>
      <View className="gap-2">
        <Text className="font-sans text-sm text-muted-fg">Small</Text>
        <View className="flex-row flex-wrap gap-2">
          <ComponentLozenge isStructural={false} size="sm" />
        </View>
      </View>
    </View>
  );
};
