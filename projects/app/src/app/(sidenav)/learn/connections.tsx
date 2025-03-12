import { questionsForReview } from "@/client/query";
import { RectButton2 } from "@/client/ui/RectButton2";
import { useReplicache } from "@/client/ui/ReplicacheContext";
import { useQuery } from "@tanstack/react-query";
import chunk from "lodash/chunk";
import shuffle from "lodash/shuffle";
import { useId, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function ConnectionsPage() {
  const r = useReplicache();
  const id = useId();

  const questions = useQuery({
    queryKey: [ConnectionsPage.name, `quiz`, id],
    queryFn: async () => {
      const result = await questionsForReview(r, {
        limit: 10,
        dueBeforeNow: true,
        // Look ahead at the next 50 skills, shuffle them and take 10. This way
        // you don't end up with the same set over and over again (which happens a
        // lot in development).
        sampleSize: 50,
      });

      return result.map(([, , question]) => question);
    },
  });

  const [shuffleCount, setShuffleCount] = useState(1);

  interface Group {
    name: string;
    words: string[];
  }

  const [groups] = useState<Group[]>(() => [
    { name: `交通工具`, words: [`汽车`, `火车`, `飞机`, `自行车`] },
    { name: `食物类别`, words: [`米饭`, `面条`, `馒头`, `包子`] },
    { name: `自然现象`, words: [`雨`, `雪`, `风`, `雷`] },
    { name: `文具用品`, words: [`笔`, `橡皮`, `书`, `尺子`] },
  ]);

  const [matchedGroups, setMatchedGroups] = useState<Group[]>([]);

  const [selectedTiles, setSelectedTiles] = useState<readonly string[]>([]);

  const selectTile = (text: string) => {
    const newSelectedTiles = selectedTiles.includes(text)
      ? selectedTiles.filter((x) => x != text)
      : selectedTiles.length < 4
        ? [...selectedTiles, text]
        : selectedTiles;

    // Check if the new group is a whole group.
    const matchedGroup = groups.find((g) =>
      g.words.every((w) => newSelectedTiles.includes(w)),
    );

    if (matchedGroup == null) {
      setSelectedTiles(newSelectedTiles);
    } else {
      setMatchedGroups((existing) => [...existing, matchedGroup]);
      setSelectedTiles([]);
    }
  };

  const shuffledWords = useMemo(() => {
    const words = groups.flatMap((x) => x.words);
    return shuffleCount > 0 ? shuffle(words) : words;
  }, [shuffleCount, groups]);

  const unmatchedWords = shuffledWords.filter((w) =>
    matchedGroups.every((g) => !g.words.includes(w)),
  );

  const wordsBy4 = chunk(unmatchedWords, 4);

  return (
    <View className="flex-1 items-center bg-background pt-safe-offset-[20px]">
      {questions.isLoading ? (
        <View className="my-auto">
          <Text className="text-text">Loading…</Text>
        </View>
      ) : questions.error ? (
        <Text className="text-text">Oops something broken</Text>
      ) : (
        <View
          style={{
            flex: 1,
            gap: 16,
            alignItems: `center`,
            justifyContent: `center`,
            paddingLeft: 20,
            paddingRight: 20,
          }}
        >
          <View className="h-[400px] w-[400px] flex-col gap-2">
            {wordsBy4.map((group, groupI) => (
              <View className="flex-1 flex-row gap-2" key={groupI}>
                {group.map((x, i) => (
                  <RectButton2
                    key={i}
                    variant="outline"
                    className="flex-1"
                    textClassName="text-xl"
                    accent={selectedTiles.includes(x)}
                    onPress={() => {
                      selectTile(x);
                    }}
                  >
                    {x}
                  </RectButton2>
                ))}
              </View>
            ))}
            {matchedGroups.map((m, i) => (
              <View
                className={matchedGroupClass({
                  i: i as 0,
                  className: matchedGroups.length < 4 ? `opacity-0` : ``,
                })}
                key={i}
              >
                <Text className="text-bold text-xl text-text">{m.name}</Text>
                <Text className="text-text">{m.words.join(`, `)}</Text>
              </View>
            ))}
          </View>
          <RectButton2
            onPress={() => {
              setShuffleCount((x) => x + 1);
            }}
          >
            Shuffle
          </RectButton2>
        </View>
      )}
    </View>
  );
}

const matchedGroupClass = tv({
  base: `flex-1 items-center justify-center gap-1`,
  variants: {
    i: {
      0: `bg-[red]`,
      1: `bg-[blue]`,
      2: `bg-[green]`,
      3: `bg-[purple]`,
    },
  },
});
