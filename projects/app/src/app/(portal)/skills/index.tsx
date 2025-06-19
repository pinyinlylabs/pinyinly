import { getAllTargetHanziWords } from "@/client/query";
import { useRizzleQueryPaged } from "@/client/ui/ReplicacheContext";
import type { SrsStateType } from "@/data/model";
import type { Skill } from "@/data/rizzleSchema";
import type { RankedHanziWord } from "@/data/skills";
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
    const rankToHanziWords = new Map<number, RankedHanziWord[]>();

    for (const hanziWord of hanziWords) {
      const rankedHanziWord = getHanziWordRank({
        hanziWord,
        skillSrsStates,
        rankRules,
      });

      const rankNumber = rankedHanziWord.rank;
      const existing = rankToHanziWords.get(rankNumber);
      if (existing == null) {
        rankToHanziWords.set(rankNumber, [rankedHanziWord]);
      } else {
        existing.push(rankedHanziWord);
      }
    }

    for (const unsorted of rankToHanziWords.values()) {
      unsorted.sort(sortComparatorNumber((x) => x.completion));
    }
    return { rankToHanziWords };
  });

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="hhh-body-title">Skills</Text>
      </View>

      {/* Rank groups */}
      {([1, 2, 3, 4, 0] as const).map((rank) => {
        const items = x.data?.rankToHanziWords.get(rank);
        return items == null ? null : (
          <View className="gap-2" key={rank}>
            <View className="items-start">
              <Text className={rankTextClass({ rank })}>Rank {rank}</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {items.map(({ hanziWord, rank, completion }) => (
                <SkillTile
                  key={hanziWord}
                  rank={coerceRank(rank)}
                  completion={completion}
                  hanzi={hanziFromHanziWord(hanziWord)}
                  gloss={meaningKeyFromHanziWord(hanziWord)}
                />
              ))}
              {/* There's no way to know how many tiles are needed to fill the row (because it's responsive width), so we just fill it with 4 invisible tiles. This is a bit of a hack, but it works for now. */}
              {skillTileFiller}
              {skillTileFiller}
              {skillTileFiller}
              {skillTileFiller}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const skillTileFiller = (
  <SkillTile rank={0} completion={0} hanzi="" gloss="" className="invisible" />
);

const rankTextClass = tv({
  base: `
    h-5 items-center justify-center rounded-full px-2 text-[10px] uppercase leading-[20px] ring-1
  `,
  variants: {
    rank: {
      0: `bg-[#1A1A1A] text-[#999999] ring-[#666666]`,
      1: `bg-[#3C1F36] text-[#FF38BD] ring-[#DD0093]`,
      2: `bg-[#361A3D] text-[#D945FF] ring-[#B323D8]`,
      3: `bg-[#002244] text-[#6B7CFF] ring-[#293EDB]`,
      4: `bg-[#002644] text-[#3F89FF] ring-[#0055DE]`,
    },
  },
});

type RankNumber = 0 | 1 | 2 | 3 | 4;

function coerceRank(rank: number): RankNumber {
  if (rank < 0) {
    return 0;
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
        {completion === 0 ? null : (
          <View
            className={skillTileProgressBarClass({ rank })}
            style={{ width: `${completion * 100}%` }}
          />
        )}
      </View>
    </View>
  );
}

const skillTileClass = tv({
  base: `min-w-[120px] flex-1 rounded-lg border-b-2 px-4 py-3`,
  variants: {
    rank: {
      0: `border-b-[#2b2b2b] bg-[#1A1A1A]`,
      1: `border-b-[#5C184E] bg-[#3C1F36]`,
      2: `border-b-[#4E145D] bg-[#361A3D]`,
      3: `border-b-[#002B56] bg-[#002244]`,
      4: `border-b-[#002F53] bg-[#002644]`,
    },
  },
});

const skillTileTitleClass = tv({
  base: `hhh-body-title truncate`,
  variants: {
    rank: {
      0: `text-[#999999]`,
      1: `text-[#FFE3F9]`,
      2: `text-[#FAE8FF]`,
      3: `text-[#E8F4FF]`,
      4: `text-[#E8F4FF]`,
    },
  },
});

const skillTileGlossClass = tv({
  base: `hhh-body-caption truncate`,
  variants: {
    rank: {
      0: `text-[#999999]`,
      1: `text-[#FFCEF5]`,
      2: `text-[#F5CCFF]`,
      3: `text-[#A4D1FF]`,
      4: `text-[#A4D1FF]`,
    },
  },
});

const skillTileProgressBarClass = tv({
  base: `h-1 rounded`,
  variants: {
    rank: {
      0: `bg-[#666666]`,
      1: `bg-[#FF38BD]`,
      2: `bg-[#D945FF]`,
      3: `bg-[#6B7CFF]`,
      4: `bg-[#3F89FF]`,
    },
  },
});
