import { cssInterop } from "nativewind";
import { Pressable } from "react-native";
import Reanimated from "react-native-reanimated";

export const AnimatedPressable = Reanimated.createAnimatedComponent(Pressable);
cssInterop(AnimatedPressable, { className: `style` });
