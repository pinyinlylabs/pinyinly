import { styled } from "nativewind";
import { Pressable } from "react-native";
import Reanimated from "react-native-reanimated";

export const ReanimatedPressable =
  Reanimated.createAnimatedComponent(Pressable);
// @ts-expect-error nativewind v5 preview type defs are too complex for this adapter call.
styled(ReanimatedPressable, { className: `style` });
