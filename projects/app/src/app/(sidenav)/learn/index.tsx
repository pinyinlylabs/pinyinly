import { targetSkillsReviewQueue } from "@/client/query";
import { Countdown } from "@/client/ui/Countdown";
import { RectButton } from "@/client/ui/RectButton";
import { useRizzleQueryPaged } from "@/client/ui/ReplicacheContext";
import type { HanziWord } from "@/data/model";
import { SkillKind } from "@/data/model";
import type { HanziWordSkill } from "@/data/rizzleSchema";
import { hanziWordFromSkill, skillKindFromSkill } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { invariant } from "@haohaohow/lib/invariant";
import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { tv } from "tailwind-variants";

export default function IndexPage() {
  const reviewQuery = useRizzleQueryPaged(
    [IndexPage.name, `recentCharacters`],
    async (r) => {
      const queue = await targetSkillsReviewQueue(r);

      return {
        dueCount: queue.dueCount,
        overDueCount: queue.overDueCount,
        dueOrOverdueCount: queue.dueCount + queue.overDueCount,
        newDueAt: queue.newDueAt,
        newOverDueAt: queue.newOverDueAt,
      };
    },
  );

  const recentHanzi = useRizzleQueryPaged(
    [IndexPage.name, `recentCharacters`],
    async (r) => {
      const recentHanziWords: HanziWord[] = [];
      const ratingHistory = await r.queryPaged.skillRating
        .byCreatedAt()
        .toArray()
        .then((x) => x.reverse());
      pushLoop: for (let [, { skill }] of ratingHistory) {
        switch (skillKindFromSkill(skill)) {
          case SkillKind.GlossToHanziWord:
          case SkillKind.HanziWordToGloss:
          case SkillKind.HanziWordToPinyin:
          case SkillKind.HanziWordToPinyinFinal:
          case SkillKind.HanziWordToPinyinInitial:
          case SkillKind.HanziWordToPinyinTone:
          case SkillKind.ImageToHanziWord:
          case SkillKind.PinyinToHanziWord: {
            skill = skill as HanziWordSkill;
            const hanziWord = hanziWordFromSkill(skill);
            if (!recentHanziWords.includes(hanziWord)) {
              recentHanziWords.push(hanziWord);
              if (recentHanziWords.length === 10) {
                break pushLoop;
              }
            }
            break;
          }

          case SkillKind.Deprecated_EnglishToRadical:
          case SkillKind.Deprecated_PinyinToRadical:
          case SkillKind.Deprecated_RadicalToEnglish:
          case SkillKind.Deprecated_RadicalToPinyin:
          case SkillKind.Deprecated:
          case SkillKind.PinyinFinalAssociation:
          case SkillKind.PinyinInitialAssociation: {
            break;
          }
        }
      }
      return recentHanziWords.map((x) => hanziFromHanziWord(x));
    },
  );

  const streakQuery = useRizzleQueryPaged(
    [IndexPage.name, `streakQuery`],
    async (r) => {
      const ratingHistory = await r.queryPaged.skillRating
        .byCreatedAt()
        .toArray()
        .then((x) => x.reverse());

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
      {recentHanzi.data == null ||
      streakQuery.data == null ||
      reviewQuery.data == null ? null : recentHanzi.isError ? (
        <View>
          <Text className="text-foreground">Oops something went wrong.</Text>
        </View>
      ) : (
        <>
          <Reanimated.View
            entering={FadeIn}
            style={{ alignSelf: `stretch`, alignItems: `center` }}
          >
            <View className={boxClass()}>
              <View className="items-stretch self-stretch">
                <View className="flex-row items-center justify-between">
                  <Text className="hhh-text-title mb-1">
                    {recentHanzi.data.length > 0
                      ? `Continue learning`
                      : `Start learning`}
                  </Text>

                  <View className="gap-1">
                    <Text
                      className={`
                        font-bold text-foreground

                        ${streakQuery.data.isActive ? `` : `opacity-50`}
                      `}
                    >
                      {streakQuery.data.isActive ? `🔥` : `❄️`}
                      {` `}
                      {streakQuery.data.streakDayCount} day streak
                    </Text>
                    <View
                      className={`
                        flex-row gap-1

                        ${
                          reviewQuery.data.dueOrOverdueCount > 0
                            ? ``
                            : `opacity-50`
                        }
                      `}
                    >
                      <Text className="font-bold text-foreground">
                        📨
                        {` `}
                        {reviewQuery.data.dueOrOverdueCount}
                        {` `}
                        {reviewQuery.data.overDueCount > 0 ? (
                          // If there are already over-due items, you should just
                          // do them immediately so there's no need to show the
                          // time, just show the count.
                          <>
                            (😡
                            {` `}
                            {reviewQuery.data.overDueCount})
                          </>
                        ) : reviewQuery.data.newOverDueAt == null ? null : (
                          // No over-due items YET, but maybe it will become
                          // over-due in a couple of minutes so show the countdown
                          // so the person doesn't wrongly procrastinate and then
                          // get over-due items.
                          <>
                            (😡
                            {` `}
                            <Countdown date={reviewQuery.data.newOverDueAt} />)
                          </>
                        )}
                        {reviewQuery.data.dueOrOverdueCount > 0 ||
                        reviewQuery.data.newDueAt == null ? (
                          // There are due items (just do them now, no need to
                          // show when the next one will come), or there's no
                          // data for when the next review is scheduled.
                          <></>
                        ) : (
                          // There's no review queue, so show when the next one
                          // is due so the user knows how long they can relax
                          // for.
                          <Countdown date={reviewQuery.data.newDueAt} />
                        )}
                      </Text>
                    </View>
                  </View>
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
                          <Text className="text-foreground">{char}</Text>
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
                  <RectButton
                    variant="filled"
                    className="theme-success mt-2 self-stretch"
                  >
                    Start
                  </RectButton>
                </Link>
              </View>
            </View>
          </Reanimated.View>

          <Reanimated.View
            entering={FadeIn}
            style={{ alignSelf: `stretch`, alignItems: `center` }}
          >
            <View className={boxClass()}>
              <Text className="hhh-text-title mb-1">History</Text>
              <Text className="hhh-text-caption mb-4">
                See your past studies, review characters and words, and
                reinforce your knowledge with spaced repetition.
              </Text>

              <Link href="/learn/history" asChild>
                <RectButton variant="filled" className="self-start">
                  Explore history
                </RectButton>
              </Link>
            </View>
          </Reanimated.View>
        </>
      )}
    </ScrollView>
  );
}

const boxClass = tv({
  base: `
    w-full overflow-hidden rounded-xl bg-primary-3 p-4

    md:max-w-[400px]
  `,
});
