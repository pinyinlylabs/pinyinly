import { ReactNode, useMemo } from "react";
import { Pressable, PressableProps, Modal as RnModal } from "react-native";
import Animated, { Easing, SlideInDown } from "react-native-reanimated";
import { useEventCallback } from "./util";

export const Modal = ({
  children,
  onRequestClose,
  visible,
}: {
  visible: boolean;
  children: ReactNode;
  onRequestClose: () => void;
}) => {
  const onBackgroundPress = useEventCallback<
    NonNullable<PressableProps[`onPress`]>
  >((e) => {
    if (e.target === e.currentTarget) {
      onRequestClose();
    }
  });

  const onRequestCloseStable = useEventCallback(() => {
    onRequestClose();
  });

  const slideAnimation = useMemo(
    () => SlideInDown.easing(Easing.out(Easing.exp)),
    [],
  );

  return (
    <RnModal
      animationType="fade"
      visible={visible}
      transparent={true}
      onRequestClose={onRequestCloseStable}
    >
      <Pressable
        className="h-full w-full cursor-auto items-center justify-center bg-[rgba(0,0,0,0.5)] px-safe py-safe"
        onPress={onBackgroundPress}
      >
        <Animated.View entering={slideAnimation}>{children}</Animated.View>
      </Pressable>
    </RnModal>
  );
};
