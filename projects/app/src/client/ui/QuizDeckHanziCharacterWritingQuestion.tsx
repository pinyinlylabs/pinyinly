import { hanziSvgPathsQuery } from "@/client/query";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useVisuallySimilarCharacterReferences } from "@/client/ui/hooks/useVisuallySimilarCharacterReferences";
import { gradeHanziCharacterWritingQuestion } from "@/data/questions/hanziCharacterWriting";
import type {
  HanziCharacterWritingQuestion,
  MistakeType,
  UnsavedSkillRating,
} from "@/data/model";
import type { HanziCharacterWritingQuestionGrade } from "@/data/questions/hanziCharacterWriting";
import { transformArphicSpaceSvgPath } from "@/util/svgFont";
import type { WritingStrokePoint } from "@/util/writingStrokeGrader";
import { emptyArray } from "@pinyinly/lib/collections";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HanziWritingCanvas } from "./HanziWritingCanvas";
import { QuizDeckQuestionSkeleton } from "./QuizDeckQuestionSkeleton";
import { QuizFlagText } from "./QuizFlagText";
import {
  quizTimerIdleGraceMs,
  useQuizTimer,
} from "@/client/ui/hooks/useQuizTimer";

export function QuizDeckHanziCharacterWritingQuestion({
  question,
  onNext,
  onRating,
  onRepeatQuestion,
}: {
  question: HanziCharacterWritingQuestion;
  onNext: () => void;
  onRating: (
    ratings: UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
  onRepeatQuestion: () => void;
}) {
  const [drawnStrokes, setDrawnStrokes] = useState<WritingStrokePoint[][]>([]);
  const [grade, setGrade] = useState<HanziCharacterWritingQuestionGrade | null>(
    null,
  );
  const timer = useQuizTimer();
  const { data: svgData, isLoading } = useQuery(
    hanziSvgPathsQuery(question.hanzi),
  );
  const visuallySimilarData = useVisuallySimilarCharacterReferences(
    question.hanzi,
  );
  const medianPaths = (svgData?.medians ?? []).map(transformArphicSpaceSvgPath);
  const similarCharacterReferences = visuallySimilarData.references;
  const isSimilarCharacterDataLoading = visuallySimilarData.isLoading;
  const missingSimilarCharacter = visuallySimilarData.missingCharacter ?? null;
  const hasMissingSimilarCharacter = missingSimilarCharacter != null;

  const handleSubmit = () => {
    if (grade != null) {
      onNext();
      return;
    }
    if (
      medianPaths.length === 0 ||
      isSimilarCharacterDataLoading ||
      visuallySimilarData.hasWikiError ||
      missingSimilarCharacter != null
    ) {
      return;
    }

    const durationMs = timer.getDurationMs();
    const result = gradeHanziCharacterWritingQuestion(
      question,
      drawnStrokes,
      medianPaths,
      durationMs,
      similarCharacterReferences,
    );
    setGrade(result);
    onRating(result.skillRatings, emptyArray);
  };

  return (
    <QuizDeckQuestionSkeleton
      grade={grade ?? undefined}
      isUserAnswerProvided={drawnStrokes.length > 0}
      onSubmit={handleSubmit}
      onRepeatQuestion={onRepeatQuestion}
      showIdkButton={
        medianPaths.length > 0 &&
        !isSimilarCharacterDataLoading &&
        !visuallySimilarData.hasWikiError &&
        missingSimilarCharacter == null
      }
      skill={question.skill}
    >
      <View className="mx-auto min-h-0 w-full max-w-[560px] flex-1 gap-4">
        {question.flag == null ? null : <QuizFlagText flag={question.flag} />}
        <View className="gap-1">
          <Text className="font-sans text-xl font-bold text-fg-loud">
            Write the character for
          </Text>
          <Text className="font-sans text-2xl font-semibold text-fg">
            {question.gloss}
          </Text>
          <Text className="font-sans text-lg text-muted-fg">
            {question.pinyin}
          </Text>
        </View>
        {isLoading || isSimilarCharacterDataLoading ? (
          <Text className="text-muted-fg">Loading writing data…</Text>
        ) : medianPaths.length === 0 ? (
          <Text className="text-danger">
            Writing data is unavailable for {question.hanzi}.
          </Text>
        ) : visuallySimilarData.hasWikiError ? (
          <Text className="text-danger">
            Could not load similar-character data for {question.hanzi}.
          </Text>
        ) : hasMissingSimilarCharacter ? (
          <Text className="text-danger">
            {`Writing data is unavailable for similar character ${missingSimilarCharacter}.`}
          </Text>
        ) : (
          <View
            className="
              -mx-4 min-h-0 w-[calc(100%+2rem)] flex-1 items-center justify-center

              sm:mx-0 sm:w-full
            "
          >
            <HanziWritingCanvas
              className="
                size-full max-h-full

                sm:aspect-square sm:w-auto sm:max-w-full
              "
              disabled={grade != null}
              guidedPaths={grade == null ? undefined : medianPaths}
              drawnStrokes={drawnStrokes}
              gradeResult={
                grade == null ? null : grade.correct ? `correct` : `incorrect`
              }
              onStrokeStart={() => {
                timer.pause();
              }}
              onStrokeComplete={(points) => {
                setDrawnStrokes((strokes) => [...strokes, points]);
              }}
              onStrokeEnd={() => {
                timer.resumeAfter(quizTimerIdleGraceMs);
              }}
            />
          </View>
        )}
        {grade?.failure === `shape` ? (
          <Text className="text-danger">
            The overall shape does not match closely enough yet. Review the
            guide and try again.
          </Text>
        ) : null}
        {grade?.failure === `contrastive` ? (
          <Text className="text-danger">
            A visually similar character matched at least as closely. Check the
            distinguishing strokes and try again.
          </Text>
        ) : null}
        {grade?.correct === false ? (
          <Text className="text-danger">
            Expected character: {question.hanzi}
          </Text>
        ) : null}
      </View>
    </QuizDeckQuestionSkeleton>
  );
}
