import { ExampleStack } from "@/client/ui/demo/components";
import { View } from "@/client/ui/View";
import type { ProficiencyColor } from "@/data/skills";
import { SkillProgressBar } from "./SkillProgressBar";

const examples: {
  label: string;
  progress: number;
  color: ProficiencyColor;
}[] = [
  { label: `Not started`, progress: 0, color: `muted-fg` },
  { label: `Novice · 25%`, progress: 0.25, color: `blue` },
  { label: `Apprentice · 50%`, progress: 0.5, color: `emerald` },
  { label: `Expert · 75%`, progress: 0.75, color: `violet` },
  { label: `Master`, progress: 1, color: `amber` },
];

export default () => (
  <View className="w-full gap-3">
    {examples.map(({ label, progress, color }) => (
      <ExampleStack key={label} title={label}>
        <View className="w-64">
          <SkillProgressBar
            progress={progress}
            color={color}
            accessibilityLabel={`${label} proficiency`}
          />
        </View>
      </ExampleStack>
    ))}
  </View>
);
