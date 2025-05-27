import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import type { PressableProps } from "react-native";
import { Modal, Platform, View } from "react-native";
import Reanimated, {
  Easing,
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useEventCallback } from "../hooks/useEventCallback";
import { AnimatedPressable } from "./AnimatedPressable";

interface PageSheetModalProps {
  backdropColor?: string;
  children: (options: { dismiss: () => void }) => ReactNode;
  disableBackgroundDismiss?: boolean;
  /**
   * If `true`, the modal will be presented with a slower animation so it is not
   * as jarring.
   */
  passivePresentation?: boolean;
  onDismiss: () => void;
}

export const PageSheetModal = ({
  children,
  backdropColor = `primary-3`,
  disableBackgroundDismiss = false,
  onDismiss,
  passivePresentation = false,
}: PageSheetModalProps) => {
  return (
    <PageSheetModalImpl
      onDismiss={onDismiss}
      backdropColor={backdropColor}
      passivePresentation={passivePresentation}
      disableBackgroundDismiss={disableBackgroundDismiss}
    >
      {children}
    </PageSheetModalImpl>
  );
};

type ImplProps = Required<PageSheetModalProps>;

const WebImpl = ({
  children,
  backdropColor,
  disableBackgroundDismiss,
  passivePresentation,
  onDismiss,
}: ImplProps) => {
  // snapshot the value so that changes to it don't cause show/dismiss
  // animations to repeat.
  const [passivePresentationSnapshot] = useState(passivePresentation);
  const backgroundAnimation = useSharedValue(0);
  const contentAnimation = useSharedValue(0);
  const [dismissing, setDismissing] = useState(false);

  const api = useMemo(
    () => ({
      dismiss: () => {
        setDismissing(true);
      },
    }),
    [],
  );

  const onBackgroundPress = useEventCallback<
    NonNullable<PressableProps[`onPress`]>
  >((e) => {
    // Don't trigger on any bubbling events.
    if (!disableBackgroundDismiss && e.target === e.currentTarget) {
      api.dismiss();
    }
  });

  useEffect(() => {
    if (dismissing) {
      backgroundAnimation.set(
        withTiming(
          0,
          {
            duration: 500,
            easing: Easing.inOut(Easing.quad),
          },
          () => {
            onDismiss();
          },
        ),
      );

      contentAnimation.set(
        withTiming(0, {
          duration: 150,
          easing: Easing.inOut(Easing.quad),
        }),
      );
    } else {
      backgroundAnimation.set(
        withTiming(1, {
          duration: passivePresentationSnapshot ? 500 : 250,
          easing: Easing.inOut(Easing.quad),
        }),
      );

      contentAnimation.set(
        withDelay(
          passivePresentationSnapshot ? 500 : 0,
          withSpring(1, {
            duration: passivePresentationSnapshot ? 500 : 250,
          }),
        ),
      );
    }
  }, [
    backgroundAnimation,
    contentAnimation,
    dismissing,
    onDismiss,
    passivePresentationSnapshot,
  ]);

  const animatedBackgroundStyle = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        backgroundAnimation.get(),
        [0, 1],
        [`rgba(0,0,0,0)`, `rgba(0,0,0,0.5)`],
      ),
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY: interpolate(
            contentAnimation.get(),
            [0, 1],
            [20, 0],
            // Extrapolation.CLAMP,
          ),
        },
      ],
      opacity: interpolate(
        contentAnimation.get(),
        [0, 1],
        [0, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  const backdropColorClass = `bg-${backdropColor}`;

  return (
    <Modal
      presentationStyle="fullScreen"
      transparent={
        // only works on web, on Native `true` throws an error
        // TODO [react-native@>=0.78] migrate to using `backdropColor` instead.
        true
      }
      onRequestClose={api.dismiss}
    >
      <AnimatedPressable
        className={`absolute size-full cursor-auto items-center justify-center p-4`}
        style={[animatedBackgroundStyle]}
        onPress={onBackgroundPress}
      >
        <Reanimated.View
          className={`max-h-full w-full max-w-[500px] rounded-xl lg:max-h-[80vh] lg:w-[500px] ${backdropColorClass}`}
          style={[animatedContentStyle]}
        >
          {children(api)}
        </Reanimated.View>
      </AnimatedPressable>
    </Modal>
  );
};

const IosImpl = ({ onDismiss, backdropColor, children }: ImplProps) => {
  const api = useMemo(
    () => ({
      dismiss: onDismiss,
    }),
    [onDismiss],
  );

  const backdropColorClass = `bg-${backdropColor}`;

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={api.dismiss}
    >
      <View
        className={
          // On iOS there is 72px of the page sheet content that is off the
          // bottom of the screen. Normally this meant that if there's a
          // `flex-1` view the bottom 72px of its content is cropped off.
          //
          // For debugging the background is set to purple, but this should
          // never be seen. If you see a purple line on iOS then this is the
          // cause and needs to be set more carefully.
          `flex-1 pb-[72px] ${__DEV__ ? `bg-[purple]` : ``}`
        }
      >
        <View className={`flex-1 ${backdropColorClass}`}>{children(api)}</View>
      </View>
    </Modal>
  );
};

const DefaultImpl = ({ backdropColor, children, onDismiss }: ImplProps) => {
  const api = useMemo(
    () => ({
      dismiss: onDismiss,
    }),
    [onDismiss],
  );

  const backdropColorClass = `bg-${backdropColor}`;

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={api.dismiss}
    >
      <View className={`flex-1 ${backdropColorClass}`}>{children(api)}</View>
    </Modal>
  );
};

const PageSheetModalImpl = Platform.select({
  web: WebImpl,
  ios: IosImpl,
  default: DefaultImpl,
});
