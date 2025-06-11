import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { IconImage } from "./IconImage";

export const CloseButton = () => {
  const router = useRouter();

  return router.canDismiss() ? (
    <Pressable
      onPressIn={() => {
        router.dismiss();
      }}
    >
      <IconImage
        source={require(`@/assets/icons/close.svg`)}
        className="text-foreground-bg70"
      />
    </Pressable>
  ) : null;
};
