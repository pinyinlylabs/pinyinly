import {
  autoCheckUserSetting,
  useUserSetting,
} from "@/client/hooks/useUserSetting";
import { useEventCallback } from "@/client/hooks/useEventCallback";
import { usePrefetchImages } from "@/client/hooks/usePrefetchImages";
import { useQuizProgress } from "@/client/hooks/useQuizProgress";
import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import { useSoundEffect } from "@/client/hooks/useSoundEffect";
import { nextQuizQuestionQuery } from "@/client/query";
import type { StackNavigationFor } from "@/client/ui/types";
import type { MistakeType, Question, UnsavedSkillRating } from "@/data/model";
import { MistakeKind, QuestionKind } from "@/data/model";
import { Rating } from "@/util/fsrs";
import { nanoid } from "@/util/nanoid";
import { invariant } from "@pinyinly/lib/invariant";
import {
  NavigationContainer,
  NavigationIndependentTree,
  useTheme,
} from "@react-navigation/native";
import type {
  StackCardInterpolatedStyle,
  StackCardInterpolationProps,
} from "@react-navigation/stack";
import {
  createStackNavigator,
  TransitionPresets,
} from "@react-navigation/stack";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "expo-router";
import React, { useEffect, useId, useRef, useState } from "react";
import { Animated as RnAnimated, Text, View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { CloseButton } from "./CloseButton";
import { Delay } from "./Delay";
import { IconImage } from "./IconImage";
import { usePostHog } from "./PostHogProvider";
import { QuizDeckHanziToPinyinQuestion } from "./QuizDeckHanziToPinyinQuestion";
import { QuizDeckOneCorrectPairQuestion } from "./QuizDeckOneCorrectPairQuestion";
import { QuizDeckToastContainer } from "./QuizDeckToastContainer";
import { QuizProgressBar } from "./QuizProgressBar";
import { QuizQueueButton } from "./QuizQueueButton";
import { RectButton } from "./RectButton";

const Stack = createStackNavigator<{
  loading: undefined;
  chill: undefined;
  question: {
    question: Question;
  };
}>();

type Navigation = StackNavigationFor<typeof Stack>;

export const QuizDeck = ({ className }: { className?: string }) => {
  const id = useId();
  const theme = useTheme();
  const navigationRef = useRef<Navigation>(undefined);
  const r = useReplicache();
  const queryClient = useQueryClient();
  const postHog = usePostHog();

  const autoCheck =
    useUserSetting(autoCheckUserSetting).value?.enabled ?? false;

  const query = nextQuizQuestionQuery(r, id);

  // The following is a bit convoluted but allows prefetching the next question
  // when the result for the previous is shown.
  const nextQuestionQuery = useRizzleQueryPaged(query);
  const nextQuestion =
    nextQuestionQuery.isSuccess && !nextQuestionQuery.isFetching
      ? nextQuestionQuery.data.question
      : null;
  const reviewQueue = nextQuestionQuery.data?.reviewQueue ?? null;

  const [question, setQuestion] = useState<Question>();
  const [toastState, setToastState] = useState<{
    correct: boolean;
    show: boolean;
  } | null>(null);

  useEffect(() => {
    if (question == null && nextQuestion != null) {
      setQuestion(nextQuestion);
    }
  }, [question, nextQuestion]);

  useEffect(() => {
    if (question != null) {
      navigationRef.current?.replace(`question`, { question });
    }
  }, [question]);

  const playSuccessSound = useSoundEffect(
    require(`@/assets/audio/sparkle.mp3`),
  );

  // The number of questions in a row correctly answered.
  const quizProgress = useQuizProgress();

  const handleNext = useEventCallback(() => {
    // Clear the current question so that we swap to the next question.
    setQuestion(undefined);
    // Clear the toast
    setToastState(null);
  });

  const handleRating = useEventCallback(
    (
      ratings: readonly UnsavedSkillRating[],
      mistakes: readonly MistakeType[],
    ) => {
      invariant(ratings.length > 0, `ratings must not be empty`);

      const success = ratings.every(({ rating }) => rating !== Rating.Again);

      postHog.capture(`question answered`, { success });

      if (success) {
        playSuccessSound();
      }

      // Show the toast
      setToastState({ correct: success, show: true });

      // If auto-check is enabled and the answer is correct, advance immediately
      if (autoCheck && success) {
        // Clear the current question immediately to start transition
        setQuestion(undefined);
      }

      const now = Date.now();

      void (async () => {
        for (const { skill, rating, durationMs } of ratings) {
          await r.mutate
            .rateSkill({
              id: nanoid(),
              now,
              skill,
              durationMs,
              rating,
            })
            .catch((error: unknown) => {
              console.error(`Could not add skill rating`, error);
            });
        }

        for (const mistake of mistakes) {
          switch (mistake.kind) {
            case MistakeKind.HanziGloss: {
              await r.mutate.saveHanziGlossMistake({
                id: nanoid(),
                now,
                hanziOrHanziWord: mistake.hanziOrHanziWord,
                gloss: mistake.gloss,
              });
              break;
            }
            case MistakeKind.HanziPinyin: {
              await r.mutate.saveHanziPinyinMistake({
                id: nanoid(),
                now,
                hanziOrHanziWord: mistake.hanziOrHanziWord,
                pinyin: mistake.pinyin,
              });
              break;
            }
            case MistakeKind.HanziPinyinInitial: {
              throw new Error(`todo: not implemented`);
            }
          }
        }

        await queryClient.invalidateQueries({ queryKey: query.queryKey });
      })().catch((error: unknown) => {
        console.error(`error in async handling in handleRating`, error);
      });

      quizProgress.recordAnswer(success);
    },
  );

  // Prefetch images used in later screens.
  usePrefetchImages(
    require(`@/assets/icons/check-circled-filled.svg`),
    require(`@/assets/icons/close-circled-filled.svg`),
  );

  return (
    <View className={className}>
      <View
        className={`mb-[20px] w-full max-w-[600px] flex-row items-center gap-3 self-center px-4`}
      >
        <CloseButton />
        <QuizProgressBar progress={quizProgress.progress} />
        <QuizQueueButton queueStats={reviewQueue} />
      </View>

      <NavigationIndependentTree>
        <NavigationContainer theme={theme} documentTitle={{ enabled: false }}>
          <Stack.Navigator
            screenOptions={{
              gestureEnabled: false,
              headerShown: false,
              animation: `slide_from_right`,
              ...TransitionPresets.SlideFromRightIOS,
              cardStyleInterpolator: horizontalCardStyleInterpolator,
            }}
            screenListeners={({ navigation }) => ({
              // Hack to get the navigation object.
              state: () => {
                navigationRef.current = navigation;
              },
            })}
          >
            <Stack.Screen
              name="loading"
              children={() => {
                return (
                  <Reanimated.View
                    entering={FadeIn}
                    className="my-auto items-center"
                  >
                    <Text className="font-karla text-lg text-caption">
                      Loading
                    </Text>
                  </Reanimated.View>
                );
              }}
            />
            <Stack.Screen
              name="chill"
              children={() => {
                return (
                  <View className="gap-2">
                    <View
                      style={{
                        flex: 1,
                        gap: 16,
                        alignItems: `center`,
                        justifyContent: `center`,
                        paddingLeft: 20,
                        paddingRight: 20,
                      }}
                    >
                      <Text className="pyly-body-title">
                        👏 You’re all caught up on your reviews!
                      </Text>
                      {/* {nextNotYetDueSkillState.isLoading ||
                      nextNotYetDueSkillState.data == null ? null : (
                        <Text className="pyly-body-caption">
                          Next review in{` `}
                          {formatDuration(
                            intervalToDuration(
                              interval(
                                new Date(),
                                nextNotYetDueSkillState.data.srs.nextReviewAt,
                              ),
                            ),
                          )}
                        </Text>
                      )} */}
                      <Link dismissTo href="/learn" asChild>
                        <RectButton>Back</RectButton>
                      </Link>
                    </View>
                  </View>
                );
              }}
            />
            <Stack.Screen
              name="question"
              children={({
                route: {
                  params: { question },
                },
              }) => {
                let screen: React.ReactNode;

                switch (question.kind) {
                  case QuestionKind.HanziWordToPinyin: {
                    screen = (
                      <QuizDeckHanziToPinyinQuestion
                        question={question}
                        onNext={handleNext}
                        onRating={handleRating}
                      />
                    );
                    break;
                  }
                  case QuestionKind.OneCorrectPair: {
                    screen = (
                      <QuizDeckOneCorrectPairQuestion
                        question={question}
                        onNext={handleNext}
                        onRating={handleRating}
                      />
                    );
                    break;
                  }
                }

                return (
                  <View className="size-full max-w-[600px] flex-1 self-center">
                    {screen}
                  </View>
                );
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </NavigationIndependentTree>

      {/* Toast shown at deck level */}
      {toastState?.show === true ? (
        <QuizDeckToastContainer>
          <View
            className={`
              flex-1 gap-[12px] overflow-hidden bg-fg-bg10 px-4 pt-3 pb-safe-offset-[84px]

              lg:mb-2 lg:rounded-xl

              ${toastState.correct ? `theme-success` : `theme-danger`}
            `}
          >
            {toastState.correct ? (
              <>
                <View className="flex-row items-center gap-[8px]">
                  <IconImage
                    size={32}
                    source={require(`@/assets/icons/check-circled-filled.svg`)}
                  />
                  <Text className="text-2xl font-bold text-fg">Nice!</Text>
                </View>
                <Delay
                  ms={1000}
                  action={() => {
                    setToastState(null);
                  }}
                />
              </>
            ) : (
              <View className="flex-row items-center gap-[8px]">
                <IconImage
                  size={32}
                  source={require(`@/assets/icons/close-circled-filled.svg`)}
                />
                <Text className="text-2xl font-bold text-fg">Incorrect</Text>
              </View>
            )}
          </View>
        </QuizDeckToastContainer>
      ) : null}
    </View>
  );
};

function horizontalCardStyleInterpolator({
  current,
  next,
  inverted,
  layouts: { screen },
}: StackCardInterpolationProps): StackCardInterpolatedStyle {
  const distance =
    screen.width >= 768
      ? 40 // on big screens sliding the whole screen across is too distracting, so instead we just do a small slide
      : screen.width;

  const translateEntering = RnAnimated.multiply(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [distance, 0],
    }),
    inverted,
  );

  const translateExiting = next
    ? RnAnimated.multiply(
        next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -distance],
        }),
        inverted,
      )
    : translateEntering;

  const opacity = next
    ? RnAnimated.subtract(1, next.progress)
    : RnAnimated.add(0, current.progress);

  return {
    cardStyle: {
      transform: [{ translateX: translateExiting }],
      opacity,
    },
  };
}
