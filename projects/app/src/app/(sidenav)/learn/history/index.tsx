import { useRizzleQuery } from "@/client/ui/ReplicacheContext";
import { SkillType } from "@/data/model";
import { Rating } from "@/util/fsrs";
import fromAsync from "array-from-async";
import reverse from "lodash/reverse";
import sortBy from "lodash/sortBy";
import { ScrollView, Text, View } from "react-native";

export default function HistoryPage() {
  const start = Date.now();

  const dataQuery = useRizzleQuery(
    [HistoryPage.name, `skillState`],
    async (r, tx) => {
      const result = [];
      for await (const [key, value] of r.query.skillState.byDue(tx)) {
        result.push([key, value] as const);
        if (result.length >= 50) {
          break;
        }
      }
      return result;
    },
  );

  const skillRatingsQuery = useRizzleQuery(
    [HistoryPage.name, `skillRatings`],
    async (r, tx) =>
      fromAsync(r.query.skillRating.scan(tx)).then((reviews) =>
        reverse(sortBy(reviews, (x) => x[0].createdAt.getTime())),
      ),
  );

  const renderTime = Date.now() - start;

  return (
    <ScrollView contentContainerClassName="py-safe-offset-4 px-safe-or-4 items-center">
      <View className="max-w-[600px] gap-4">
        <View className="flex-row gap-2">
          <View>
            <Text className="text-text">
              Render time {Math.round(renderTime)}ms
            </Text>
          </View>
          <View className="flex-1 items-center gap-[10px]">
            <Text className="text-xl text-text">upcoming</Text>

            {dataQuery.data?.map(([key, value], i) => (
              <View key={i}>
                <Text className="text-text">
                  {key.skill.type === SkillType.PinyinInitialAssociation
                    ? `${key.skill.initial}-`
                    : key.skill.type === SkillType.PinyinFinalAssociation
                      ? `-${key.skill.final}`
                      : key.skill.hanzi}
                  : {value.due.toISOString()}
                </Text>
              </View>
            ))}
          </View>

          <View>
            <Text className="self-center text-xl text-text">history</Text>

            {skillRatingsQuery.data?.map(([key, value], i) => (
              <View key={i}>
                <Text className="text-text">
                  {value.rating === Rating.Again
                    ? `❌`
                    : value.rating === Rating.Good
                      ? `✅`
                      : value.rating}
                  {` `}
                  {key.skill.type === SkillType.PinyinInitialAssociation
                    ? `${key.skill.initial}-`
                    : key.skill.type === SkillType.PinyinFinalAssociation
                      ? `-${key.skill.final}`
                      : key.skill.hanzi}
                  : {key.createdAt.toISOString()}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
