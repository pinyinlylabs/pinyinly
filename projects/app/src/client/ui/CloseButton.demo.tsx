import { CloseButton } from "@/client/ui/CloseButton";
import { ExampleStack } from "@/client/ui/demo/components";
import { View } from "react-native";

export default () => (
  <View className="flex-1">
    <ExampleStack title="default" childrenClassName="items-start">
      <CloseButton onPress={() => {}} />
    </ExampleStack>

    <ExampleStack title="with className" childrenClassName="items-start">
      <CloseButton onPress={() => {}} className="bg-fg-loud/10" />
    </ExampleStack>
  </View>
);
