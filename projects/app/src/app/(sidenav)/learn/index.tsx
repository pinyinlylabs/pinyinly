import { getAllTargetSkills } from "@/client/query";
import { Countdown } from "@/client/ui/Countdown";
import { RectButton2 } from "@/client/ui/RectButton2";
import { useRizzleQueryPaged } from "@/client/ui/ReplicacheContext";
import { HanziWord, SkillType } from "@/data/model";
import { HanziWordSkill, Skill, SkillState } from "@/data/rizzleSchema";
import { hanziWordFromSkill, skillDueWindow, skillType } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { invariant } from "@haohaohow/lib/invariant";
import { add } from "date-fns/add";
import { differenceInCalendarDays } from "date-fns/differenceInCalendarDays";
import { sub } from "date-fns/sub";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { tv } from "tailwind-variants";

export default function IndexPage() {
  const reviewQuery = useRizzleQueryPaged(
    [IndexPage.name, `recentCharacters`],
    async (r) => {
      const now = new Date();
      const latestNotOverDueDate = sub(now, skillDueWindow);

      const targetSkills = new Set<Skill>(await getAllTargetSkills());

      let dueCount = 0;
      let overdueCount = 0;
      let mostDueSkill: SkillState | undefined;

      for await (const [
        ,
        skillState,
      ] of r.queryPaged.skillState.byNextReviewAt()) {
        if (!targetSkills.has(skillState.skill)) {
          continue;
        }

        if (
          mostDueSkill == null ||
          mostDueSkill.srs.nextReviewAt > skillState.srs.nextReviewAt
        ) {
          mostDueSkill = skillState;
        }
        if (skillState.srs.nextReviewAt < latestNotOverDueDate) {
          overdueCount++;
        } else if (skillState.srs.nextReviewAt <= now) {
          dueCount++;
        } else {
          break;
        }
      }

      return {
        dueCount,
        overdueCount,
        dueOrOverdueCount: dueCount + overdueCount,
        firstOverdueAt:
          mostDueSkill == null
            ? null
            : add(mostDueSkill.srs.nextReviewAt, skillDueWindow),
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
        switch (skillType(skill)) {
          case SkillType.EnglishToHanziWord:
          case SkillType.HanziWordToEnglish:
          case SkillType.HanziWordToEnglish:
          case SkillType.HanziWordToPinyinFinal:
          case SkillType.HanziWordToPinyinInitial:
          case SkillType.HanziWordToPinyinTone:
          case SkillType.ImageToHanziWord:
          case SkillType.PinyinToHanziWord: {
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

          case SkillType.Deprecated_EnglishToRadical:
          case SkillType.Deprecated_PinyinToRadical:
          case SkillType.Deprecated_RadicalToEnglish:
          case SkillType.Deprecated_RadicalToPinyin:
          case SkillType.Deprecated:
          case SkillType.PinyinFinalAssociation:
          case SkillType.PinyinInitialAssociation: {
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
          <Text className="danger-theme text-text">
            Oops something went wrong.
          </Text>
        </View>
      ) : (
        <>
          <Animated.View
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
                      className={
                        `font-bold text-text` +
                        (streakQuery.data.isActive ? `` : ` opacity-50`)
                      }
                    >
                      {streakQuery.data.isActive ? `🔥` : `❄️`}
                      {` `}
                      {streakQuery.data.streakDayCount} day streak
                    </Text>
                    <View
                      className={`flex-row gap-1 ${
                        reviewQuery.data.dueOrOverdueCount > 0
                          ? ``
                          : `opacity-50`
                      }`}
                    >
                      <Text className="font-bold text-text">
                        📨
                        {` `}
                        {reviewQuery.data.dueOrOverdueCount}
                        {reviewQuery.data.overdueCount > 0 ? (
                          <>
                            (😡
                            {` `}
                            {reviewQuery.data.overdueCount})
                          </>
                        ) : null}
                      </Text>
                      {reviewQuery.data.firstOverdueAt == null ? null : (
                        <Countdown date={reviewQuery.data.firstOverdueAt} />
                      )}
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
            </View>
          </Animated.View>

          <Animated.View
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
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
}

const boxClass = tv({
  base: `md:max-w-[400px] w-full rounded-xl bg-primary-3 px-4 py-4 overflow-hidden`,
});
