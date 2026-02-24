import { ExampleStack, LittlePrimaryHeader } from "@/client/ui/demo/components";
import { HanziHintOption } from "@/client/ui/HanziHintOption";
import { RectButton } from "@/client/ui/RectButton";
import type { AssetId } from "@/data/model";
import { useState } from "react";
import { Text, View } from "react-native";

const presetHint = `A **child** reaching up for knowledge`;
const userHint = `My **classroom** memory hook`;
const presetImageIds = [
  `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
  `sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU`,
  `sha256/llztsum5npSYNprvTIkrJDt2D5nSTTMfkPI68gWxw1A`,
] as AssetId[];
const userImageIds = [
  `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
  `sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug`,
  `sha256/mr1f6r5rfHjtXhXJd7o8plSn3E7hnq9yvip22GMPy2w`,
] as AssetId[];

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
