import { useEffect, useState } from "react";
import type { ViewProps } from "react-native";
import { View } from "react-native";
import Reanimated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface ShimmerRectProps {
  className?: string;
  style?: ViewProps[`style`];
}

const shimmerWidthMinPx = 96;
const shimmerWidthRatio = 1;
const shimmerWidthMaxPx = 1000;
const shimmerDurationMs = 1400;

export function ShimmerRect({ className, style }: ShimmerRectProps) {
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useSharedValue(0);
  const shimmerWidthPx = Math.max(
    shimmerWidthMinPx,
    Math.min(containerWidth * shimmerWidthRatio, shimmerWidthMaxPx),
  );

  useEffect(() => {
    if (containerWidth <= 0) {
      return;
    }

    const startX = -shimmerWidthPx;
    const endX = containerWidth;

    translateX.value = startX;
    translateX.value = withRepeat(
      withTiming(endX, {
        duration: shimmerDurationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );

    return () => {
      translateX.value = 0;
    };
  }, [containerWidth, shimmerWidthPx, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      className={`
        overflow-hidden bg-fg/5

        ${className ?? ``}
      `}
      style={style}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout;
        if (width > 0) {
          setContainerWidth(width);
        }
      }}
    >
      <Reanimated.View
        className={`
          bg-[linear-gradient(to_right,_transparent_0%,_rgb(from_var(--color-fg-loud)_r_g_b_/_8%)_42%,_rgb(from_var(--color-fg-loud)_r_g_b_/_8%)_58%,_transparent_100%)]
        `}
        style={[
          {
            position: `absolute`,
            top: 0,
            bottom: 0,
            width: shimmerWidthPx,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
