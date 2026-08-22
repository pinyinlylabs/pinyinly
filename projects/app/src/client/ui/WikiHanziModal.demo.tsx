import { WikiHanziModal } from "@/client/ui/WikiHanziModal";
import type { HanziText } from "@/data/model";
import { View } from "@/client/ui/View";
import { DemoHanziKnob } from "./demo/components";
import { useDemoHanziKnob } from "./demo/utils";

export default () => {
  const { hanzi } = useDemoHanziKnob(`上` as HanziText);

  return (
    <View className="gap-4">
      <DemoHanziKnob />
      <WikiHanziModal devUiSnapshotMode hanzi={hanzi} onDismiss={() => null} />
    </View>
  );
};
