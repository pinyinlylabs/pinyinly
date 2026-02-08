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
      <IconImage icon="close" className="text-fg-bg70" />
    </Pressable>
  ) : null;
};
