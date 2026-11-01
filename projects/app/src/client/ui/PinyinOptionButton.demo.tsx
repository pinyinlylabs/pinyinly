import { ExampleStack } from "@/client/ui/demo/components";
import { PinyinOptionButton } from "@/client/ui/PinyinOptionButton";
import { View } from "@/client/ui/View";
import { useState } from "react";

export default () => {
  const [activePinyin, setActivePinyin] = useState<string>();

  return (
    <View className="w-full flex-row gap-2">
      <ExampleStack
        title="interactive"
        childrenClassName="flex-row flex-wrap gap-1"
      >
        <PinyinOptionButton
          pinyin="nī"
          shortcutKey="1"
          active={activePinyin === `nī`}
          onPress={setActivePinyin}
        />
        <PinyinOptionButton
          pinyin="ní"
          shortcutKey="2"
          active={activePinyin === `ní`}
          onPress={setActivePinyin}
        />
        <PinyinOptionButton
          pinyin="nǐ"
          shortcutKey="3"
          active={activePinyin === `nǐ`}
          onPress={setActivePinyin}
        />
        <PinyinOptionButton
          pinyin="nì"
          shortcutKey="4"
          active={activePinyin === `nì`}
          onPress={setActivePinyin}
        />
        <PinyinOptionButton
          pinyin="ni"
          shortcutKey="5"
          active={activePinyin === `ni`}
          onPress={setActivePinyin}
        />
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
