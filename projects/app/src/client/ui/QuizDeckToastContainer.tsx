import type { ReactNode } from "react";
import { Suspense } from "react";
import { Platform, View } from "react-native";
import Reanimated, { Easing, Keyframe } from "react-native-reanimated";

export const QuizDeckToastContainer = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <Suspense fallback={null}>
      <View className="absolute inset-x-0 bottom-0">
        <Reanimated.View entering={entering.duration(150)}>
          {children}
        </Reanimated.View>
      </View>
    </Suspense>
  );
};

const easing = Easing.exp;
const entering = Platform.select({
  // On web the `bottom: <percent>%` approach doesn't work when the
  // parent is `position: absolute`. But using `translateY: <percent>%`
  // DOES work (but this doesn't work on mobile native because only
  // pixel values are accepted).
  web: new Keyframe({
    0: {
      transform: [{ translateY: `100%` }],
    },
    100: {
      transform: [{ translateY: `0%` }],
      easing,
    },
  }),
  default: new Keyframe({
    0: {
      position: `relative`,
      bottom: `-100%`,
    },
    100: {
      position: `relative`,
      bottom: 0,
      easing,
    },
  }),
});
