import { ExampleStack } from "@/client/ui/demo/components";
import { QuizQueueButton } from "@/client/ui/QuizQueueButton";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="QuizQueueButton">
        <QuizQueueButton />
      </ExampleStack>
    </View>
  );
};
