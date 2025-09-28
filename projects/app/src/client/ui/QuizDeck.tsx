import { useEventCallback } from "@/client/hooks/useEventCallback";
import { usePrefetchImages } from "@/client/hooks/usePrefetchImages";
import { useQuizProgress } from "@/client/hooks/useQuizProgress";
import { useReplicache } from "@/client/hooks/useReplicache";
import { useSkillQueue } from "@/client/hooks/useSkillQueue";
import { useSoundEffect } from "@/client/hooks/useSoundEffect";
import type { StackNavigationFor } from "@/client/ui/types";
import type { MistakeType, Question, UnsavedSkillRating } from "@/data/model";
import { MistakeKind, QuestionKind } from "@/data/model";
import {
  flagForQuestion,
  generateQuestionForSkillOrThrow,
} from "@/data/questions";
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
import { Link } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated as RnAnimated, Text, View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { CloseButton } from "./CloseButton";
import { usePostHog } from "./PostHogProvider";
import { QuizDeckHanziToPinyinQuestion } from "./QuizDeckHanziToPinyinQuestion";
import { QuizDeckOneCorrectPairQuestion } from "./QuizDeckOneCorrectPairQuestion";
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
  const theme = useTheme();
  const navigationRef = useRef<Navigation>(undefined);
  const r = useReplicache();
  const postHog = usePostHog();

  const skillQueue = useSkillQueue();

  const [question, setQuestion] = useState<Question>();
  const [questionVersion, setQuestionVersion] = useState<number>();

  // Generate a question from the first item in the queue
  useEffect(() => {
    if (skillQueue.loading) {
      return;
    }

    const { version, reviewQueue, skillSrsStates } = skillQueue;

    // Don't generate if we already have a question
    if (question != null) {
      return;
    }

    // Don't generate until we have a question from a newer version
    if (questionVersion != null && version <= questionVersion) {
      return;
    }

    if (reviewQueue.items.length === 0) {
      // No items in queue, clear question and stay on loading screen
      setQuestion(undefined);
      setQuestionVersion(undefined);
      return;
    }

    // Use AbortController to prevent race conditions
    const abortController = new AbortController();

    const generateQuestion = async () => {
      // Loop through queue items until we find one that can generate a question
      // (matching the original nextQuizQuestionQuery logic)
      for (const [queueIndex, { skill }] of reviewQueue.items.entries()) {
        if (abortController.signal.aborted) {
          return;
        }

        try {
          const generatedQuestion =
            await generateQuestionForSkillOrThrow(skill);

          // Add flag if not already set (matching old nextQuizQuestionQuery logic)
          generatedQuestion.flag ??= flagForQuestion(
            queueIndex,
            reviewQueue,
            skillSrsStates,
          );

          // Check if this effect was cancelled before setting state
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (abortController.signal.aborted) {
            return;
          }
          // Ensure we're only moving forward in version (or setting initial version)
          invariant(
            questionVersion == null || version > questionVersion,
            `Queue version must increase when generating new question: ${questionVersion ?? `undefined`} -> ${version}`,
          );
          setQuestion(generatedQuestion);
          setQuestionVersion(version);

          // Successfully generated a question, exit the loop
          return;
        } catch (error_) {
          console.error(
            `Error while generating a question for skill ${JSON.stringify(skill)}`,
            error_,
          );

          // Continue to next skill in queue
          continue;
        }
      }

      // If we get here, no question could be generated for any skill
      if (!abortController.signal.aborted) {
        console.error(
          `No question found for review in queue of ${reviewQueue.items.length} items`,
        );
      }
    };

    void generateQuestion();

    // Cleanup function to abort ongoing generation when dependencies change
    return () => {
      abortController.abort();
    };
  }, [question, questionVersion, skillQueue]);

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
    // Clear the current question so the next one loads when version changes
    // Keep questionVersion so we can detect when queue updates to a newer version
    setQuestion(undefined);
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
        {skillQueue.loading ? null : (
          <QuizQueueButton queueStats={skillQueue.reviewQueue} />
        )}
      </View>

      <NavigationIndependentTree>
        <NavigationContainer theme={theme} documentTitle={{ enabled: false }}>
          <Stack.Navigator
            initialRouteName="loading"
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
