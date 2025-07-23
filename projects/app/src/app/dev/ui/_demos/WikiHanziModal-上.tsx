import { WikiHanziModal } from "@/client/ui/WikiHanziModal";
import type { HanziText } from "@/data/model";
import { View } from "react-native";

export default () => {
  return (
    <View>
      <WikiHanziModal
        devUiSnapshotMode
        hanzi={`上` as HanziText}
        onDismiss={() => null}
      />
    </View>
  );
};
