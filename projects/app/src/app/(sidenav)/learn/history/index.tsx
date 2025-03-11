import { hsk1SkillReview } from "@/client/query";
import {
  useReplicache,
  useRizzleQueryPaged,
} from "@/client/ui/ReplicacheContext";
import { SkillType } from "@/data/model";
import { skillTypeToShorthand } from "@/data/skills";
import { Rating } from "@/util/fsrs";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

export default function HistoryPage() {
  const r = useReplicache();

  const data2Query = useQuery({
    queryKey: [HistoryPage.name, `hsk1SkillReview`],
    queryFn: async () => {
      return await hsk1SkillReview(r);
    },
  });

  const dataQuery = useRizzleQueryPaged(
    [HistoryPage.name, `skillState`],
    async (r) => {
      const result = [];
      for await (const [key, value] of r.queryPaged.skillState.byDue()) {
        result.push([key, value] as const);
        if (result.length >= 50) {
          break;
        }
      }
      return result;
    },
  );

  const skillRatingsQuery = useRizzleQueryPaged(
    [HistoryPage.name, `skillRatings`],
    async (r) => {
      const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
      return res.reverse();
    },
  );

  return (
    <ScrollView contentContainerClassName="py-safe-offset-4 px-safe-or-4 items-center">
      <View className="max-w-[600px] gap-4">
        <View className="flex-row gap-2">
          <View className="flex-1 items-center gap-[10px]">
            <Text className="text-xl text-text">upcoming</Text>

            {dataQuery.data?.map(([_key, value], i) => {
              const { skill } = value;
              return (
                <View key={i}>
                  <Text className="text-text">
                    {skill.type === SkillType.PinyinInitialAssociation
                      ? `${skill.initial}-`
                      : skill.type === SkillType.PinyinFinalAssociation
                        ? `-${skill.final}`
                        : skill.type === SkillType.Deprecated
                          ? skillTypeToShorthand(skill.type)
                          : skill.hanziWord}
                    : {value.due.toISOString()}
                  </Text>
                </View>
              );
            })}
          </View>
          <View className="flex-1 items-center gap-[10px]">
            <Text className="text-xl text-text">upcoming2</Text>

            {data2Query.data?.map((skill, i) => (
              <View key={i} className="flex-col items-center">
                <Text className="hhh-text-body">
                  {skill.type === SkillType.PinyinInitialAssociation
                    ? `${skill.initial}-`
                    : skill.type === SkillType.PinyinFinalAssociation
                      ? `-${skill.final}`
                      : skill.type === SkillType.Deprecated
                        ? skillTypeToShorthand(skill.type)
                        : skill.hanziWord}
                </Text>
                <Text className="hhh-text-caption">
                  {skillTypeToShorthand(skill.type)}
                </Text>
              </View>
            ))}
          </View>

          <View>
            <Text className="self-center text-xl text-text">history</Text>

            {skillRatingsQuery.data?.map(([_key, value], i) => {
              const { skill, createdAt } = value;
              return (
                <View key={i}>
                  <Text className="text-text">
                    {value.rating === Rating.Again
                      ? `❌`
                      : value.rating === Rating.Good
                        ? `✅`
                        : value.rating}
                    {` `}
                    {skill.type === SkillType.PinyinInitialAssociation
                      ? `${skill.initial}-`
                      : skill.type === SkillType.PinyinFinalAssociation
                        ? `-${skill.final}`
                        : skill.type === SkillType.Deprecated
                          ? skillTypeToShorthand(skill.type)
                          : skill.hanziWord}
                    : {createdAt.toISOString()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
