import { makeRange } from "@/util/collections";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useMemo, useState } from "react";
import { LayoutChangeEvent, LayoutRectangle, View } from "react-native";
import Reanimated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { useEventCallback } from "../hooks";
import { createAffineTransform, Transform1D } from "./animate";

const majorTickBgSize = 20;
const barSize = 16;
const halfBarSize = barSize / 2;
const minTickSpacing = 40;
const fillColor = `#3F4CF5`;
const leftPadding = majorTickBgSize / 2;
const rightPadding = halfBarSize;

export const QuizProgressBar2 = ({ progress }: { progress: number }) => {
  const milestoneInterval = 5;

  const [layout, setLayout] = useState<LayoutRectangle>();
  const [nStart, setNStart] = useState(0);
  const fill = progress === 0 ? null : progress - 1;
  const leftOffsetSv = useSharedValue(0);
  const fillSv = useSharedValue(fill);

  const metrics = useMemo(() => {
    if (layout == null) {
      return null;
    }
    // Calculate the number of ticks and spacing based on the layout width with
    // some padding removed at the start and end (equal to the diameter of the
    // end-caps).
    const usableTickAreaWidth = layout.width - leftPadding - rightPadding;
    const tickCount = Math.ceil(usableTickAreaWidth / minTickSpacing);
    const tickSegments = tickCount - 1;

    // Tick segments:
    //       2222
    //  1111
    //
    // |----|----|
    //
    // Ticks:
    // 1
    //      2
    //           3
    //
    // tickCount = 3
    // tickSegments = 2
    if (tickSegments === 0) {
      return null;
    }

    const nToDisplay = createAffineTransform(
      0,
      majorTickBgSize / 2,
      tickSegments,
      layout.width - /* right */ halfBarSize,
    );

    const axis: Axis = {
      width: layout.width,
      nToDisplay,
      leftOffsetSv,
    };

    return {
      tickCount,
      axis,
      width: layout.width,
      nToDisplay,
      tickSpacing: usableTickAreaWidth / tickSegments,
      maxFilledTicks: Math.trunc((tickCount * 2) / 3) + 1,
    };
  }, [layout, leftOffsetSv]);

  const handleLayout = useEventCallback((x: LayoutChangeEvent) => {
    setLayout(x.nativeEvent.layout);
  });

  useEffect(() => {
    if (metrics != null && progress - nStart > metrics.maxFilledTicks) {
      const newNStart = Math.max(
        // Snap to milestone intervals
        Math.trunc((progress - 1) / milestoneInterval) * milestoneInterval,
        0,
      );
      setNStart(newNStart);
    }
  }, [metrics, progress, nStart]);

  useEffect(() => {
    if (metrics != null) {
      const newLeftOffset = -nStart * metrics.tickSpacing;
      leftOffsetSv.set(
        withDelay(
          500,
          withTiming(newLeftOffset, {
            duration: 500,
            easing: Easing.inOut(Easing.quad),
          }),
        ),
      );
    }
  }, [metrics, nStart, leftOffsetSv]);

  useEffect(() => {
    fillSv.set((prev) =>
      fill === null
        ? null
        : withTiming(fill, {
            duration: prev == null ? 0 : 200,
          }),
    );
  }, [fill, fillSv]);

  const fillAnimStyles = useAnimatedStyle(() => {
    const fill = fillSv.get();
    return {
      width:
        metrics == null || fill === null || fill === 0
          ? 0
          : metrics.nToDisplay(fill) + leftOffsetSv.get() + rightPadding,
    };
  });

  const ticks = useMemo(
    () => ticksToRender(nStart, metrics?.tickCount ?? 0),
    [nStart, metrics?.tickCount],
  );

  return (
    <View
      className="h-[32px] w-full flex-1 overflow-x-hidden"
      onLayout={handleLayout}
    >
      {metrics == null ? null : (
        <>
          <View
            className="top-1/2 h-[16px] w-full rounded-[8px] bg-primary-7"
            style={{ transform: [{ translateY: -8 }] }}
          >
            {/* Ticks behind the fill bar */}
            {ticks.map((n) => {
              const isMilestone = n % milestoneInterval === 0;
              return isMilestone ? (
                <MajorTickBg key={n} n={n} axis={metrics.axis} />
              ) : (
                <MinorTickBg key={n} n={n} axis={metrics.axis} />
              );
            })}

            {/* Fill bar */}
            <Reanimated.View
              className="flex-1 overflow-hidden"
              style={[
                fillAnimStyles,
                {
                  left: 0,
                  height: 16,
                  borderRadius: halfBarSize,
                },
              ]}
            >
              {/* Background */}
              <LinearGradient
                colors={[fillColor, fillColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  flex: 1,
                  height: 16,
                  display: layout === undefined ? `none` : `flex`, // Intended to jank, but not sure if necessary.
                  width: layout?.width,
                }}
              />
            </Reanimated.View>
          </View>

          {/* Ticks over the fill bar */}
          {ticks.map((n) => {
            const isMilestone = n % milestoneInterval === 0;
            return isMilestone ? (
              <MajorTick key={n} n={n} fillSv={fillSv} axis={metrics.axis} />
            ) : (
              <MinorTick key={n} fillSv={fillSv} n={n} axis={metrics.axis} />
            );
          })}
        </>
      )}
    </View>
  );
};

