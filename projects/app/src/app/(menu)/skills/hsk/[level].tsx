import { dictionaryQuery } from "@/client/query";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { DropdownMenu } from "@/client/ui/DropdownMenu";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import type { Dictionary } from "@/dictionary";
import type { HanziWord, Skill, SrsStateType } from "@/data/model";
import { coerceRank, getHanziWordRank, rankRules } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary";
import { useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { HskLozenge } from "@/client/ui/HskLozenge";
import { Icon } from "@/client/ui/Icon";
import { useDb } from "@/client/ui/hooks/useDb";

type HskLevel = `1` | `2` | `3` | `4`;

const hskLevels: readonly HskLevel[] = [`1`, `2`, `3`, `4`];

export default function SkillsHskLevelRoutePage() {
  const { level } = useLocalSearchParams<{ level?: string }>();
  const parsedLevel = parseHskLevel(level);
  const { data: dictionary } = useQuery(dictionaryQuery);

  if (parsedLevel == null) {
    return null;
  }

  return (
    <View className="gap-5">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/skills">Skills</Breadcrumbs.Item>
        <Breadcrumbs.Item menu={<HskLevelMenu currentLevel={parsedLevel} />}>
          {`HSK ${parsedLevel}`}
        </Breadcrumbs.Item>
      </Breadcrumbs>

      <View>
        <Text className="pyly-body-title">{`HSK ${parsedLevel}`}</Text>
        <HeaderTitleProvider.ScrollTrigger title={`HSK ${parsedLevel}`} />
      </View>

      <HskSkillWordRows
        hanziWords={hskWordsFromDictionary(dictionary, parsedLevel)}
        showHskLozenges={false}
        dictionary={dictionary}
      />
    </View>
  );
}

function parseHskLevel(level: string | undefined): HskLevel | null {
  if (level === `1` || level === `2` || level === `3` || level === `4`) {
    return level;
  }

  return null;
}

function HskLevelMenu({ currentLevel }: { currentLevel: HskLevel }) {
  return (
    <DropdownMenu.Content>
      {hskLevels.map((level) => (
        <DropdownMenu.Item
          href={`/skills/hsk/${level}`}
          iconEnd={level === currentLevel ? `check` : undefined}
          iconSize={16}
          key={level}
        >
          {`HSK ${level}`}
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  );
}

function hskWordsFromDictionary(
  dictionary: Dictionary | undefined,
  level: HskLevel,
) {
  if (dictionary == null) {
    return [];
  }

  switch (level) {
    case `1`: {
      return dictionary.hsk1HanziWords;
    }
    case `2`: {
      return dictionary.hsk2HanziWords;
    }
    case `3`: {
      return dictionary.hsk3HanziWords;
    }
    case `4`: {
      return dictionary.hsk4HanziWords;
    }
  }
}

function HskSkillWordRows({
  hanziWords,
  showHskLozenges = true,
  dictionary,
}: {
  hanziWords: readonly HanziWord[];
  showHskLozenges?: boolean;
  dictionary: Dictionary | undefined;
}) {
  const db = useDb();
  const { data: skillStates } = useLiveQuery(
    (q) => q.from({ skillState: db.skillStateCollection }),
    [db.skillStateCollection],
  );

  const skillSrsStates = new Map<Skill, SrsStateType>(
    skillStates.map((item) => [item.skill, item.srs]),
  );

  const rows =
    dictionary == null
      ? []
      : hanziWords.map((hanziWord) => {
          const rankedHanziWord = getHanziWordRank({
            hanziWord,
            skillSrsStates,
            rankRules,
          });
          const meaning = dictionary.lookupHanziWord(hanziWord);

          return {
            hanziWord,
            hanzi: hanziFromHanziWord(hanziWord),
            hsk: meaning?.hsk ?? null,
            pinyin: meaning?.pinyin?.[0] ?? null,
            gloss: meaning?.gloss[0] ?? ``,
            rank: coerceRank(rankedHanziWord.rank),
            completion: rankedHanziWord.completion,
            absoluteProgress: toAbsoluteProgress({
              rank: coerceRank(rankedHanziWord.rank),
              completion: rankedHanziWord.completion,
            }),
          };
        });

  rows.sort((a, b) => {
    if (b.absoluteProgress !== a.absoluteProgress) {
      return b.absoluteProgress - a.absoluteProgress;
    }

    return a.hanzi.localeCompare(b.hanzi);
  });

  const hasAnyHskLozenges =
    showHskLozenges && rows.some((row) => row.hsk != null);

  return (
    <View className="-my-1.5 gap-1">
      {rows.map((row) => (
        <Link
          href={`/wiki/${encodeURIComponent(row.hanzi)}`}
          asChild
          key={row.hanziWord}
        >
          <Pressable className="flex flex-row items-center gap-2 py-1.5">
            {hasAnyHskLozenges ? (
              <View className="w-11">
                {row.hsk == null ? null : (
                  <HskLozenge hskLevel={row.hsk} size="sm" />
                )}
              </View>
            ) : null}

            {row.hanzi.length === 1 ? (
              <View className="flex-1 flex-row items-center gap-3">
                <Text className="font-sans text-3xl font-normal text-fg-loud">
                  {row.hanzi}
                </Text>
                {row.pinyin == null ? null : (
                  <Text className="font-sans text-base text-fg-dim">
                    {row.pinyin}
                  </Text>
                )}
              </View>
            ) : (
              <View className="flex-1 gap-0">
                <Text className="font-sans text-2xl font-normal text-fg-loud">
                  {row.hanzi}
                </Text>
                {row.pinyin == null ? null : (
                  <Text className="font-sans text-sm text-fg-dim">
                    {row.pinyin}
                  </Text>
                )}
              </View>
            )}

            <Text
              className="ml-4 flex-1 text-right font-sans text-base text-fg"
              numberOfLines={2}
            >
              {row.gloss}
            </Text>

            <View className="ml-2 w-21 items-end">
              <View className="relative h-1.5 w-full rounded bg-fg/10">
                {milestonePercents.map((milestonePercent) => {
                  const milestoneProgress = milestonePercent / 100;
                  const isReached = row.absoluteProgress >= milestoneProgress;

                  return (
                    <View
                      className={milestoneDotClass({
                        reached: isReached,
                        rank: row.rank,
                      })}
                      key={milestonePercent}
                      style={{ left: `${milestonePercent}%` }}
                    />
                  );
                })}

                {row.absoluteProgress === 0 ? null : (
                  <View
                    className={rankProgressClass({ rank: row.rank })}
                    style={{ width: `${row.absoluteProgress * 100}%` }}
                  />
                )}
              </View>
            </View>

            <Icon icon="chevron-right" size={12} className="ml-2 text-fg-dim" />
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const milestoneDotClass = tv({
  base: `absolute top-1/2 z-10 size-1 -translate-1/2 rounded-full`,
  variants: {
    reached: {
      false: `bg-fg/30`,
      true: ``,
    },
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

  const absoluteProgress = (rank - 1 + completion) / 4;
  return Math.max(0, Math.min(absoluteProgress, 1));
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
