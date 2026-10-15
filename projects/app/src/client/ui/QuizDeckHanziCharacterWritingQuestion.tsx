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
import { HanziWritingCanvas } from "./HanziWritingCanvas";
import { QuizDeckQuestionSkeleton } from "./QuizDeckQuestionSkeleton";
import { QuizFlagText } from "./QuizFlagText";
import type { WritingStrokePoint } from "@/util/writingStrokeGrader";

function nowMs() {
  return Date.now();
}

function pathFromPoints(points: readonly WritingStrokePoint[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(` `);
}

export function QuizDeckHanziCharacterWritingQuestion({
  question,
  onNext,
  onRating,
  onUndo,
}: {
  question: HanziCharacterWritingQuestion;
  onNext: () => void;
  onRating: (
    ratings: UnsavedSkillRating[],
    mistakes: readonly MistakeType[],
  ) => void;
  onUndo: () => void;
}) {
  const [drawnStrokes, setDrawnStrokes] = useState<WritingStrokePoint[][]>([]);
  const [grade, setGrade] = useState<HanziCharacterWritingQuestionGrade | null>(
    null,
  );
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
    onRating(result.skillRatings, emptyArray);
  };

  return (
    <QuizDeckQuestionSkeleton
      grade={grade ?? undefined}
      isUserAnswerProvided={drawnStrokes.length > 0}
      onSubmit={handleSubmit}
      onUndo={onUndo}
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
              onStrokeComplete={(points) => {
                setDrawnStrokes((strokes) => [...strokes, points]);
              }}
            >
              <line
                x1="512"
                y1="24"
                x2="512"
                y2="1000"
                stroke="#dedede"
                opacity="0.2"
                strokeWidth="4"
                strokeDasharray="12 12"
                pointerEvents="none"
              />
              <line
                x1="24"
                y1="512"
                x2="1000"
                y2="512"
                stroke="#dedede"
                opacity="0.2"
                strokeWidth="4"
                strokeDasharray="12 12"
                pointerEvents="none"
              />
              {grade == null
                ? null
                : medianPaths.map((path, index) => (
                    <path
                      key={`median:${index}`}
                      d={path}
                      fill="none"
                      stroke="#e2e2e2"
                      strokeWidth="48"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  ))}
              {drawnStrokes.map((points, index) => (
                <path
                  key={`stroke:${index}`}
                  d={pathFromPoints(points)}
                  fill="none"
                  stroke={
                    grade == null || grade.correct ? `#19aaf5` : `#ef4444`
                  }
                  strokeWidth="24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              ))}
            </HanziWritingCanvas>
          </View>
        )}
        {grade?.failure === `stroke-count` ? (
          <Text className="text-danger">
            This character has {medianPaths.length} strokes. You drew{` `}
            {drawnStrokes.length}.
          </Text>
        ) : grade?.failure === `stroke-shape` ? (
          <Text className="text-danger">
            Some strokes didn’t match. Review the guide and try again.
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
