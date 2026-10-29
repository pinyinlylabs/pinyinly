import { intersperse } from "@/client/react";
import { splitHanziText } from "@/data/hanzi";
import { MistakeKind, QuestionFlagKind } from "@/data/model";
import type {
  HanziWordToGlossTypedQuestion,
  MistakeType,
  UnsavedSkillRating,
} from "@/data/model";
import { gradeHanziToGlossTypedQuestion } from "@/data/questions/hanziWordToGlossTyped";
import type { HanziToGlossTypedQuestionRating } from "@/data/questions/hanziWordToGlossTyped";
import { computeSkillRating, hanziWordFromSkill } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary";
import { Rating } from "@/util/fsrs";
import { emptyArray } from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";
import * as Sentry from "@sentry/react-native";
import { useRef, useState } from "react";
import { useQuizTimer } from "@/client/ui/hooks/useQuizTimer";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { QuizFlagText } from "./QuizFlagText";
import { QuizDeckQuestionSkeleton } from "./QuizDeckQuestionSkeleton";
import { TextAnswerInputSingle } from "./TextAnswerInputSingle";
import { ratingToInputState } from "./TextAnswerInputSingle.utils";

export function QuizDeckHanziWordToGlossTypedQuestion({
  noAutoFocus = true,
  question,
  onNext,
  onRating,
  onReportWrongRating,
  onChangeAnswer,
}: {
  noAutoFocus?: boolean;
  question: HanziWordToGlossTypedQuestion;
  onNext: () => void;
  onRating: (
    ratings: UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
  onReportWrongRating?: (
    ratings: readonly UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
  onChangeAnswer: () => void;
}) {
  const { skill, flag, bannedMeaningPrimaryGlossHint } = question;

  const userAnswerRef = useRef(``);
  const [isUserAnswerEmpty, setIsUserAnswerEmpty] = useState(true);
  const [rating, setRating] = useState<HanziToGlossTypedQuestionRating>();
  const [hasReportedRating, setHasReportedRating] = useState(false);

  const timer = useQuizTimer();
  const hanziWord = hanziWordFromSkill(skill);
  const hanziCharacters = splitHanziText(hanziFromHanziWord(hanziWord));

  const submit = () => {
    // First press checks your answer; the next one moves to the next question.
    if (rating == null) {
      const durationMs = timer.getDurationMs();

      const questionRating = gradeHanziToGlossTypedQuestion(
        question,
        userAnswerRef.current,
        durationMs,
      );

      setRating(questionRating);
      onRating(
        questionRating.skillRatings,
        questionRating.correct ? emptyArray : questionRating.mistakes,
      );
    } else {
      onNext();
    }
  };

  const reportWrongRating = () => {
    if (rating == null || hasReportedRating) {
      return;
    }

    const answer = userAnswerRef.current;
    const errorType = rating.correct ? `false-positive` : `false-negative`;
    Sentry.captureMessage(`User reported a meaning rating`, {
      tags: {
        [`report-kind`]: `meaning-rating`,
        [`meaning-rating-error-type`]: errorType,
      },
      extra: {
        [`meaning-rating-report`]: {
          hanzi: hanziFromHanziWord(hanziWord),
          answer,
        },
      },
    });

    const originalSkillRating = nonNullable(rating.skillRatings[0]);
    const correctedRating = computeSkillRating({
      skill: originalSkillRating.skill,
      correct: !rating.correct,
      durationMs: originalSkillRating.durationMs,
    });
    const mistakes: MistakeType[] = rating.correct
      ? [
          {
            kind: MistakeKind.HanziGloss,
            hanziOrHanziWord: hanziWord,
            gloss: answer,
          },
        ]
      : [];
    onReportWrongRating?.([correctedRating], mistakes);
    setHasReportedRating(true);

    setRating(
      rating.correct
        ? {
            correct: false,
            rating: Rating.Again,
            skillRatings: [correctedRating],
            expectedAnswer: nonNullable(
              question.answers.find(({ skill }) => skill === question.skill)
                ?.glosses[0],
            ),
            mistakes,
          }
        : {
            correct: true,
            rating: correctedRating.rating,
            skillRatings: [correctedRating],
          },
    );
  };

  return (
    <QuizDeckQuestionSkeleton
      rating={rating}
      isUserAnswerProvided={!isUserAnswerEmpty}
      onSubmit={submit}
      onChangeAnswer={onChangeAnswer}
      onReportWrongRating={
        rating == null || isUserAnswerEmpty || hasReportedRating
          ? undefined
          : reportWrongRating
      }
      showIdkButton
      skill={skill}
    >
      <View
        className={
          // 200px is the space left above a text input on mobile when the
          // on-screen keyboard is open (e.g. on iOS). By setting it 200px it
          // means only this element will remain visible when the keyboard is
          // open. It creates a clean look by completely hiding the content above
          // it.
          `h-50 justify-between`
        }
      >
        <View>
          {flag == null ? null : <QuizFlagText flag={flag} />}
          <View>
            <Text className="font-sans text-xl font-bold text-fg-loud">
              {flag?.kind === QuestionFlagKind.OtherAnswer
                ? `What is another meaning?`
                : `What does this mean?`}
            </Text>
          </View>
        </View>
        <View className="flex-row justify-center gap-2 pb-3">
          {hanziCharacters.map((hanzi, i) => {
            return (
              <View className="items-center gap-2" key={i}>
                <Text className="font-sans text-[80px] font-medium text-fg-loud">
                  {hanzi}
                </Text>
              </View>
            );
          })}
        </View>
        <View
          // Invisible element at the bottom so that the `justify-between`
          // applys space at the bottom too, whilst still keeping this whole
          // thing at 200px.
          className="h-0"
        />
      </View>
      <TextAnswerInputSingle
        autoFocus={!noAutoFocus}
        editable={rating == null}
        onChangeValue={(text) => {
          userAnswerRef.current = text.trim();
          setIsUserAnswerEmpty(text.trim().length === 0);
        }}
        hintText={
          bannedMeaningPrimaryGlossHint.length > 0 ? (
            <>
              You have already answered{` `}
              {intersperse(
                bannedMeaningPrimaryGlossHint.map((gloss, i) => (
                  <Text className="pyly-bold" key={i}>
                    {gloss}
                  </Text>
                )),
                <Text> and </Text>,
              )}
              .
            </>
          ) : undefined
        }
        onSubmit={submit}
        state={ratingToInputState(isUserAnswerEmpty, rating?.rating)}
        placeholder="Type in English"
        autoCorrect
      />
    </QuizDeckQuestionSkeleton>
  );
}
