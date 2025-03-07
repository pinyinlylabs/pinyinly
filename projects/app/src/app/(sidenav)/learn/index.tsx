import { RectButton2 } from "@/client/ui/RectButton2";
import { useRizzleQuery } from "@/client/ui/ReplicacheContext";
import { HanziWord } from "@/data/model";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { invariant } from "@haohaohow/lib/invariant";
import fromAsync from "array-from-async";
import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { tv } from "tailwind-variants";

export default function IndexPage() {
  const recentHanzi = useRizzleQuery(
    [`IndexPage`, `recentCharacters`],
    async (r, tx) => {
      const recentHanziWords: HanziWord[] = [];
      const ratingHistory = (
        await fromAsync(r.query.skillRating.byCreatedAt(tx))
      ).reverse();
      for (const [, { skill }] of ratingHistory) {
        if (`hanziWord` in skill) {
          if (!recentHanziWords.includes(skill.hanziWord)) {
            recentHanziWords.push(skill.hanziWord);
            if (recentHanziWords.length === 10) {
              break;
            }
          }
        }
      }
      return recentHanziWords.map((x) => hanziFromHanziWord(x));
    },
  );

  const streakQuery = useRizzleQuery(
    [`IndexPage`, `streakQuery`],
    async (r, tx) => {
      const allSkillRatings = await fromAsync(
        r.query.skillRating.byCreatedAt(tx),
      );
      const ratingHistory = allSkillRatings.reverse();

      const streakEnd = ratingHistory[0]?.[1].createdAt;
      let streakStart: Date | undefined;

      for (const [, { createdAt }] of ratingHistory) {
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
        {recentHanzi.isLoading ? null : recentHanzi.isError ? (
          <View>
            <Text className="danger-theme text-text">
              Oops something went wrong.
            </Text>
          </View>
        ) : recentHanzi.data == null ? null : (
          <Animated.View entering={FadeIn} style={{ alignSelf: `stretch` }}>
            <View className="items-stretch self-stretch">
              <View className="flex-row items-center justify-between">
                <Text className="hhh-text-title mb-1">
                  {recentHanzi.data.length > 0
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

              {recentHanzi.data.length > 0 ? (
                <>
                  <Text className="hhh-text-caption">
                    A few things from last time
                  </Text>
                  <View className="mt-2 flex-row gap-2">
                    {recentHanzi.data.map((char, i) => (
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
