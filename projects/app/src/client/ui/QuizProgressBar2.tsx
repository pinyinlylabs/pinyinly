import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, LayoutRectangle, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEventCallback } from "../hooks";

export const QuizProgressBar2 = ({ progress }: { progress: number }) => {
  const milestoneInterval = 5;
  const minDotSpacing = 100;
  const barSize = 16;
  const dotSize = 3;
  const bigDotSize = 8;

  const [layout, setLayout] = useState<LayoutRectangle>();

  const progressSv = useSharedValue(0);
  // const [widthSv] = useState(() => new Animated.Value(0));

  const metrics = useMemo(() => {
    if (layout == null) {
      return null;
    }
    // Calculate the number of dots and spacing based on the layout width with
    // some padding removed at the start and end (equal to the diameter of the
    // end-caps).
    const usableDottedWidth = layout.width - barSize;
    const dotCount = Math.floor(usableDottedWidth / minDotSpacing);
    const dotSpacing = usableDottedWidth / (dotCount - 1);

    return { dotSpacing, dotCount, usableDottedWidth, width: layout.width };
  }, [layout]);

  const handleLayout = useEventCallback((x: LayoutChangeEvent) => {
    setLayout(x.nativeEvent.layout);
  });

  useEffect(() => {
    progressSv.set(progress);
  }, [progressSv, progress]);

  const animStyles = useAnimatedStyle(() => {
    return {
      width:
        metrics == null
          ? 0
          : withTiming(
              barSize / 2 +
                interpolate(
                  progressSv.get(),
                  [0, metrics.dotCount - 1],
                  [0, metrics.usableDottedWidth],
                ),
              { duration: 200 },
            ),
    };
  });

  return (
    <View
      className="h-[16px] flex-1 rounded-[8px] bg-primary-7"
      onLayout={handleLayout}
    >
      {metrics == null ? null : (
        <Animated.View
          style={[
            animStyles,
            {
              // width: widthAnim.interpolate({
              //   inputRange: [0, metrics.dotCount - 1],
              //   outputRange: [
              //     `0px`, // Always show a little bit of progress, so that there's a hint of the bar existing.
              //     `${metrics.usableDottedWidth}px`,
              //   ],
              // }),
              marginLeft: barSize / 2,
              marginRight: barSize / 2,
              height: 16,
              flex: 1,
              borderRadius: barSize / 2,
              overflow: `hidden`,
            },
          ]}
        >
          {/* Background */}
          <LinearGradient
            colors={[`#3F4CF5`, `#3F4CF5`]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              flex: 1,
              height: 16,
              display: layout === undefined ? `none` : `flex`, // Intended to jank, but not sure if necessary.
              width: layout?.width,
            }}
          />
          {/* Highlight accent */}
          <View className="absolute inset-x-[8px] top-[4px] h-[5px] rounded-[2px] bg-[white] opacity-20" />
        </Animated.View>
      )}
      {metrics == null
        ? null
        : Array.from({ length: metrics.dotCount }).map((_, i) => {
            const isMilestone = i % milestoneInterval === 0;
            const size = isMilestone ? bigDotSize : dotSize;
            const halfSize = size / 2;
            const left = barSize / 2 + i * metrics.dotSpacing - halfSize;
            const top = barSize / 2 - halfSize;

            return (
              <View
                key={i}
                className={`absolute rounded-full bg-[white]`}
                style={{
                  width: size,
                  height: size,
                  left,
                  top,
                }}
              />
            );
          })}
    </View>
  );
};
