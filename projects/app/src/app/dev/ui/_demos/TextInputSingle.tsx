import { ExampleStack } from "@/app/dev/ui/_helpers";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack title="default">
        <TextInputSingle placeholder="Placeholder text" />
        <TextInputSingle placeholder="Centered" textAlign="center" />
        <TextInputSingle placeholder="Right" textAlign="right" />
      </ExampleStack>

      <ExampleStack title="default (framed)" showFrame>
        <TextInputSingle placeholder="Placeholder text" />
        <TextInputSingle placeholder="Centered" textAlign="center" />
        <TextInputSingle placeholder="Right" textAlign="right" />
      </ExampleStack>

      <ExampleStack title="disabled" showFrame>
        <TextInputSingle placeholder="Placeholder" disabled />
        <TextInputSingle placeholder="Centered" disabled textAlign="center" />
        <TextInputSingle placeholder="Right" disabled textAlign="right" />
      </ExampleStack>
    </View>
  );
};
