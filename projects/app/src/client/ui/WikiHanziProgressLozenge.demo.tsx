import { ExampleStack } from "@/client/ui/demo/components";
import { View } from "@/client/ui/View";
import { rankPresentation } from "@/data/skills";
import type { RankNumber } from "@/data/skills";
import { useState } from "react";
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
    {examples.flatMap(({ rank, progress }) =>
      [false, true].map((bookmarked) => (
        <ExampleStack
          key={`${rank}-${progress}-${bookmarked}`}
          title={`${rankPresentation[rank].label} · ${progress * 100}% · ${bookmarked ? `Saved` : `Unsaved`}`}
        >
          <ProgressExample
            rank={rank}
            progress={progress}
            bookmarked={bookmarked}
          />
        </ExampleStack>
      )),
    )}
  </View>
);

function ProgressExample({
  rank,
  progress,
  bookmarked,
}: {
  rank: RankNumber;
  progress: number;
  bookmarked: boolean;
}) {
  const [isBookmarked, setIsBookmarked] = useState(bookmarked);
  return (
    <WikiHanziProgressLozengeDisplay
      progress={progress}
      rank={rank}
      isBookmarked={isBookmarked}
      onBookmarkToggle={() => {
        setIsBookmarked(!isBookmarked);
      }}
    />
  );
}
