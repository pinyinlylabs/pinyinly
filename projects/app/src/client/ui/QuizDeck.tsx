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
import type { Href } from "expo-router";
import React, { Activity, useEffect, useState } from "react";
import { useWindowDimensions } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import Reanimated, { FadeIn, Keyframe } from "react-native-reanimated";
import { QuizDeckQuestionRenderer } from "./QuizDeckQuestionRenderer";
import { Suspense } from "./Suspense";
import { QuizProgressBar } from "./QuizProgressBar";
import { QuizQueueButton } from "./QuizQueueButton";
import { RectButton } from "./RectButton";
import type { SkillReviewQueue } from "@/data/skills";
import type { DeepReadonly } from "ts-essentials";

export const QuizDeck = ({
  className,
  title,
  backHref = `/learn`,
  emptyMessage,
}: {
  className?: string;
  title?: string;
  backHref?: Href;
  emptyMessage?: string;
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const r = useRizzle();
  const postHog = usePostHog();

  const skillQueue = useSkillQueue();

  const [latestReviewId, setLatestReviewId] = useState<string>();
  const [question, setQuestion] = useState<Question>();
  const [nextQuestion, setNextQuestion] = useState<Question>();
  const [questionSource, setQuestionSource] =
    useState<DeepReadonly<SkillReviewQueue> | null>();
  const [nextQuestionSource, setNextQuestionSource] =
    useState<DeepReadonly<SkillReviewQueue> | null>();
  const [questionCounter, setQuestionCounter] = useState(0);

  const reviewQueue = skillQueue.loading ? null : skillQueue.reviewQueue;

  // Keep a question ready after the current one. The next question is reserved
  // from the queue snapshot that produced it, even if a rating reorders the queue.
  useEffect(() => {
    if (reviewQueue == null) {
      return;
    }

    const generatingNextQuestion = question != null;
    const currentSkill =
      question == null
        ? undefined
        : question.kind === QuestionKind.OneCorrectPair
          ? question.answer.skill
          : question.skill;
    if (generatingNextQuestion && nextQuestion != null) {
      return;
    }

    const source = generatingNextQuestion ? nextQuestionSource : questionSource;
    if (reviewQueue === source) {
      return;
    }

    const abortController = new AbortController();
    const isAborted = () => abortController.signal.aborted;

    const generateQuestion = async () => {
      for (const { skill, flag } of reviewQueue.items) {
        if (isAborted()) {
          return;
        }

        if (generatingNextQuestion && skill === currentSkill) {
          continue;
        }

        try {
          const generatedQuestion = await generateQuestionForSkillOrThrow(
            skill,
            flag ?? null,
          );
          if (isAborted()) {
            return;
          }

          if (generatingNextQuestion) {
            setNextQuestion(generatedQuestion);
            setNextQuestionSource(reviewQueue);
          } else {
            setQuestion(generatedQuestion);
            setQuestionSource(reviewQueue);
            setQuestionCounter((prev) => prev + 1);
          }
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

      if (isAborted()) {
        return;
      }
      if (generatingNextQuestion) {
        setNextQuestionSource(reviewQueue);
      } else {
        setQuestionSource(reviewQueue);
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
  }, [nextQuestion, nextQuestionSource, question, questionSource, reviewQueue]);

  const playSuccessSound = useSoundEffect(
    require(`../../assets/audio/sparkle.mp3`),
  );

  // The number of questions in a row correctly answered.
  const quizProgress = useQuizProgress();

  const handleNext = () => {
    if (nextQuestion == null) {
      setQuestion(undefined);
      setQuestionSource(reviewQueue ?? questionSource);
      setNextQuestionSource(undefined);
    } else {
      setQuestion(nextQuestion);
      setQuestionSource(nextQuestionSource);
      setNextQuestion(undefined);
      setNextQuestionSource(nextQuestionSource);
      setQuestionCounter((prev) => prev + 1);
    }
  };

  const handleChangeAnswer = () => {
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
      setQuestionCounter((prev) => prev + 1);
    }
  };

  async function saveReview(
    ratings: readonly UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
    now: number,
    reviewId: string,
  ) {
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
  }

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
        await saveReview(ratings, mistakes, now, reviewId);
      })().catch((error: unknown) => {
        console.error(`error in async handling in handleRating`, error);
      });

      setLatestReviewId(reviewId);
      quizProgress.recordAnswer(success);
    },
  );

  const handleReportedRating = useEventCallback(
    (
      ratings: readonly UnsavedSkillRating[],
      mistakes: readonly MistakeType[],
    ) => {
      invariant(ratings.length > 0, `ratings must not be empty`);
      invariant(latestReviewId != null, `reported rating must have a review`);

      const previousReviewId = latestReviewId;
      const reviewId = nanoid();
      const now = Date.now();
      const correct = ratings.every(({ rating }) => rating !== Rating.Again);

      void (async () => {
        await r.mutate.undoReview({ reviewId: previousReviewId, now });
        await saveReview(ratings, mistakes, now, reviewId);
      })().catch((error: unknown) => {
        console.error(`error in async handling in handleReportedRating`, error);
      });

      setLatestReviewId(reviewId);
      quizProgress.replaceAnswer(correct);
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
    screen = (
      <Reanimated.View
        key={questionCounter}
        entering={questionEnterTransition}
        exiting={questionExitTransition}
        className="size-full"
      >
        <Suspense
          fallback={
            <Text className="my-auto text-center text-muted-fg">Loading</Text>
          }
        >
          <QuizDeckQuestionRenderer
            question={question}
            onNext={handleNext}
            onRating={handleRating}
            onReportWrongRating={handleReportedRating}
            onChangeAnswer={handleChangeAnswer}
          />
        </Suspense>
      </Reanimated.View>
    );
  } else if (skillQueue.loading || hasPendingReviews) {
    screen = (
      <Reanimated.View entering={FadeIn} className="my-auto items-center">
        <Text className="font-sans text-lg text-muted-fg">Loading</Text>
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
            {emptyMessage ?? `👏 You’re all caught up on your reviews!`}
          </Text>
          <Link dismissTo href={backHref} asChild>
            <RectButton>Back</RectButton>
          </Link>
        </View>
      </Reanimated.View>
    );
  }

  return (
    <View className={className}>
      {title == null ? null : (
        <View
          className="
            mb-3 w-full max-w-screen-sm flex-row items-center justify-between self-center px-4
          "
        >
          <Text className="pyly-body-title">{title}</Text>
          <RectButton href={backHref} variant="bare" iconStart="chevron-left">
            Back
          </RectButton>
        </View>
      )}
      <View
        className={`mb-5 w-full max-w-screen-sm flex-row items-center gap-3 self-center px-4`}
      >
        <QuizProgressBar progress={quizProgress.progress} />
        <QuizQueueButton />
      </View>

      <View className="size-full max-w-screen-sm flex-1 self-center">
        {screen}
        {nextQuestion == null ? null : (
          <Activity mode="hidden">
            <Suspense fallback={null}>
              <QuizDeckQuestionRenderer
                question={nextQuestion}
                onNext={handleNext}
                onRating={handleRating}
                onReportWrongRating={handleReportedRating}
                onChangeAnswer={handleChangeAnswer}
              />
            </Suspense>
          </Activity>
        )}
      </View>
    </View>
  );
};
