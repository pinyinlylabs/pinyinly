import { useEventCallback } from "@/client/ui/hooks/useEventCallback";
import { usePostHog } from "@/client/ui/hooks/usePostHog";
import { usePrefetchImages } from "@/client/ui/hooks/usePrefetchImages";
import { useQuizProgress } from "@/client/ui/hooks/useQuizProgress";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { useSkillQueue } from "@/client/ui/hooks/useSkillQueue";
import { useSoundEffect } from "@/client/ui/hooks/useSoundEffect";
import type { MistakeType, Question, UnsavedSkillRating } from "@/data/model";
import { MistakeKind, QuestionKind } from "@/data/model";
import { generateQuestionForSkillOrThrow } from "@/data/questions";
import { Rating } from "@/util/fsrs";
import { nanoid } from "@/util/nanoid";
import { invariant } from "@pinyinly/lib/invariant";
import { Link } from "expo-router";
import React, { useEffect, useState } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import Reanimated, { FadeIn, Keyframe } from "react-native-reanimated";
import { QuizDeckHanziWordToGlossTypedQuestion } from "./QuizDeckHanziWordToGlossTypedQuestion";
import { QuizDeckHanziWordToPinyinTypedQuestion } from "./QuizDeckHanziWordToPinyinTypedQuestion";
import { QuizDeckOneCorrectPairQuestion } from "./QuizDeckOneCorrectPairQuestion";
import { QuizProgressBar } from "./QuizProgressBar";
import { QuizQueueButton } from "./QuizQueueButton";
import { RectButton } from "./RectButton";

export const QuizDeck = ({ className }: { className?: string }) => {
  const { width: screenWidth } = useWindowDimensions();
  const r = useRizzle();
  const postHog = usePostHog();

  const skillQueue = useSkillQueue();

  const [latestReviewId, setLatestReviewId] = useState<string>();
  const [question, setQuestion] = useState<Question>();
  const [questionVersion, setQuestionVersion] = useState<number>();

  // Generate a question from the first item in the queue
  useEffect(() => {
    if (skillQueue.loading) {
      return;
    }

    const { version, reviewQueue } = skillQueue;

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
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setQuestion(undefined);
      setQuestionVersion(undefined);
      return;
    }

    // Use AbortController to prevent race conditions
    const abortController = new AbortController();

    const generateQuestion = async () => {
      // Loop through queue items until we find one that can generate a question
      // (matching the original nextQuizQuestionQuery logic)
      for (const { skill, flag } of reviewQueue.items) {
        if (abortController.signal.aborted) {
          return;
        }

        try {
          const generatedQuestion = await generateQuestionForSkillOrThrow(
            skill,
            flag ?? null,
          );

          // Check if this effect was cancelled before setting state
          if (abortController.signal.aborted as boolean) {
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

  const playSuccessSound = useSoundEffect(
    require(`../../assets/audio/sparkle.mp3`),
  );

  // The number of questions in a row correctly answered.
  const quizProgress = useQuizProgress();

  const handleNext = () => {
    // Clear the current question so the next one loads when version changes
    // Keep questionVersion so we can detect when queue updates to a newer version
    setQuestion(undefined);
  };

  const handleUndo = () => {
    if (latestReviewId != null) {
      r.mutate
        .undoReview({ reviewId: latestReviewId, now: Date.now() })
        .catch((error: unknown) => {
          console.error(`Could not undo review`, error);
        });
      setLatestReviewId(undefined);
    }
    quizProgress.undo();
    if (question != null) {
      setQuestion({ ...question });
    }
  };

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
      const reviewId = nanoid();

      void (async () => {
        for (const { skill, rating, durationMs } of ratings) {
          await r.mutate
            .rateSkill({
              id: nanoid(),
              now,
              skill,
              durationMs,
              rating,
              reviewId,
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
                reviewId,
              });
              break;
            }
            case MistakeKind.HanziPinyin: {
              await r.mutate.saveHanziPinyinMistake({
                id: nanoid(),
                now,
                hanziOrHanziWord: mistake.hanziOrHanziWord,
                pinyin: mistake.pinyin,
                reviewId,
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

      setLatestReviewId(reviewId);
      quizProgress.recordAnswer(success);
    },
  );

  // Prefetch images used in later screens.
  usePrefetchImages(
    require(`../../assets/icons/check-circled-filled.svg`),
    require(`../../assets/icons/close-circled-filled.svg`),
  );

  const hasPendingReviews =
    !skillQueue.loading && skillQueue.reviewQueue.items.length > 0;

  const questionTransitionDistance =
    screenWidth >= 768 ? 40 : Math.min(screenWidth, 360);
  const questionEnterTransition = new Keyframe({
    0: {
      opacity: 0,
      transform: [{ translateX: questionTransitionDistance }],
    },
    100: {
      opacity: 1,
      transform: [{ translateX: 0 }],
    },
  }).duration(220);
  const questionExitTransition = new Keyframe({
    0: {
      opacity: 1,
      transform: [{ translateX: 0 }],
    },
    100: {
      opacity: 0,
      transform: [{ translateX: -questionTransitionDistance }],
    },
  }).duration(220);

  let screen: React.ReactNode;

  if (question != null) {
    let questionScreen: React.ReactNode;

    switch (question.kind) {
      case QuestionKind.HanziWordToGlossTyped: {
        questionScreen = (
          <QuizDeckHanziWordToGlossTypedQuestion
            question={question}
            onNext={handleNext}
            onRating={handleRating}
            onUndo={handleUndo}
          />
        );
        break;
      }
      case QuestionKind.HanziWordToPinyinTyped: {
        questionScreen = (
          <QuizDeckHanziWordToPinyinTypedQuestion
            question={question}
            onNext={handleNext}
            onRating={handleRating}
            onUndo={handleUndo}
          />
        );
        break;
      }
      case QuestionKind.OneCorrectPair: {
        questionScreen = (
          <QuizDeckOneCorrectPairQuestion
            question={question}
            onNext={handleNext}
            onRating={handleRating}
            onUndo={handleUndo}
          />
        );
        break;
      }
    }

    screen = (
      <Reanimated.View
        key={questionVersion ?? 0}
        entering={questionEnterTransition}
        exiting={questionExitTransition}
        className="size-full"
      >
        {questionScreen}
      </Reanimated.View>
    );
  } else if (hasPendingReviews) {
    screen = (
      <Reanimated.View entering={FadeIn} className="my-auto items-center">
        <Text className="font-sans text-lg text-fg-dim">Loading</Text>
      </Reanimated.View>
    );
  } else {
    screen = (
      <Reanimated.View
        entering={FadeIn}
        className="size-full justify-center gap-2"
      >
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
          <Link dismissTo href="/learn" asChild>
            <RectButton>Back</RectButton>
          </Link>
        </View>
      </Reanimated.View>
    );
  }

  return (
    <View className={className}>
      <View
        className={`mb-[20px] w-full max-w-[600px] flex-row items-center gap-3 self-center px-4`}
      >
        <QuizProgressBar progress={quizProgress.progress} />
        <QuizQueueButton />
      </View>

      <View className="size-full max-w-[600px] flex-1 self-center">
        {screen}
      </View>
    </View>
  );
};
