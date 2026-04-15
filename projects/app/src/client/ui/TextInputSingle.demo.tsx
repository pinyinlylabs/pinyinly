import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/components";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full gap-4">
      <LittlePrimaryHeader title="empty" />
      <View className="w-full flex-row gap-3">
        <ExampleStack title="bare" childrenClassName="w-full" showFrame>
          <View className="w-full gap-2">
            <TextInputSingle placeholder="Placeholder text" variant="bare" />
            <TextInputSingle
              placeholder="Centered"
              textAlign="center"
              variant="bare"
            />
            <TextInputSingle
              placeholder="Right"
              textAlign="right"
              variant="bare"
            />
          </View>
        </ExampleStack>

        <ExampleStack title="flat" childrenClassName="w-full">
          <View className="w-full gap-2">
            <TextInputSingle placeholder="Placeholder text" variant="flat" />
            <TextInputSingle
              placeholder="Centered"
              textAlign="center"
              variant="flat"
            />
            <TextInputSingle
              placeholder="Right"
              textAlign="right"
              variant="flat"
            />
          </View>
        </ExampleStack>
      </View>

      <LittlePrimaryHeader title="pre-filled" />
      <View className="w-full flex-row gap-3">
        <ExampleStack title="bare" childrenClassName="w-full" showFrame>
          <View className="w-full gap-2">
            <TextInputSingle
              value="Placeholder text"
              placeholder="Placeholder text"
              variant="bare"
            />
            <TextInputSingle
              value="Centered"
              placeholder="Centered"
              textAlign="center"
              variant="bare"
            />
            <TextInputSingle
              value="Right"
              placeholder="Right"
              textAlign="right"
              variant="bare"
            />
          </View>
        </ExampleStack>

        <ExampleStack title="flat" childrenClassName="w-full">
          <View className="w-full gap-2">
            <TextInputSingle
              value="Placeholder text"
              placeholder="Placeholder text"
              variant="flat"
            />
            <TextInputSingle
              value="Centered"
              placeholder="Centered"
              textAlign="center"
              variant="flat"
            />
            <TextInputSingle
              value="Right"
              placeholder="Right"
              textAlign="right"
              variant="flat"
            />
          </View>
        </ExampleStack>
      </View>

      <LittlePrimaryHeader title="disabled" />
      <View className="w-full flex-row gap-3">
        <ExampleStack title="bare" childrenClassName="w-full" showFrame>
          <View className="w-full gap-2">
            <TextInputSingle
              placeholder="Placeholder"
              disabled
              variant="bare"
            />
            <TextInputSingle
              placeholder="Centered"
              disabled
              textAlign="center"
              variant="bare"
            />
            <TextInputSingle
              placeholder="Right"
              disabled
              textAlign="right"
              variant="bare"
            />
          </View>
        </ExampleStack>

        <ExampleStack title="flat" childrenClassName="w-full">
          <View className="w-full gap-2">
            <TextInputSingle
              placeholder="Placeholder"
              disabled
              variant="flat"
            />
            <TextInputSingle
              placeholder="Centered"
              disabled
              textAlign="center"
              variant="flat"
            />
            <TextInputSingle
              placeholder="Right"
              disabled
              textAlign="right"
              variant="flat"
            />
          </View>
        </ExampleStack>
      </View>
    </View>
  );
};
