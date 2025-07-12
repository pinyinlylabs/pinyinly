import { WikiHanziWordModal } from "@/client/ui/WikiHanziWordModal";
import { View } from "react-native";

export default () => {
  return (
    <>
      <View>
        <WikiHanziWordModal
          devUiSnapshotMode
          hanziWord={`你好:hello`}
          onDismiss={() => null}
        />
      </View>
    </>
  );
};
