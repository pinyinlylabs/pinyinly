import { questionsForReview2 } from "@/client/query";
import type { StackNavigationFor } from "@/client/ui/types";
import type {
  Mistake,
  Question,
  QuestionFlag,
  SkillRating,
} from "@/data/model";
import { MistakeType, QuestionType } from "@/data/model";
import { Rating } from "@/util/fsrs";
import { nanoid } from "@/util/nanoid";
import { invariant } from "@haohaohow/lib/invariant";
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
import { useQueries, useQueryClient } from "@tanstack/react-query";
import { Asset } from "expo-asset";
import { Image } from "expo-image";
import { Link } from "expo-router";
import React, { useEffect, useId, useRef } from "react";
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { Animated, Platform, Text, View } from "react-native";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { useEventCallback, useQuizProgress } from "../hooks";
import { CloseButton } from "./CloseButton";
import { QuizDeckMultipleChoiceQuestion } from "./QuizDeckMultipleChoiceQuestion";
import { QuizDeckOneCorrectPairQuestion } from "./QuizDeckOneCorrectPairQuestion";
import { QuizProgressBar2 } from "./QuizProgressBar2";
import { RectButton2 } from "./RectButton2";
import { useReplicache, useRizzleQueryPaged } from "./ReplicacheContext";
import { useSoundEffect } from "./useSoundEffect";

const Stack = createStackNavigator<{
  loading: undefined;
  chill: undefined;
  question: {
    question: Question;
    // todo remove
    flag?: QuestionFlag;
  };
}>();

type Navigation = StackNavigationFor<typeof Stack>;

