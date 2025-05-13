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
        className="text-body-bg70 my-[-0px] h-[24px] w-[24px] flex-shrink"
        tintColor="currentColor"
      />
    </Pressable>
  ) : null;
};
