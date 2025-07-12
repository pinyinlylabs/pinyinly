import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import { getAllTargetHanziWords } from "@/client/query";
import { HanziWordRefText } from "@/client/ui/HanziWordRefText";
import type { HanziWord, SrsStateType } from "@/data/model";
import type { Skill } from "@/data/rizzleSchema";
import type { RankedHanziWord, RankNumber } from "@/data/skills";
import {
  coerceRank,
  getHanziWordRank,
  rankName,
  rankRules,
} from "@/data/skills";
import { meaningKeyFromHanziWord } from "@/dictionary/dictionary";
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
        <Text className="pyly-body-title">Skills</Text>
      </View>

      {/* Rank groups */}
      {([1, 2, 3, 4, 0] as const).map((rank) => {
        const items = x.data?.rankToHanziWords.get(rank);
        return items == null ? null : (
          <View className="gap-2" key={rank}>
            <RankLozenge rank={rank} />

            <View className="flex-row flex-wrap gap-2">
              {items.map(({ hanziWord, rank, completion }) => (
                <SkillTile
                  key={hanziWord}
                  rank={coerceRank(rank)}
                  completion={completion}
                  hanziWord={hanziWord}
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
  <SkillTile
    rank={0}
    completion={0}
    hanziWord={null}
    gloss=""
    className="invisible"
  />
);

const rankLozengeTextClass = tv({
  base: `items-center justify-center rounded-full px-3 py-2 text-xs font-medium uppercase text-bg`,
  variants: {
    rank: {
      0: `bg-fg/10 text-fg/50`,
      1: `bg-cyan`,
      2: `bg-blue`,
      3: `bg-violet`,
      4: `bg-fuchsia`,
    },
  },
});

export function RankLozenge({ rank }: { rank: RankNumber }) {
  return (
    <View className="items-start">
      <Text className={rankLozengeTextClass({ rank })}>{rankName(rank)}</Text>
    </View>
  );
}

export function SkillTile({
  hanziWord,
  gloss,
  className,
  rank,
  completion,
}: {
  hanziWord: HanziWord | null;
  gloss: string;
  className?: string;
  rank: RankNumber;
  completion: number;
}) {
  return (
    <View className={skillTileClass({ rank, className })}>
      <Text className={skillTileTitleClass({ rank })}>
        {hanziWord == null ? null : (
          <HanziWordRefText hanziWord={hanziWord} showGloss={false} />
        )}
      </Text>
      <Text className={skillTileGlossClass({ rank })}>{gloss}</Text>
      <View className="mt-3 h-1 w-full items-start rounded bg-bg">
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
  base: `min-w-[120px] flex-1 rounded-lg px-4 py-3`,
  variants: {
    rank: {
      0: `bg-bg-1`,
      1: `bg-cyan/5`,
      2: `bg-blue/5`,
      3: `bg-violet/5`,
      4: `bg-fuchsia/5`,
    },
  },
});

const skillTileTitleClass = tv({
  base: `pyly-body-title truncate`,
  variants: {
    rank: {
      0: `text-fg/50`,
      1: `text-cyan`,
      2: `text-blue`,
      3: `text-violet`,
      4: `text-fuchsia`,
    },
  },
});

const skillTileGlossClass = tv({
  base: `pyly-body-caption truncate`,
  variants: {
    rank: {
      0: `text-fg/50`,
      1: `text-cyan`,
      2: `text-blue`,
      3: `text-violet`,
      4: `text-fuchsia`,
    },
  },
});

const skillTileProgressBarClass = tv({
  base: `h-1 rounded`,
  variants: {
    rank: {
      0: `text-fg/50`,
      1: `bg-cyan`,
      2: `bg-blue`,
      3: `bg-violet`,
      4: `bg-fuchsia`,
    },
  },
});
