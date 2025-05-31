import { targetSkillsReviewQueue } from "@/client/query";
import { useRizzleQueryPaged } from "@/client/ui/ReplicacheContext";
import { SkillRefText } from "@/client/ui/SkillRefText";
import {
  needsToBeIntroduced,
  skillKindFromSkill,
  skillKindToShorthand,
} from "@/data/skills";
import {
  emptyArray,
  inverseSortComparator,
  sortComparatorDate,
} from "@/util/collections";
import { fsrsIsStable, Rating } from "@/util/fsrs";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function HistoryPage() {
  const data2Query = useRizzleQueryPaged(
    [HistoryPage.name, `targetSkillsReviewQueue`],
    (r) => targetSkillsReviewQueue(r),
  );

  const skillRatingsQuery = useRizzleQueryPaged(
    [HistoryPage.name, `skillRatings`],
    async (r) => {
      const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
      return res.reverse().slice(0, 100);
    },
  );

  const skillStatesQuery = useRizzleQueryPaged(
    [HistoryPage.name, `skillStates`],
    async (r) => {
      const res = await r.queryPaged.skillState.scan().toArray();
      return new Map(res.map(([, value]) => [value.skill, value]));
    },
  );

  const hanziGlossMistakesQuery = useRizzleQueryPaged(
    [HistoryPage.name, `hanziGlossMistakesQuery`],
    async (r) => {
      return await r.queryPaged.hanziGlossMistake.byCreatedAt().toArray();
    },
  );

  const hanziPinyinMistakesQuery = useRizzleQueryPaged(
    [HistoryPage.name, `hanziPinyinMistakesQuery`],
    async (r) => {
      return await r.queryPaged.hanziPinyinMistake.byCreatedAt().toArray();
    },
  );

  const allMistakes = useMemo(() => {
    return [
      ...(hanziGlossMistakesQuery.data ?? emptyArray),
      ...(hanziPinyinMistakesQuery.data ?? emptyArray),
    ]
      .sort(
        inverseSortComparator(
          sortComparatorDate(([, mistake]) => mistake.createdAt),
        ),
      )
      .slice(0, 100);
  }, [hanziGlossMistakesQuery.data, hanziPinyinMistakesQuery.data]);

  const [_stats, setStats] = useState<{
    stableCount: number;
    totalCount: number;
    needsToBeIntroducedCount: number;
    unstableCount: number;
  }>();
  useEffect(() => {
    let stableCount = 0;
    let totalCount = 0;
    let needsToBeIntroducedCount = 0;
    let unstableCount = 0;
    for (const skillState of skillStatesQuery.data?.values() ?? []) {
      if (fsrsIsStable(skillState.srs)) {
        stableCount++;
      } else {
        if (!needsToBeIntroduced(skillState.srs, new Date())) {
          unstableCount++;
        }
      }
      totalCount++;
      if (needsToBeIntroduced(skillState.srs, new Date())) {
        needsToBeIntroducedCount++;
      }
    }
    setStats({
      stableCount,
      totalCount,
      needsToBeIntroducedCount,
      unstableCount,
    });
  }, [skillStatesQuery.data]);

  return (
    <ScrollView contentContainerClassName="py-safe-offset-4 px-safe-or-4 items-center">
      <View className="max-w-[600px] gap-4">
        {/* <View>
          <Text className="hhh-text-body">
            {JSON.stringify(stats, null, 2)}
          </Text>
        </View> */}
        <View className="flex-row gap-2">
          <View className="flex-1 items-center gap-[10px]">
            <Text className="text-xl text-body">queue items</Text>

            {data2Query.data?.items.slice(0, 100).map((skill, i) => (
              <View key={i} className="flex-col items-center">
                <SkillRefText skill={skill} context="body" />
                <Text className="hhh-text-caption">
                  {skillKindToShorthand(skillKindFromSkill(skill))}
                </Text>
              </View>
            ))}
          </View>

          <View>
            <Text className="self-center text-xl text-body">mistakes</Text>
            {allMistakes.map(([_key, value], i) => (
              <View key={i}>
                <Text className="text-body">
                  {value.hanzi} ❌{` `}
                  {`gloss` in value ? value.gloss : value.pinyin}
                </Text>
              </View>
            ))}
          </View>
          <View>
            <Text className="self-center text-xl text-body">history</Text>

            <View className="flex-col gap-2">
              {skillRatingsQuery.data?.map(([_key, value], i) => {
                const { skill, createdAt } = value;
                return (
                  <View key={i}>
                    <Text className="hhh-text-body">
                      {value.rating === Rating.Again
                        ? `❌`
                        : value.rating === Rating.Hard
                          ? `🟠`
                          : value.rating === Rating.Good
                            ? `🟡`
                            : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                              value.rating === Rating.Easy
                              ? `🟢`
                              : value.rating}
                      {` `}
                      <SkillRefText skill={skill} context="body" />:{` `}
                      {skillStatesQuery.data
                        ?.get(skill)
                        ?.srs.stability.toFixed(1)}
                      {` `}
                      {createdAt.toISOString()}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
