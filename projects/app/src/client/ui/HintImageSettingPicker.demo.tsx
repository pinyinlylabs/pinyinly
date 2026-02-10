import { HintImageSettingPicker } from "@/client/ui/HintImageSettingPicker";
import { hanziWordMeaningHintImageSetting } from "@/client/hooks/useUserSetting";
import { DemoHanziWordKnob, useDemoHanziWordKnob } from "./demo/helpers";
import { Text, View } from "react-native";

export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`学:learn`);

  if (hanziWord == null) {
    return null;
  }

  const hintSettingKey = { hanziWord };

  return (
    <View className="gap-4">
      <DemoHanziWordKnob hanziWords={[`学:learn`, `好:good`, `看:look`]} />

      <View className="w-[420px] gap-2 rounded-lg border border-fg/20 bg-fg-bg5 p-3">
        <Text className="pyly-body-subheading">Hint image picker</Text>
        <HintImageSettingPicker
          setting={hanziWordMeaningHintImageSetting}
          settingKey={hintSettingKey}
          title="Hint image picker"
          previewHeight={200}
          tileSize={64}
          enablePasteDropZone
          onUploadError={(error) => {
            console.error(`Upload error:`, error);
          }}
        />
      </View>
    </View>
  );
};