export const QuizDeck = ({
  // questions,
  className,
}: {
  // questions: readonly Question[];
  className?: string;
}) => {
  const id = useId();
  const theme = useTheme();
  const navigationRef = useRef<Navigation>();
  // const [questionStateMap, setQuestionStateMap] = useState<
  //   ReadonlyMap<Question, QuestionState>
  // >(() => new Map());
  const r = useReplicache();
  const queryClient = useQueryClient();

  const questionsQueryKey = [QuizDeck.name, `quiz`, id];

  const questionsQuery = useRizzleQueryPaged(questionsQueryKey, async (r) => {
    const [question] = await questionsForReview2(r, { limit: 5 });
    return question ?? null;
  });

  const question = questionsQuery.data;

  useEffect(() => {
    // console.log(`question changed:`, question);
    if (question != null) {
      const flag: QuestionFlag | undefined =
        // attempts > 0
        //   ? { type: QuestionFlagType.PreviousMistake }
        //   :
        question.flag;
      // console.log(
      //   `navigationRef.current?.replace('question', { question, flag })`,
      //   question,
      // );
      navigationRef.current?.replace(`question`, { question, flag });
    }
  }, [question]);

  const playSuccessSound = useSoundEffect(
    require(`@/assets/audio/sparkle.mp3`),
  );

  // The number of questions in a row correctly answered.
  const quizProgress = useQuizProgress();

  // const progress = useMemo(() => {
  //   let p = 0;
  //   for (const s of questionStateMap.values()) {
  //     if (s.type === QuestionStateType.Correct) {
  //       p += 1;
  //     } else if (s.attempts > 0) {
  //       // Give a diminishing progress for each attempt.
  //       p += (Math.log(s.attempts - 0.5) + 1.9) / 8.7;
  //     }
  //   }
  //   return p / questions.length;
  // }, [questionStateMap, questions.length]);

  const handleNext = useEventCallback(() => {
    // console.log(`queryClient.invalidateQueries()`);

    // Force the next question to be fetched.
    void queryClient.invalidateQueries({ queryKey: questionsQueryKey });

    // const remainingQuestions = questions
    //   .map((q) => [q, questionStateMap.get(q)] as const)
    //   .filter(([, state]) => state?.type !== QuestionStateType.Correct);
    // const [next] = sortBy(remainingQuestions, ([, s]) => s?.attempts ?? 0);

    // if (next == null) {
    //   navigationRef.current?.replace(`results`);
    // } else {
    //   const [question, state] = next;
    //   const attempts = state?.attempts ?? 0;
    //   const flag: QuestionFlag | undefined =
    //     attempts > 0
    //       ? { type: QuestionFlagType.PreviousMistake }
    //       : question.flag;
    //   navigationRef.current?.replace(`question`, { question, flag });
    // }
  });

  const handleRating = useEventCallback(
    (_question: Question, ratings: SkillRating[], mistakes: Mistake[]) => {
      // invariant(
      //   questions.includes(question),
      //   `handleRating called with wrong question`,
      // );
      invariant(ratings.length > 0, `ratings must not be empty`);

      const success = ratings.every(({ rating }) => rating !== Rating.Again);

      if (success) {
        playSuccessSound();
      }

      const now = Date.now();

      for (const { skill, rating, durationMs } of ratings) {
        void r.mutate
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
        switch (mistake.type) {
          case MistakeType.HanziGloss: {
            void r.mutate.saveHanziGlossMistake({
              id: nanoid(),
              now,
              hanzi: mistake.hanzi,
              gloss: mistake.gloss,
            });
            break;
          }
          case MistakeType.HanziPinyin: {
            void r.mutate.saveHanziPinyinMistake({
              id: nanoid(),
              now,
              hanzi: mistake.hanzi,
              pinyin: mistake.pinyin,
            });
            break;
          }
          case MistakeType.HanziPinyinInitial: {
            throw new Error(`todo: not implemented`);
          }
        }
      }

      quizProgress.recordAnswer(success);

      // setQuestionStateMap((prev) =>
      //   readonlyMapSet(prev, question, {
      //     type: success
      //       ? QuestionStateType.Correct
      //       : QuestionStateType.Incorrect,
      //     attempts: (prev.get(question)?.attempts ?? 0) + 1,
      //   }),
      // );
    },
  );

  // Prefetch images used in later screens.
  usePrefetchImages(
    require(`@/assets/icons/check-circled-filled.svg`),
    require(`@/assets/icons/close-circled-filled.svg`),
  );

  return (
    <View className={className}>
      <View className="mb-[20px] w-full max-w-[600px] flex-row items-center gap-[24px] self-center px-[16px]">
        <CloseButton tintColor="#3C464D" />
        <QuizProgressBar2
          progress={quizProgress.progress}
          // colors={
          //   streakCount >= 2
          //     ? [`#E861F8`, `#414DF6`, `#75F076`] // streak
          //     : [`#3F4CF5`, `#3F4CF5`] // solid blue
          // }
        />
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
                // as Navigation;
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
                    <Text className="font-karla text-lg text-primary-10">
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
                      <Text className="hhh-text-title">
                        👏 You’re all caught up on your reviews!
                      </Text>
                      {/* {nextNotYetDueSkillState.isLoading ||
                      nextNotYetDueSkillState.data == null ? null : (
                        <Text className="hhh-text-caption">
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
                        <RectButton2>Back</RectButton2>
                      </Link>
                    </View>
                  </View>
                );
              }}
            />
            <Stack.Screen
              name="question"
              // initialParams={{
              //   // initial params is cached across multiple mounts, it seems like
              //   // the screen names are global? and initialParams can only be set
              //   // once?
              //   question: null,
              // }}
              children={({
                route: {
                  params: { question, flag: f },
                },
              }) => {
                // console.log(`<Stack.Screen name="question">`, question);
                const flag = f ?? question.flag;

                // invariant(
                //   question != null && questions.includes(question),
                //   `Stack.Screen called with wrong question`,
                // );

                let screen: React.ReactNode;

                switch (question.type) {
                  case QuestionType.MultipleChoice: {
                    screen = (
                      <QuizDeckMultipleChoiceQuestion
                        question={question}
                        onNext={handleNext}
                        onRating={handleRating}
                      />
                    );
                    break;
                  }
                  case QuestionType.OneCorrectPair: {
                    screen = (
                      <QuizDeckOneCorrectPairQuestion
                        question={question}
                        flag={flag}
                        onNext={handleNext}
                        onRating={handleRating}
                      />
                    );
                  }
                }

                return (
                  <View className="h-full w-full max-w-[600px] flex-1 self-center">
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

  const translateEntering = Animated.multiply(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [distance, 0],
    }),
    inverted,
  );

  const translateExiting = next
    ? Animated.multiply(
        next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -distance],
        }),
        inverted,
      )
    : translateEntering;

  const opacity = next
    ? Animated.subtract(1, next.progress)
    : Animated.add(0, current.progress);

  return {
    cardStyle: {
      transform: [{ translateX: translateExiting }],
      opacity,
    },
  };
}

function usePrefetchImages(...images: (string | number)[]) {
  return useQueries({
    queries: images.map((image) => ({
      queryKey: [usePrefetchImages.name, image],
      queryFn: () => cacheImage(image),
    })),
  });
}

function cacheImage(image: string | number) {
  if (Platform.OS === `web`) {
    const uri = typeof image === `string` ? image : Asset.fromModule(image).uri;
    return Image.prefetch(uri);
  }
  return Asset.fromModule(image).downloadAsync();
}
