import { View } from "react-native";
import { Circle, Svg } from "react-native-svg";

export function ProgressPieIcon({
  progress,
  size = 12,
  warn = false,
}: {
  progress: number;
  size?: number;
  warn?: boolean;
}) {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, progress));
  const dash = `${clamped * circumference} ${circumference}`;

  return (
    <View
      className={
        warn
          ? `
            color-fg

            [--color-fg:var(--color-warning)]
          `
          : `
            color-fg

            [--color-fg:var(--color-fg-dim)]
          `
      }
      style={{ width: size, height: size }}
    >
      <Svg viewBox="0 0 36 36" width={size} height={size}>
        <Circle
          stroke="currentColor"
          strokeOpacity="40%"
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth={3}
        />
        <Circle
          stroke="currentColor"
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          strokeWidth={3}
          strokeDasharray={dash}
          strokeDashoffset={0}
          transform="rotate(-90 18 18)"
        />
      </Svg>
    </View>
  );
}
