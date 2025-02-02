import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

export const CloseButton = ({ tintColor }: { tintColor: string }) => {
  const router = useRouter();

  return router.canDismiss() ? (
    <Pressable
      onPressIn={() => {
        router.dismiss();
      }}
    >
      <Image
        source={require(`@/assets/icons/close.svg`)}
        style={[{ flexShrink: 1, width: 24, height: 24 }]}
        tintColor={tintColor}
      />
    </Pressable>
  ) : null;
};
