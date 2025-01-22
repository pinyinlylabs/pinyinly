import { ScrollView, Text, View } from "react-native";

import { RectButton2 } from "@/components/RectButton2";
import { useRizzleQuery } from "@/components/ReplicacheContext";
import fromAsync from "array-from-async";
import { differenceInCalendarDays } from "date-fns";
import { Link } from "expo-router";
import reverse from "lodash/reverse";
import sortBy from "lodash/sortBy";
import Animated, { FadeIn } from "react-native-reanimated";

export default function IndexPage() {
  const recentCharacters = useRizzleQuery(
    [`IndexPage`, `recentCharacters`],
    async (r, tx) => {
      const recentCharacters: string[] = [];
      const ratingHistory = await fromAsync(r.query.skillRating.scan(tx)).then(
        (reviews) => reverse(sortBy(reviews, (x) => x[0].createdAt.getTime())),
      );
      for (const [key, _value] of ratingHistory) {
        if (!recentCharacters.includes(key.skill.hanzi)) {
          recentCharacters.push(key.skill.hanzi);
          if (recentCharacters.length === 10) {
            break;
          }
        }
      }
      return recentCharacters;
    },
  );

  const streakQuery = useRizzleQuery(
    [`IndexPage`, `streakQuery`],
    async (r, tx) => {
      const ratingHistory = await fromAsync(r.query.skillRating.scan(tx)).then(
        (reviews) => reverse(sortBy(reviews, (x) => x[0].createdAt.getTime())),
      );

      const firstDate = ratingHistory[0]?.[0].createdAt;
      let lastDate: Date | undefined;

      for (const [{ createdAt }, _value] of ratingHistory) {
        if (
          lastDate == null ||
          differenceInCalendarDays(lastDate, createdAt) <= 1
        ) {
          lastDate = createdAt;
        } else {
          break;
        }
      }

      const streakDayCount =
        lastDate != null && firstDate != null
          ? differenceInCalendarDays(lastDate, firstDate) + 1
          : 0;

      const isActive =
        lastDate != null &&
        differenceInCalendarDays(new Date(), lastDate) === 0;

      return { streakDayCount, isActive };
    },
  );

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="pt-safe-offset-4 px-safe-or-4 items-center gap-[10px] padding-[10px]"
    >
      <View className="self-start">
        {streakQuery.data != null ? (
          <Animated.View entering={FadeIn}>
            <Text
              className={
                `font-bold text-text` +
                (streakQuery.data.isActive ? `` : ` opacity-50`)
              }
            >
              {streakQuery.data.isActive ? `🔥` : `❄️`}
              {` `}
              {streakQuery.data.streakDayCount} day streak
            </Text>
          </Animated.View>
        ) : (
          <Text className="font-bold">{` `}</Text>
        )}
      </View>

      {recentCharacters.data != null ? (
        <Animated.View entering={FadeIn} style={{ alignSelf: `stretch` }}>
          <View className="items-stretch gap-2 self-stretch">
            <View className="items-center">
              <Text className="text-2xl font-bold text-text">
                {recentCharacters.data.length > 0
                  ? `Continue learning`
                  : `Start learning`}
              </Text>

              {recentCharacters.data.length > 0 ? (
                <>
                  <Text className="text-md text-primary-9">
                    A few things from last time
                  </Text>
                  <View className="mt-2 flex-row gap-2">
                    {recentCharacters.data.map((char, i) => (
                      <View
                        key={i}
                        className="rounded border border-primary-7 bg-primary-3 p-2"
                      >
                        <Text className="text-text">{char}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text className="text-md text-primary-9">
                    There’s no time like the present
                  </Text>
                </>
              )}
            </View>

            <Link href="/learn/reviews" asChild>
              <RectButton2
                variant="filled"
                className="success-theme mt-2 self-stretch"
                accent
                textClassName="py-1"
              >
                Start
              </RectButton2>
            </Link>
          </View>
        </Animated.View>
      ) : (
        <View className="bg-[red]">
          <Text>hello</Text>
        </View>
      )}
    </ScrollView>
  );
}
