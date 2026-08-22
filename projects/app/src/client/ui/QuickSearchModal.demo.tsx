import { ExampleStack } from "@/client/ui/demo/components";
import { QuickSearchModal } from "@/client/ui/QuickSearchModal";
import { View } from "@/client/ui/View";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default">
        <QuickSearchModal onDismiss={() => {}} devUiSnapshotMode />
      </ExampleStack>
    </View>
  );
};
