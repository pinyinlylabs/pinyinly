import { useReplicache } from "@/client/hooks/useReplicache";
import { historyPageQuery } from "@/client/query";
import { IconImage } from "@/client/ui/IconImage";
import { SkillRefText } from "@/client/ui/SkillRefText";
import { formatDurationShort, formatRelativeTime } from "@/util/date";
import { Rating } from "@/util/fsrs";
import { nonNullable } from "@pinyinly/lib/invariant";
import { useQuery } from "@tanstack/react-query";
import { interval } from "date-fns/interval";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Text, View } from "react-native";

export default function HistoryPage() {
  const r = useReplicache();
  const skillRatingsQuery2 = useQuery(historyPageQuery(r));

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">History</Text>
      </View>

      <View className="gap-5">
        {skillRatingsQuery2.data?.map((session, i) => (
          <View key={i} className="gap-2">
            <View className="flex-1 flex-row gap-4">
              <Text className="pyly-body text-fg/50">
                {formatRelativeTime(session.endTime)}
              </Text>
              <Text className="pyly-body text-fg/25">
                {formatDurationShort(
                  intervalToDuration(
                    interval(session.startTime, session.endTime),
                  ),
                )}
              </Text>
            </View>
            {session.groups.map((skillGroup, j) => {
              const finalRating = nonNullable(skillGroup.ratings[0]);
              const otherRatings = skillGroup.ratings.slice(1);
              return (
                <View key={j} className="flex-row items-center gap-2">
                  <IconImage
                    key={i}
                    size={16}
                    source={
                      finalRating.rating === Rating.Again
                        ? require(`@/assets/icons/close.svg`)
                        : require(`@/assets/icons/check.svg`)
                    }
                  />
                  <Text className="pyly-body">
                    <SkillRefText skill={skillGroup.skill} />
                  </Text>
                  {otherRatings
                    .filter((rating) => rating.rating === Rating.Again)
                    .map((_rating, k) => {
                      return (
                        <View
                          key={k}
                          className="flex-row items-center gap-[2px]"
                        >
                          <Text className="pyly-body text-fg-bg50">⊘</Text>
                        </View>
                      );
                    })}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
