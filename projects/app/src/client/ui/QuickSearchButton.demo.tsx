import { ExampleStack } from "@/client/ui/demo/components";
import { QuickSearchButton } from "@/client/ui/QuickSearchButton";
import { View } from "@/client/ui/View";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default">
        <QuickSearchButton />
      </ExampleStack>
    </View>
  );
};
