import { cssInterop } from "nativewind";
import { Pressable } from "react-native";
import Reanimated from "react-native-reanimated";

export const ReanimatedPressable =
  Reanimated.createAnimatedComponent(Pressable);
cssInterop(ReanimatedPressable, { className: `style` });
