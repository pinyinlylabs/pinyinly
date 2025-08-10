import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import { SkillRefText } from "@/client/ui/SkillRefText";
import { formatRelativeTime } from "@/util/date";
import { Rating } from "@/util/fsrs";
import { Text, View } from "react-native";

export default function HistoryPage() {
  const skillRatingsQuery = useRizzleQueryPaged(
    [HistoryPage.name, `skillRatings`],
    async (r) => {
      const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
      const recent = res.slice(-100);
      recent.reverse();
      return recent;
    },
  );

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">History</Text>
      </View>
      <View className="gap-2">
        {skillRatingsQuery.data?.map(([_key, value], i) => {
          const { skill, createdAt } = value;
          return (
            <View key={i}>
              <Text className="pyly-body">
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
                <SkillRefText skill={skill} />:{` `}
                {` `}
                {formatRelativeTime(createdAt)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
