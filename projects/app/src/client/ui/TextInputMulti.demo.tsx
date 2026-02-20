import { ExampleStack } from "@/client/ui/demo/components";
import { useState } from "react";
import { Text, View } from "react-native";
import { TextInputMulti } from "./TextInputMulti";

export default () => {
  const [text, setText] = useState(``);
  const [text2, setText2] = useState(
    `This is some pre-filled text to show how the component handles initial content that spans multiple lines.`,
  );

  return (
    <View className="flex-1">
      <ExampleStack title="default (empty, 3 lines)">
        <TextInputMulti
          placeholder="Type something here... It should expand as you add more text on web"
          value={text}
          onChangeText={setText}
          numberOfLines={3}
          style={{ minHeight: 80 }}
        />
        <Text className="text-[12px] text-fg-dim">
          Characters: {text.length}
        </Text>
      </ExampleStack>

      <ExampleStack title="pre-filled (6 lines)">
        <TextInputMulti
          placeholder="Additional text can be added here"
          value={text2}
          onChangeText={setText2}
          numberOfLines={6}
          style={{ minHeight: 160 }}
        />
        <Text className="text-[12px] text-fg-dim">
          Characters: {text2.length}
        </Text>
      </ExampleStack>

      <ExampleStack title="disabled">
        <TextInputMulti
          placeholder="This input is disabled"
          value={text}
          onChangeText={setText}
          editable={false}
          numberOfLines={3}
          style={{ minHeight: 80 }}
        />
      </ExampleStack>
    </View>
  );
};
