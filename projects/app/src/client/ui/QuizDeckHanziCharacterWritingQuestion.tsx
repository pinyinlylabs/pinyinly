import { hanziSvgPathsQuery } from "@/client/query";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { gradeHanziCharacterWritingQuestion } from "@/data/questions/hanziCharacterWriting";
import type {
  HanziCharacterWritingQuestion,
  MistakeType,
  UnsavedSkillRating,
} from "@/data/model";
import type { HanziCharacterWritingQuestionGrade } from "@/data/questions/hanziCharacterWriting";
import { transformArphicSpaceSvgPath } from "@/util/svgFont";
import { emptyArray } from "@pinyinly/lib/collections";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HanziWritingDebug } from "./HanziWritingDebug";
import { HanziWritingCanvas } from "./HanziWritingCanvas";
import { QuizDeckQuestionSkeleton } from "./QuizDeckQuestionSkeleton";
import { QuizFlagText } from "./QuizFlagText";
import type { WritingStrokePoint } from "@/util/writingStrokeGrader";

function nowMs() {
  return Date.now();
}

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
  const [debugGeometry, setDebugGeometry] = useState<
    HanziCharacterWritingQuestionGrade[`geometry`] | null
  >(null);
  const [startTime] = useState(nowMs);
  const { data: svgData, isLoading } = useQuery(
    hanziSvgPathsQuery(question.hanzi),
  );
  const medianPaths = (svgData?.medians ?? []).map(transformArphicSpaceSvgPath);

  const handleSubmit = () => {
    if (grade != null) {
      onNext();
      return;
    }
    if (medianPaths.length === 0) {
      return;
    }

    const durationMs = nowMs() - startTime;
    const result = gradeHanziCharacterWritingQuestion(
      question,
      drawnStrokes,
      medianPaths,
      durationMs,
    );
    setGrade(result);
    setDebugGeometry(result.geometry);
    onRating(result.skillRatings, emptyArray);
  };

  return (
    <QuizDeckQuestionSkeleton
      grade={grade ?? undefined}
      isUserAnswerProvided={drawnStrokes.length > 0}
      onSubmit={handleSubmit}
      onRepeatQuestion={onRepeatQuestion}
      showIdkButton={medianPaths.length > 0}
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
        {isLoading ? (
          <Text className="text-muted-fg">Loading writing data…</Text>
        ) : medianPaths.length === 0 ? (
          <Text className="text-danger">
            Writing data is unavailable for {question.hanzi}.
          </Text>
        ) : (
          <View className="min-h-0 w-full flex-1 items-center justify-center">
            <HanziWritingCanvas
              className="aspect-square h-full max-h-full w-auto max-w-full"
              disabled={grade != null}
              guidedPaths={grade == null ? undefined : medianPaths}
              drawnStrokes={drawnStrokes}
              gradeResult={
                grade == null ? null : grade.correct ? `correct` : `incorrect`
              }
              onStrokeComplete={(points) => {
                setDrawnStrokes((strokes) => [...strokes, points]);
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
        {grade?.correct === false ? (
          <Text className="text-danger">
            Expected character: {question.hanzi}
          </Text>
        ) : null}
        {!__DEV__ || debugGeometry == null ? null : (
          <HanziWritingDebug
            geometry={debugGeometry}
            drawnStrokes={drawnStrokes}
            referencePaths={medianPaths}
            onGeometryChange={setDebugGeometry}
          />
        )}
      </View>
    </QuizDeckQuestionSkeleton>
  );
}
