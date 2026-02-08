import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/helpers";
import { HanziHintOption } from "@/client/ui/HanziHintOption";
import { RectButton } from "@/client/ui/RectButton";
import { useState } from "react";
import { Text, View } from "react-native";

const presetHint = `A **child** reaching up for knowledge`;
const userHint = `My **classroom** memory hook`;
const presetImageIds = [`wiki:学:child`, `wiki:看:meaning`, `wiki:坏:meaning`];
const userImageIds = [`wiki:学:child`, `wiki:原:meaning`, `wiki:福:meaning`];

export default () => {
  const [selectedHint, setSelectedHint] = useState<string>(presetHint);
  const [lastAction, setLastAction] = useState<string>(`None`);

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-4">
        <ExampleStack title="preset" childrenClassName="w-[320px]">
          <HanziHintOption
            hint={presetHint}
            explanation="Preset hints can show thumbnails"
            imageIds={presetImageIds}
            isSelected={selectedHint === presetHint}
            onPress={() => {
              setSelectedHint(presetHint);
            }}
          />
        </ExampleStack>

        <ExampleStack title="user" childrenClassName="w-[320px]">
          <HanziHintOption
            hint={userHint}
            explanation="User hints can edit or delete"
            imageIds={userImageIds}
            isSelected={selectedHint === userHint}
            isUser
            onPress={() => {
              setSelectedHint(userHint);
            }}
            onEdit={() => {
              setLastAction(`Edit clicked`);
            }}
            onDelete={() => {
              setLastAction(`Delete clicked`);
            }}
          />
        </ExampleStack>
      </View>

      <LittlePrimaryHeader title="state" />

      <View className="flex-row flex-wrap items-center gap-2">
        <RectButton
          variant="outline"
          onPress={() => {
            setSelectedHint(presetHint);
          }}
        >
          Select preset
        </RectButton>
        <RectButton
          variant="outline"
          onPress={() => {
            setSelectedHint(userHint);
          }}
        >
          Select user
        </RectButton>
      </View>

      <Text className="text-[13px] text-fg-dim">
        Selected: {selectedHint === presetHint ? `preset` : `user`} | Last
        action: {lastAction}
      </Text>
    </View>
  );
};
