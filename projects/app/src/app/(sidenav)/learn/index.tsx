import { ScrollView, Text, View } from "react-native";

import { RectButton2 } from "@/client/ui/RectButton2";
import { useRizzleQuery } from "@/client/ui/ReplicacheContext";
import { invariant } from "@haohaohow/lib/invariant";
import fromAsync from "array-from-async";
import { differenceInCalendarDays } from "date-fns";
import { Link } from "expo-router";
import reverse from "lodash/reverse";
import sortBy from "lodash/sortBy";
import Animated, { FadeIn } from "react-native-reanimated";
import { tv } from "tailwind-variants";

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

      const streakEnd = ratingHistory[0]?.[0].createdAt;
      let streakStart: Date | undefined;

      for (const [{ createdAt }, _value] of ratingHistory) {
        invariant(
          streakStart == null || createdAt <= streakStart,
          `Expected rating history to be in descending order`,
        );
        invariant(
          streakStart == null || streakEnd == null || streakStart <= streakEnd,
          `Expected streakStart to be before streakEnd`,
        );

        if (
          streakStart == null ||
          differenceInCalendarDays(streakStart, createdAt) <= 1
        ) {
          streakStart = createdAt;
        } else {
          break;
        }
      }

      const streakDayCount =
        streakStart != null && streakEnd != null
          ? differenceInCalendarDays(streakEnd, streakStart) + 1
          : 0;

      invariant(
        streakDayCount >= 0,
        `Expected streakDayCount to be non-negative`,
      );

      const isActive =
        streakEnd != null &&
        differenceInCalendarDays(new Date(), streakEnd) === 0;

      return { streakDayCount, isActive };
    },
  );

  return (
    <ScrollView contentContainerClassName="pt-safe-offset-4 px-safe-or-4 items-center gap-[10px] padding-[10px]">
      <View className={boxClass()}>
        {recentCharacters.isLoading ? null : recentCharacters.isError ? (
          <View>
            <Text className="danger-theme text-text">
              Oops something went wrong.
            </Text>
          </View>
        ) : recentCharacters.data == null ? null : (
          <Animated.View entering={FadeIn} style={{ alignSelf: `stretch` }}>
            <View className="items-stretch self-stretch">
              <View className="flex-row items-center justify-between">
                <Text className="hhh-text-title mb-1">
                  {recentCharacters.data.length > 0
                    ? `Continue learning`
                    : `Start learning`}
                </Text>

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
                ) : null}
              </View>

              {recentCharacters.data.length > 0 ? (
                <>
                  <Text className="hhh-text-caption">
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
                  <Text className="hhh-text-caption">
                    There’s no time like the present
                  </Text>
                </>
              )}

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
        )}
      </View>

      <View className={boxClass()}>
        <Text className="hhh-text-title mb-1">Connections</Text>
        <Text className="hhh-text-caption mb-4">
          Strengthen your understanding through this interactive game that
          challenges you to make the right connections!
        </Text>

        <Link href="/learn/connections" asChild>
          <RectButton2
            variant="filled"
            className="self-start"
            accent
            textClassName="py-1 px-2"
          >
            Play connections
          </RectButton2>
        </Link>
      </View>

      <View className={boxClass()}>
        <Text className="hhh-text-title mb-1">Radicals</Text>
        <Text className="hhh-text-caption mb-4">
          Radicals are the key to recognizing and understanding characters.
          Learn them with memorable stories to boost your reading and recall.
        </Text>

        <Link href="/learn/radicals" asChild>
          <RectButton2
            variant="filled"
            className="self-start"
            accent
            textClassName="py-1 px-2"
          >
            Practice radicals
          </RectButton2>
        </Link>
      </View>

      <View className={boxClass()}>
        <Text className="hhh-text-title mb-1">HSK1</Text>
        <Text className="hhh-text-caption mb-4">
          Test your knowledge with interactive exercises designed to help you
          prepare for the HSK 1 exam with confidence.
        </Text>

        <Link href="/learn/hsk1" asChild>
          <RectButton2
            variant="filled"
            className="self-start"
            accent
            textClassName="py-1 px-2"
          >
            Practice HSK1
          </RectButton2>
        </Link>
      </View>

      <View className={boxClass()}>
        <Text className="hhh-text-title mb-1">History</Text>
        <Text className="hhh-text-caption mb-4">
          See your past studies, review characters and words, and reinforce your
          knowledge with spaced repetition.
        </Text>

        <Link href="/learn/history" asChild>
          <RectButton2
            variant="filled"
            className="self-start"
            accent
            textClassName="py-1 px-2"
          >
            Explore history
          </RectButton2>
        </Link>
      </View>
    </ScrollView>
  );
}

const boxClass = tv({
  base: `md:max-w-[400px] w-full rounded-xl bg-primary-3 px-4 py-4 overflow-hidden`,
});
