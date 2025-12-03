import { DemoHanziLinks, useDemoHanzi } from "@/client/ui/demo/helpers";
import { WikiHanziModal } from "@/client/ui/WikiHanziModal";
import type { HanziText } from "@/data/model";
import { View } from "react-native";

export default () => {
  const hanzi = useDemoHanzi(`上` as HanziText);

  return (
    <View className="gap-4">
      <DemoHanziLinks />
      <WikiHanziModal devUiSnapshotMode hanzi={hanzi} onDismiss={() => null} />
    </View>
  );
};
