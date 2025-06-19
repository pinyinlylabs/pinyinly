import { getAllTargetHanziWords } from "@/client/query";
import { useRizzleQueryPaged } from "@/client/ui/ReplicacheContext";
import type { SrsStateType } from "@/data/model";
import type { Skill } from "@/data/rizzleSchema";
import { getHanziWordRank, rankRules } from "@/data/skills";
import {
  hanziFromHanziWord,
  meaningKeyFromHanziWord,
} from "@/dictionary/dictionary";
import { sortComparatorNumber } from "@/util/collections";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SkillsPage() {
  const x = useRizzleQueryPaged([SkillsPage.name, `skillStates`], async (r) => {
    const skillSrsStates = new Map<Skill, SrsStateType>();
    for await (const [, v] of r.queryPaged.skillState.scan()) {
      skillSrsStates.set(v.skill, v.srs);
    }

    const hanziWords = await getAllTargetHanziWords();
    const rankedHanziWords = hanziWords.map((hanziWord) => ({
      hanziWord,
      ...getHanziWordRank({
        hanziWord,
        skillSrsStates,
        rankRules,
      }),
    }));

    return rankedHanziWords;
  });

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="hhh-body-title">Skills</Text>
      </View>

      {/* Rank 1 skills */}
      <View className="gap-2">
        <View className="items-start">
          <Text className={rankTextClass({ rank: 1 })}>Rank 1</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {x.data
            ?.filter((x) => x.currentRank === 1)
            .sort(sortComparatorNumber((x) => x.completion))
            .map((x) => (
              <SkillTile
                key={x.hanziWord}
                rank={coerceRank(x.currentRank)}
                completion={x.completion}
                hanzi={hanziFromHanziWord(x.hanziWord)}
                gloss={meaningKeyFromHanziWord(x.hanziWord)}
              />
            ))}

          {/* Placeholder fill */}
          <SkillTile
            rank={2}
            completion={0}
            hanzi=""
            gloss=""
            className="invisible"
          />
          <SkillTile
            rank={2}
            completion={0}
            hanzi=""
            gloss=""
            className="invisible"
          />
          <SkillTile
            rank={2}
            completion={0}
            hanzi=""
            gloss=""
            className="invisible"
          />
        </View>
      </View>

      {/* Rank 2 skills */}
      <View className="gap-2">
        <View className="items-start">
          <Text className={rankTextClass({ rank: 2 })}>Rank 2</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {x.data
            ?.filter((x) => x.currentRank === 2)
            .sort(sortComparatorNumber((x) => x.completion))
            .map((x) => (
              <SkillTile
                key={x.hanziWord}
                rank={coerceRank(x.currentRank)}
                completion={x.completion}
                hanzi={hanziFromHanziWord(x.hanziWord)}
                gloss={meaningKeyFromHanziWord(x.hanziWord)}
              />
            ))}
        </View>
      </View>

      {/* Rank 3 skills */}
      <View className="gap-3">
        <View className="items-start">
          <Text className={rankTextClass({ rank: 3 })}>Rank 3</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {x.data
            ?.filter((x) => x.currentRank === 3)
            .sort(sortComparatorNumber((x) => x.completion))
            .map((x) => (
              <SkillTile
                key={x.hanziWord}
                rank={coerceRank(x.currentRank)}
                completion={x.completion}
                hanzi={hanziFromHanziWord(x.hanziWord)}
                gloss={meaningKeyFromHanziWord(x.hanziWord)}
              />
            ))}
        </View>
      </View>

      {/* Rank 4 skills */}
      <View className="gap-4">
        <View className="items-start">
          <Text className={rankTextClass({ rank: 4 })}>Rank 4</Text>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {x.data
            ?.filter((x) => x.currentRank === 4)
            .sort(sortComparatorNumber((x) => x.completion))
            .map((x) => (
              <SkillTile
                key={x.hanziWord}
                rank={coerceRank(x.currentRank)}
                completion={x.completion}
                hanzi={hanziFromHanziWord(x.hanziWord)}
                gloss={meaningKeyFromHanziWord(x.hanziWord)}
              />
            ))}
        </View>
      </View>
    </View>
  );
}

const rankTextClass = tv({
  base: `
    h-5 items-center justify-center rounded-full px-2 text-[10px] uppercase leading-[20px] ring-1
  `,
  variants: {
    rank: {
      1: `bg-[#3C1F36] text-[#FF38BD] ring-[#DD0093]`,
      2: `bg-[#361A3D] text-[#D945FF] ring-[#B323D8]`,
      3: `bg-[#002244] text-[#6B7CFF] ring-[#293EDB]`,
      4: `bg-[#002644] text-[#3F89FF] ring-[#0055DE]`,
    },
  },
});

type RankNumber = 1 | 2 | 3 | 4;

function coerceRank(rank: number): RankNumber {
  if (rank < 1) {
    return 1;
  }
  if (rank > 4) {
    return 4;
  }
  return rank as RankNumber;
}

function SkillTile({
  hanzi,
  gloss,
  className,
  rank,
  completion,
}: {
  hanzi: string;
  gloss: string;
  className?: string;
  rank: RankNumber;
  completion: number;
}) {
  return (
    <View className={skillTileClass({ rank, className })}>
      <Text className={skillTileTitleClass({ rank })}>{hanzi}</Text>
      <Text className={skillTileGlossClass({ rank })}>{gloss}</Text>
      <View className="mt-3 h-1 w-full items-start rounded bg-background">
        <View
          className={skillTileProgressBarClass({ rank })}
          style={{ width: `${completion * 100}%` }}
        ></View>
      </View>
    </View>
  );
}

const skillTileClass = tv({
  base: `min-w-[120px] flex-1 rounded-lg border-b-2 px-4 py-3`,
  variants: {
    rank: {
      1: `border-b-[#5C184E] bg-[#3C1F36]`,
      2: `border-b-[#4E145D] bg-[#361A3D]`,
      3: `border-b-[#002B56] bg-[#002244]`,
      4: `border-b-[#002F53] bg-[#002644]`,
    },
  },
});

const skillTileTitleClass = tv({
  base: `hhh-body-title`,
  variants: {
    rank: {
      1: `text-[#FFE3F9]`,
      2: `text-[#FAE8FF]`,
      3: `text-[#E8F4FF]`,
      4: `text-[#E8F4FF]`,
    },
  },
});

const skillTileGlossClass = tv({
  base: `hhh-body-caption`,
  variants: {
    rank: {
      1: `text-[#FFCEF5]`,
      2: `text-[#F5CCFF]`,
      3: `text-[#A4D1FF]`,
      4: `text-[#A4D1FF]`,
    },
  },
});

const skillTileProgressBarClass = tv({
  base: `h-1 min-w-2 rounded`,
  variants: {
    rank: {
      1: `bg-[#FF38BD]`,
      2: `bg-[#D945FF]`,
      3: `bg-[#6B7CFF]`,
      4: `bg-[#3F89FF]`,
    },
  },
});
