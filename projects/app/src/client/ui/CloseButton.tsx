import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";

export const CloseButton = () => {
  const router = useRouter();

  return router.canDismiss() ? (
    <Pressable
      onPressIn={() => {
        router.dismiss();
      }}
    >
      <Image
        source={require(`@/assets/icons/close.svg`)}
        className="-my-0 size-[24px] shrink text-body-bg70"
        tintColor="currentColor"
      />
    </Pressable>
  ) : null;
};
