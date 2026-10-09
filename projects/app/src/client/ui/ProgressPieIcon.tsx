import { View } from "@/client/ui/View";
import { Circle, Svg } from "react-native-svg";
import { ScopedVariables } from "./ScopedVariables";

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
    <ScopedVariables
      variables={{
        "--color-fg": warn ? `var(--color-warning)` : `var(--color-muted-fg)`,
      }}
    >
      <View className="text-fg" style={{ width: size, height: size }}>
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
    </ScopedVariables>
  );
}
