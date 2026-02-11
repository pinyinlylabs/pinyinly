import { historyPageCollection, historyPageData } from "@/client/query";
import { useDb } from "@/client/ui/hooks/useDb";
import { IconImage } from "@/client/ui/IconImage";
import { SkillRefText } from "@/client/ui/SkillRefText";
import { Suspense } from "@/client/ui/Suspense";
import { formatDurationShort, formatRelativeTime } from "@/util/date";
import { Rating } from "@/util/fsrs";
import { nonNullable } from "@pinyinly/lib/invariant";
import { useLiveQuery } from "@tanstack/react-db";
import { interval } from "date-fns/interval";
import { intervalToDuration } from "date-fns/intervalToDuration";
import { Text, View } from "react-native";

export default function HistoryPage() {
  "use memo";
  const db = useDb();

  const { data } = useLiveQuery(
    historyPageCollection(
      db.skillRatingCollection,
      db.hanziGlossMistakeCollection,
      db.hanziPinyinMistakeCollection,
    ),
  );

  const transformedData = historyPageData(data);

  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">History</Text>
      </View>

      <View className="gap-5">
        {transformedData.map((session, i) => (
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
            <Suspense fallback={<Text className="pyly-body">Loading…</Text>}>
              {session.groups.map((skillGroup, j) => {
                const finalRating = nonNullable(skillGroup.ratings[0]);
                const otherRatings = skillGroup.ratings.slice(1);
                return (
                  <View key={j} className="flex-row items-center gap-2">
                    <IconImage
                      size={16}
                      icon={
                        finalRating.rating === Rating.Again ? `close` : `check`
                      }
                    />
                    <Text className="pyly-body">
                      <SkillRefText skill={skillGroup.skill} />
                    </Text>
                    {otherRatings
                      .filter((rating) => rating.rating === Rating.Again)
                      .map((rating, k) => {
                        return (
                          <View
                            key={k}
                            className="flex-row items-center gap-[2px]"
                          >
                            <Text className="pyly-body text-fg-bg50">
                              ⊘
                              {rating.answer == null ? null : (
                                <>
                                  {` `}
                                  <Text className="line-through">
                                    {rating.answer}
                                  </Text>
                                </>
                              )}
                            </Text>
                          </View>
                        );
                      })}
                  </View>
                );
              })}
            </Suspense>
          </View>
        ))}
      </View>
    </View>
  );
}
