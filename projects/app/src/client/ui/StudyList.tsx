import { useDb } from "@/client/ui/hooks/useDb";
import { groupStudyWordsByAddedDate } from "@/data/studyLists";
import { useLiveQuery } from "@tanstack/react-db";
import { format } from "date-fns/format";
import { isToday } from "date-fns/isToday";
import { isYesterday } from "date-fns/isYesterday";
import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { SkillWordRows } from "./SkillWordRows";

export function StudyList({
  showSeeAllLink = false,
  limit,
}: {
  showSeeAllLink?: boolean;
  limit?: number;
}) {
  const router = useRouter();
  const db = useDb();
  const { data: words, isLoading } = useLiveQuery(
    (q) => q.from({ word: db.studyHanziWordsCollection }),
    [db.studyHanziWordsCollection],
  );
  const groups = groupStudyWordsByAddedDate(words, limit);

  return (
    <View className="gap-6">
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="pyly-body-heading">Study ({words.length})</Text>

          {showSeeAllLink ? (
            <Pressable
              onPress={() => {
                router.push(`/skills/study`);
              }}
              className={`
                rounded-md px-2 py-1

                hover:bg-fg/5
              `}
            >
              <Text className="pyly-body-caption text-muted-fg">See all</Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <Text className="pyly-body-caption text-muted-fg">Loading...</Text>
        ) : words.length === 0 ? (
          <View className="rounded-lg bg-fg/5 p-6">
            <Text className="pyly-body text-center text-muted-fg">
              No study words yet.
            </Text>
          </View>
        ) : (
          <View className="gap-10 pt-3">
            {groups.map((group) => (
              <View key={group.date.getTime()} className="gap-3">
                <Text className="pyly-body-caption font-semibold text-muted-fg">
                  {isToday(group.date)
                    ? `Today`
                    : isYesterday(group.date)
                      ? `Yesterday`
                      : format(group.date, `MMM d, yyyy`)}
                </Text>
                <SkillWordRows
                  hanziWords={group.hanziWords}
                  sortByProgress={false}
                />
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
