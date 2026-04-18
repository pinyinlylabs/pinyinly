import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/components";
import { useState } from "react";
import { Text, View } from "react-native";
import { TextInputMulti } from "./TextInputMulti";

export default () => {
  const [emptyBare, setEmptyBare] = useState(``);
  const [emptyFlat, setEmptyFlat] = useState(``);
  const [prefilledBare, setPrefilledBare] = useState(
    `This is some pre-filled text to show how the component handles initial content that spans multiple lines.`,
  );
  const [prefilledFlat, setPrefilledFlat] = useState(
    `This is some pre-filled text to show how the component handles initial content that spans multiple lines.`,
  );

  return (
    <View className="flex-1 gap-4">
      <LittlePrimaryHeader title="empty" />
      <View className="w-full flex-row gap-3">
        <ExampleStack title="bare" childrenClassName="w-full" showFrame>
          <View className="flex-1 gap-2">
            <TextInputMulti
              placeholder="Type something here..."
              value={emptyBare}
              onChangeText={setEmptyBare}
              variant="bare"
              numberOfLines={3}
              style={{ minHeight: 80 }}
            />
            <Text className="font-sans text-[12px] text-fg-dim">
              Characters: {emptyBare.length}
            </Text>
          </View>
        </ExampleStack>

        <ExampleStack title="flat" childrenClassName="w-full">
          <View className="flex-1 gap-2">
            <TextInputMulti
              placeholder="Type something here..."
              value={emptyFlat}
              onChangeText={setEmptyFlat}
              variant="flat"
              numberOfLines={3}
              style={{ minHeight: 80 }}
            />
            <Text className="font-sans text-[12px] text-fg-dim">
              Characters: {emptyFlat.length}
            </Text>
          </View>
        </ExampleStack>
      </View>

      <LittlePrimaryHeader title="pre-filled" />
      <View className="w-full flex-row gap-3">
        <ExampleStack title="bare" childrenClassName="w-full" showFrame>
          <View className="flex-1 gap-2">
            <TextInputMulti
              placeholder="Additional text can be added here"
              value={prefilledBare}
              onChangeText={setPrefilledBare}
              variant="bare"
              numberOfLines={6}
              style={{ minHeight: 160 }}
            />
            <Text className="font-sans text-[12px] text-fg-dim">
              Characters: {prefilledBare.length}
            </Text>
          </View>
        </ExampleStack>

        <ExampleStack title="flat" childrenClassName="w-full">
          <View className="flex-1 gap-2">
            <TextInputMulti
              placeholder="Additional text can be added here"
              value={prefilledFlat}
              onChangeText={setPrefilledFlat}
              variant="flat"
              numberOfLines={6}
              style={{ minHeight: 160 }}
            />
            <Text className="font-sans text-[12px] text-fg-dim">
              Characters: {prefilledFlat.length}
            </Text>
          </View>
        </ExampleStack>
      </View>

      <LittlePrimaryHeader title="disabled" />
      <View className="w-full flex-row gap-3">
        <ExampleStack title="bare" childrenClassName="w-full" showFrame>
          <View className="flex-1 gap-2">
            <TextInputMulti
              placeholder="This input is disabled"
              value="Disabled example"
              onChangeText={() => {}}
              editable={false}
              variant="bare"
              numberOfLines={3}
              style={{ minHeight: 80 }}
            />
          </View>
        </ExampleStack>

        <ExampleStack title="flat" childrenClassName="w-full">
          <View className="flex-1 gap-2">
            <TextInputMulti
              placeholder="This input is disabled"
              value="Disabled example"
              onChangeText={() => {}}
              editable={false}
              variant="flat"
              numberOfLines={3}
              style={{ minHeight: 80 }}
            />
          </View>
        </ExampleStack>
      </View>
    </View>
  );
};
