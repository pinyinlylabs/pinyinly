import { ExampleStack } from "@/app/dev/ui/_helpers";
import { PinyinOptionButton } from "@/client/ui/PinyinOptionButton";
import { View } from "react-native";

export default () => {
  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack
        title="default"
        childrenClassName="flex-row flex-wrap gap-1"
      >
        <PinyinOptionButton pinyin="nī" shortcutKey="1" />
        <PinyinOptionButton pinyin="ní" shortcutKey="2" />
        <PinyinOptionButton pinyin="nǐ" shortcutKey="3" />
        <PinyinOptionButton pinyin="nì" shortcutKey="4" />
        <PinyinOptionButton pinyin="ni" shortcutKey="5" />
      </ExampleStack>

      <ExampleStack
        title="disabled"
        childrenClassName="flex-row flex-wrap gap-1"
      >
        <PinyinOptionButton pinyin="nī" shortcutKey="1" disabled />
        <PinyinOptionButton pinyin="ní" shortcutKey="2" disabled />
        <PinyinOptionButton pinyin="nǐ" shortcutKey="3" disabled />
        <PinyinOptionButton pinyin="nì" shortcutKey="4" disabled />
        <PinyinOptionButton pinyin="ni" shortcutKey="5" disabled />
      </ExampleStack>
    </View>
  );
};
