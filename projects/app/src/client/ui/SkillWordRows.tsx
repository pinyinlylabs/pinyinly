import { useDb } from "@/client/ui/hooks/useDb";
import type { HanziWord, Skill, SrsStateType } from "@/data/model";
import { coerceRank, getHanziWordRank, rankRules } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { Link } from "expo-router";
import { Pressable } from "react-native";
import { tv } from "tailwind-variants";
import { HanziPinyinText } from "./HanziPinyinText";
import { HskLozenge } from "./HskLozenge";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { View } from "./View";

export function SkillWordRows({
  hanziWords,
  showHskLozenges = true,
  sortByProgress = true,
}: {
  hanziWords: readonly HanziWord[];
  showHskLozenges?: boolean;
  sortByProgress?: boolean;
}) {
  const db = useDb();
  const { data: skillStates } = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );
  const { data: meanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => inArray(entry.hanziWord, [...hanziWords])),
    [db.dictionaryCollection, hanziWords],
  );
  const meaningsByWord = new Map(
    meanings.map((meaning) => [meaning.hanziWord, meaning]),
  );
  const skillSrsStates = new Map<Skill, SrsStateType>(
    skillStates.map((item) => [item.skill, item.srs]),
  );

  const rows = hanziWords.map((hanziWord) => {
    const rankedHanziWord = getHanziWordRank({
      hanziWord,
      skillSrsStates,
      rankRules,
    });
    const meaning = meaningsByWord.get(hanziWord);
    const rank = coerceRank(rankedHanziWord.rank);
    return {
      hanziWord,
      hanzi: hanziFromHanziWord(hanziWord),
      hsk: meaning?.hsk ?? null,
      pinyin: meaning?.pinyin?.[0] ?? null,
      gloss: meaning?.gloss[0] ?? ``,
      rank,
      absoluteProgress: toAbsoluteProgress({
        rank,
        completion: rankedHanziWord.completion,
      }),
    };
  });
  if (sortByProgress) {
    rows.sort(
      (first, second) =>
        second.absoluteProgress - first.absoluteProgress ||
        first.hanzi.localeCompare(second.hanzi),
    );
  }

  return (
    <View className="-my-1.5 gap-1">
      {rows.map((row) => (
        <Link
          href={`/wiki/${encodeURIComponent(row.hanzi)}`}
          asChild
          key={row.hanziWord}
        >
          <Pressable className="flex flex-row items-center gap-2 py-1.5">
            <HanziPinyinText
              className="flex-1"
              hanzi={row.hanzi}
              pinyin={row.pinyin}
              lozenges={
                !showHskLozenges || row.hsk == null ? null : (
                  <HskLozenge hskLevel={row.hsk} size="sm" color="muted-fg" />
                )
              }
            />
            <Text
              className="ml-4 flex-1 text-right font-sans text-base text-fg"
              numberOfLines={2}
            >
              {row.gloss}
            </Text>
            <View className="ml-2 w-21 items-end">
              <View className="relative h-1.5 w-full rounded bg-fg/10">
                {milestonePercents.map((milestonePercent) => (
                  <View
                    className={milestoneDotClass({
                      reached: row.absoluteProgress >= milestonePercent / 100,
                      rank: row.rank,
                    })}
                    key={milestonePercent}
                    style={{ left: `${milestonePercent}%` }}
                  />
                ))}
                {row.absoluteProgress === 0 ? null : (
                  <View
                    className={rankProgressClass({ rank: row.rank })}
                    style={{ width: `${row.absoluteProgress * 100}%` }}
                  />
                )}
              </View>
            </View>
            <Icon
              icon="chevron-right"
              size={12}
              className="ml-2"
              tintColorClassName="accent-muted-fg"
            />
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const milestoneDotClass = tv({
  base: `absolute top-1/2 z-10 size-1 -translate-1/2 rounded-full`,
  variants: {
    reached: { false: `bg-fg/30`, true: `` },
    rank: {
      0: `bg-fg/40`,
      1: `bg-cyan`,
      2: `bg-blue`,
      3: `bg-violet`,
      4: `bg-fuchsia`,
    },
  },
  compoundVariants: [
    { reached: false, rank: 0, className: `bg-fg/30` },
    { reached: false, rank: 1, className: `bg-fg/30` },
    { reached: false, rank: 2, className: `bg-fg/30` },
    { reached: false, rank: 3, className: `bg-fg/30` },
    { reached: false, rank: 4, className: `bg-fg/30` },
  ],
});

const milestonePercents = [25, 50, 75] as const;

function toAbsoluteProgress({
  rank,
  completion,
}: {
  rank: 0 | 1 | 2 | 3 | 4;
  completion: number;
}): number {
  if (rank === 0) {
    return 0;
  }
  if (rank === 4) {
    return 1;
  }
  return Math.max(0, Math.min((rank - 1 + completion) / 4, 1));
}

const rankProgressClass = tv({
  base: `h-1.5 rounded`,
  variants: {
    rank: {
      0: `bg-fg/30`,
      1: `bg-fg/70`,
      2: `bg-blue`,
      3: `bg-violet`,
      4: `bg-fuchsia`,
    },
  },
});
