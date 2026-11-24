import { ExampleStack } from "@/client/ui/demo/components";
import { View } from "@/client/ui/View";
import { rankPresentation } from "@/data/skills";
import { WikiHanziProgressLozengeDisplay } from "./WikiHanziProgressLozenge";

const examples = [
  { rank: 0, progress: 0 },
  { rank: 1, progress: 0 },
  { rank: 1, progress: 0.5 },
  { rank: 2, progress: 0 },
  { rank: 2, progress: 0.75 },
  { rank: 3, progress: 0 },
  { rank: 3, progress: 0.5 },
  { rank: 4, progress: 1 },
] as const;

export default () => (
  <View className="w-full flex-row flex-wrap gap-2">
    {examples.map(({ rank, progress }) => (
      <ExampleStack
        key={`${rank}-${progress}`}
        title={`${rankPresentation[rank].label} · ${progress * 100}%`}
      >
        <WikiHanziProgressLozengeDisplay progress={progress} rank={rank} />
      </ExampleStack>
    ))}
  </View>
);