const ticksToRender = (fill: number | null, tickCount: number) => {
  const min = (fill ?? 0) - tickCount;
  const max = (fill ?? 0) + tickCount;
  return makeRange(min, max);
};

const MinorTick = ({
  n,
  fillSv,
  axis,
}: {
  axis: Axis;
  fillSv: FillSv;
  n: number;
}) => {
  const animStyles = useTickAnimStyles({ axis, n, size: 5, fillSv });

  return (
    <Reanimated.View
      className="absolute top-1/2 rounded-full bg-[white]"
      style={animStyles}
    />
  );
};

const MinorTickBg = ({ n, axis }: { axis: Axis; n: number }) => {
  const animStyles = useTickAnimStyles({ axis, n, size: 3 });

  return (
    <Reanimated.View
      className="absolute top-1/2 rounded-full bg-[white] opacity-50"
      style={animStyles}
    />
  );
};

const MajorTick = ({
  n,
  fillSv,
  axis,
}: {
  fillSv: FillSv;
  n: number;
  axis: Axis;
}) => {
  const bgAnimStyles = useTickAnimStyles({
    axis,
    n,
    size: majorTickBgSize,
    fillSv,
  });

  const dotAnimStyles = useTickAnimStyles({
    axis,
    n,
    size: 8,
    fillSv,
    appearDelay: 200,
  });

  return (
    <>
      <Reanimated.View
        className="absolute top-1/2 rounded-full bg-[#3F4CF5]"
        style={bgAnimStyles}
      />
      <Reanimated.View
        className="absolute left-1/2 top-1/2 rounded-full bg-[white]"
        style={dotAnimStyles}
      />
    </>
  );
};

const MajorTickBg = ({ n, axis }: { axis: Axis; n: number }) => {
  const bgAnimStyles = useTickAnimStyles({ axis, n, size: majorTickBgSize });
  const dotAnimStyles = useTickAnimStyles({ axis, n, size: 6 });

  return (
    <>
      <Reanimated.View
        className="absolute top-1/2 rounded-full bg-primary-7"
        style={bgAnimStyles}
      />
      <Reanimated.View
        className="absolute left-1/2 top-1/2 rounded-full bg-[white] opacity-50"
        style={dotAnimStyles}
      />
    </>
  );
};

type FillSv = SharedValue<number | null>;

interface Axis {
  leftOffsetSv: SharedValue<number>;
  nToDisplay: Transform1D;
  width: number;
}

const useTickAnimStyles = ({
  axis,
  fillSv,
  appearDelay = 0,
  n,
  size,
}: {
  axis: Axis;
  fillSv?: FillSv;
  appearDelay?: number;
  n: number;
  size: number;
}) => {
  const leftSv = useDerivedValue(
    () => axis.nToDisplay(n) + axis.leftOffsetSv.get(),
  );

  const isVisibleSv = useDerivedValue(() => {
    let fill; // cache fillSv.get()
    const filled =
      fillSv == null || ((fill = fillSv.get()) != null && fill >= n);

    const left = leftSv.get();
    const inRange = left >= halfBarSize && left <= axis.width - size / 2;
    return filled && inRange;
  });

  const leftAnimStyles = useAnimatedStyle(() => ({
    left: leftSv.get(),
  }));

  const scaleAnimStyles = useAnimatedStyle(() => ({
    transform: [
      {
        scale: isVisibleSv.get()
          ? withDelay(appearDelay, withTiming(1))
          : withTiming(0, { duration: 100 }),
      },
    ],
  }));

  const sizeStyles = useMemo(
    () => ({
      width: size,
      height: size,
      marginTop: -size / 2,
      marginLeft: -size / 2,
    }),
    [size],
  );

  return [leftAnimStyles, scaleAnimStyles, sizeStyles];
};
