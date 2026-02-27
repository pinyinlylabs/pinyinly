import { ExampleStack } from "@/client/ui/demo/components";
import { QuickSearchButton } from "@/client/ui/QuickSearchButton";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default">
        <QuickSearchButton />
      </ExampleStack>
    </View>
  );
};
