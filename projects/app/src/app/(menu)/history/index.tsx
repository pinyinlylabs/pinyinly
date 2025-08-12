import { useReplicache } from "@/client/hooks/useReplicache";
import { recentSkillRatingsQuery } from "@/client/query";
import { SkillRefText } from "@/client/ui/SkillRefText";
import { formatRelativeTime } from "@/util/date";
import { Rating } from "@/util/fsrs";
import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";

export default function HistoryPage() {
  const r = useReplicache();
  const skillRatingsQuery = useQuery(recentSkillRatingsQuery(r));

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
