import {
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintTextSetting,
} from "@/client/ui/hooks/useUserSetting";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { View } from "react-native";
import { DemoHanziWordKnob } from "./demo/components";
import { useDemoHanziWordKnob } from "./demo/utils";
import { Pylymark } from "./Pylymark";

export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`学:learn`);

  if (hanziWord == null) {
    return null;
  }

  const hintSettingKey = { hanziWord };

  return (
    <View className="gap-4">
      <DemoHanziWordKnob hanziWords={[`学:learn`, `好:good`, `看:look`]} />

      <View className="w-[400px] gap-2 rounded-lg border border-fg/20 bg-fg-bg5 p-3">
        <InlineEditableSettingText
          setting={hanziWordMeaningHintTextSetting}
          settingKey={hintSettingKey}
          placeholder="Add a hint"
          emptyText="Add a hint"
          renderDisplay={(value) => <Pylymark source={value} />}
          variant="hint"
        />

        <InlineEditableSettingText
          setting={hanziWordMeaningHintExplanationSetting}
          settingKey={hintSettingKey}
          placeholder="Add an explanation"
          emptyText="Add an explanation"
          multiline
          renderDisplay={(value) => <Pylymark source={value} />}
          variant="hintExplanation"
        />
      </View>
    </View>
  );
};
