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
import { ReanimatedPressable } from "./ReanimatedPressable";

export type PageSheetChild = (options: { dismiss: () => void }) => ReactNode;

interface PageSheetModalProps {
  children: PageSheetChild;
  disableBackgroundDismiss?: boolean;
  /**
   * If `true`, the modal will be presented with a slower animation so it is not
   * as jarring.
   */
  passivePresentation?: boolean;
  onDismiss: () => void;
  /**
   * For development purposes only, this will disable the animations and
   * allow the modal to be rendered immediately.
   * This is useful for snapshot testing.
   */
  devUiSnapshotMode?: boolean;
}

export const PageSheetModal = ({
  children,
  disableBackgroundDismiss = false,
  onDismiss,
  passivePresentation = false,
  devUiSnapshotMode = false,
}: PageSheetModalProps) => {
  return (
    <PageSheetModalImpl
      onDismiss={onDismiss}
      passivePresentation={passivePresentation}
      disableBackgroundDismiss={disableBackgroundDismiss}
      devUiSnapshotMode={devUiSnapshotMode}
    >
      {children}
    </PageSheetModalImpl>
  );
};

type ImplProps = Required<PageSheetModalProps>;

const WebImpl = ({
  children,
  disableBackgroundDismiss,
  passivePresentation,
  onDismiss,
  devUiSnapshotMode,
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

  const content = (
    <Reanimated.View
      className={`
        size-full overflow-hidden bg-bg

        sm:max-h-[80vh] sm:w-[500px] sm:rounded-xl
      `}
      style={[animatedContentStyle]}
    >
      {children(api)}
    </Reanimated.View>
  );

  return devUiSnapshotMode ? (
    <View
      className={`size-full cursor-auto items-center justify-center bg-[black]/50 p-4`}
    >
      {content}
    </View>
  ) : (
    <Modal
      presentationStyle="fullScreen"
      transparent={true}
      onRequestClose={api.dismiss}
    >
      <ReanimatedPressable
        className={`
          absolute size-full cursor-auto items-center justify-center

          sm:p-4
        `}
        style={[animatedBackgroundStyle]}
        onPress={onBackgroundPress}
      >
        {content}
      </ReanimatedPressable>
    </Modal>
  );
};

const IosImpl = ({ onDismiss, children }: ImplProps) => {
  const api = useMemo(
    () => ({
      dismiss: onDismiss,
    }),
    [onDismiss],
  );

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
          `
            flex-1 pb-[72px]

            ${__DEV__ ? `bg-[purple]` : ``}
          `
        }
      >
        <View className={`flex-1 bg-bg`}>{children(api)}</View>
      </View>
    </Modal>
  );
};

const DefaultImpl = ({ children, onDismiss }: ImplProps) => {
  const api = useMemo(
    () => ({
      dismiss: onDismiss,
    }),
    [onDismiss],
  );

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={api.dismiss}
    >
      <View className={`flex-1 bg-bg`}>{children(api)}</View>
    </Modal>
  );
};

const PageSheetModalImpl = Platform.select({
  web: WebImpl,
  ios: IosImpl,
  default: DefaultImpl,
});
