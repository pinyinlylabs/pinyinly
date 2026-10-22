import type { ProficiencyColor } from "@/data/skills";
import { View } from "./View";
import { proficiencyFillProgress, proficiencyStyle } from "./proficiencyStyles";

export function SkillProgressBar({
  progress,
  color,
  accessibilityLabel,
}: {
  progress: number;
  color: ProficiencyColor;
  accessibilityLabel: string;
}) {
  const clampedProgress = Math.max(0, Math.min(progress, 1));

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(clampedProgress * 100),
        text: `${Math.round(clampedProgress * 100)}%`,
      }}
      className="relative h-1.5 w-full rounded bg-fg/10"
    >
      {milestonePercents.map((milestonePercent) => (
        <View
          className="absolute bottom-0 z-10 size-0.5 -translate-x-1/2 bg-bg"
          key={milestonePercent}
          style={{ left: `${milestonePercent}%` }}
        />
      ))}
      {clampedProgress === 0 ? null : (
        <View
          className={`
            h-1.5 rounded

            ${proficiencyStyle[color].barProgressClass}
          `}
          style={{
            width: `${proficiencyFillProgress(clampedProgress) * 100}%`,
          }}
        />
      )}
    </View>
  );
}

const milestonePercents = [25, 50, 75] as const;
