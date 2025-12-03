import { DemoHanziKnob, useDemoHanziKnob } from "@/client/ui/demo/helpers";
import { WikiHanziModal } from "@/client/ui/WikiHanziModal";
import type { HanziText } from "@/data/model";
import { View } from "react-native";

export default () => {
  const { hanzi } = useDemoHanziKnob(`上` as HanziText);

  return (
    <View className="gap-4">
      <DemoHanziKnob />
      <WikiHanziModal devUiSnapshotMode hanzi={hanzi} onDismiss={() => null} />
    </View>
  );
};
