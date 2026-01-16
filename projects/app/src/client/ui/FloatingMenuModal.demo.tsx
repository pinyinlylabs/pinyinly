import { Text, View } from "react-native";
import { FloatingMenuModal } from "./FloatingMenuModal";
import { RectButton } from "./RectButton";

export default () => {
  return (
    <View className="gap-10">
      <FloatingMenuModal
        floating={
          <View className="rounded-xl bg-bg-high px-4 py-3">
            <RectButton variant="bare">Reference</RectButton>
          </View>
        }
      >
        <Text className="text-fg">Menu trigger</Text>
      </FloatingMenuModal>
    </View>
  );
};
