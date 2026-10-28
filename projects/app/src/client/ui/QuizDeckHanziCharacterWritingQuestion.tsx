import { hanziSvgPathsQuery, wikiPayloadQuery } from "@/client/query";
import { RectButton } from "@/client/ui/RectButton";
import { ScopedVariables } from "@/client/ui/ScopedVariables";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useSoundEffect } from "@/client/ui/hooks/useSoundEffect";
import {
  gradeHanziCharacterWritingQuestion,
  createHanziCharacterWritingGradeReportJson,
} from "@/data/questions/hanziCharacterWriting";
import type {
  HanziCharacterWritingQuestion,
  MistakeType,
  UnsavedSkillRating,
} from "@/data/model";
import type { HanziCharacterWritingQuestionGrade } from "@/data/questions/hanziCharacterWriting";
import { getAudioSourcesByPinyinMap } from "@/data/pinyinSoundAudio";
import { transformArphicSpaceSvgPath } from "@/util/svgFont";
import { scheduler } from "@/util/scheduler";
import type { WritingStrokePoint } from "@/util/shapeContextGrader";
import * as Sentry from "@sentry/react-native";
import { emptyArray } from "@pinyinly/lib/collections";
import { useSuspenseQueries } from "@tanstack/react-query";
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
  onChangeAnswer,
}: {
  question: HanziCharacterWritingQuestion;
  onNext: () => void;
  onRating: (
    ratings: UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
  onChangeAnswer: () => void;
}) {
  const [drawnStrokes, setDrawnStrokes] = useState<WritingStrokePoint[][]>([]);
  const [grade, setGrade] = useState<HanziCharacterWritingQuestionGrade | null>(
    null,
  );
  const timer = useQuizTimer();
  const [{ data: svgData }, { data: wikiData }] = useSuspenseQueries({
    queries: [
      hanziSvgPathsQuery(question.hanzi),
      wikiPayloadQuery(question.hanzi),
    ],
  });
  const visuallySimilar = wikiData?.visuallySimilar ?? [];
  const similarCharacterQueries = useSuspenseQueries({
    queries: visuallySimilar.map((hanzi) => hanziSvgPathsQuery(hanzi)),
  });
  const pinyinAudioSource =
    getAudioSourcesByPinyinMap().get(question.pinyin)?.[0] ?? null;
  const playPinyinSound = useSoundEffect(pinyinAudioSource);
  const medianPaths = (svgData?.medians ?? []).map(transformArphicSpaceSvgPath);
  const similarCharacterReferences = visuallySimilar.flatMap((hanzi, index) => {
    const medians = similarCharacterQueries[index]?.data?.medians;
    return medians == null || medians.length === 0
      ? []
      : [{ hanzi, medianPaths: medians.map(transformArphicSpaceSvgPath) }];
  });
  const missingSimilarCharacter =
    visuallySimilar.find(
      (_, index) =>
        (similarCharacterQueries[index]?.data?.medians?.length ?? 0) === 0,
    ) ?? null;
  const hasMissingSimilarCharacter = missingSimilarCharacter != null;
  const canGrade = medianPaths.length > 0 && !hasMissingSimilarCharacter;

  async function gradeAnswer(): Promise<void> {
    if (!canGrade) {
      return;
    }

    const durationMs = timer.getDurationMs();
    await scheduler.yield();
    const result = gradeHanziCharacterWritingQuestion(
      question,
      drawnStrokes,
      medianPaths,
      durationMs,
      similarCharacterReferences,
    );
    setGrade(result);
    onRating(result.skillRatings, emptyArray);
    await scheduler.yield();
  }

  async function handleSubmit(): Promise<void> {
    if (grade != null) {
      onNext();
      return;
    }
    await gradeAnswer();
  }

  function reportWrongGrade() {
    if (grade == null) {
      return;
    }

    const reportJson = createHanziCharacterWritingGradeReportJson({
      question,
      grade,
      drawnStrokes,
    });
    Sentry.captureMessage(`User reported a handwriting grade`, {
      tags: {
        [`report-kind`]: `handwriting-grade`,
        [`handwriting-grade-error-type`]: grade.correct
          ? `false-positive`
          : `false-negative`,
      },
      extra: { [`handwriting-grade-report-json`]: reportJson },
    });
  }

  return (
    <QuizDeckQuestionSkeleton
      grade={grade ?? undefined}
      isUserAnswerProvided={drawnStrokes.length > 0 && canGrade}
      onSubmit={handleSubmit}
      onChangeAnswer={onChangeAnswer}
      onReportWrongGrade={
        grade == null || drawnStrokes.length === 0
          ? undefined
          : reportWrongGrade
      }
      showIdkButton={canGrade}
      skill={question.skill}
    >
      <View className="mx-auto min-h-0 w-full max-w-[560px] flex-1 gap-4">
        {question.flag == null ? null : <QuizFlagText flag={question.flag} />}
        <View className="gap-1">
          <Text className="font-sans text-xl font-bold text-fg-loud">
            Write the hanzi for “{question.gloss}”
          </Text>
          <View className="mt-2 flex-row items-center gap-3">
            {pinyinAudioSource == null ? null : (
              <ScopedVariables
                variables={{ "--color-fg": `var(--color-cyanold)` }}
              >
                <RectButton
                  accessibilityLabel="Play pronunciation"
                  variant="filled"
                  iconStart="speaker-2"
                  iconSize={16}
                  className="size-9 p-0"
                  onPressIn={playPinyinSound}
                />
              </ScopedVariables>
            )}
            <Text className="font-sans text-lg text-fg-loud">
              {question.pinyin}
            </Text>
          </View>
        </View>
        {medianPaths.length === 0 ? (
          <Text className="text-danger">
            Writing data is unavailable for {question.hanzi}.
          </Text>
        ) : null}
        {hasMissingSimilarCharacter ? (
          <Text className="text-danger">
            {`Writing data is unavailable for similar character ${missingSimilarCharacter}.`}
          </Text>
        ) : null}
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
            animateReferencePaths={grade != null}
            drawnStrokes={drawnStrokes}
            gradeResult={
              grade == null ? null : grade.correct ? `correct` : `incorrect`
            }
            onStrokeStart={() => {
              timer.pause();
            }}
            onStrokesChange={setDrawnStrokes}
            onStrokeEnd={() => {
              timer.resumeAfter(quizTimerIdleGraceMs);
            }}
          />
        </View>
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
