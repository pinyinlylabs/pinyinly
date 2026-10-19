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
import type { WritingStrokePoint } from "@/util/shapeContextGrader";
import { emptyArray } from "@pinyinly/lib/collections";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { HanziWritingDebug } from "./HanziWritingDebug";
import { HanziWritingCanvas } from "./HanziWritingCanvas";
import { QuizDeckQuestionSkeleton } from "./QuizDeckQuestionSkeleton";
import { QuizFlagText } from "./QuizFlagText";

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
  const { data: svgData, isLoading: isSvgLoading } = useQuery(
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

    const durationMs = nowMs() - startTime;
    const result = gradeHanziCharacterWritingQuestion(
      question,
      drawnStrokes,
      medianPaths,
      durationMs,
      similarCharacterReferences,
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
        {isSvgLoading || isSimilarCharacterDataLoading ? (
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
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray="12 12"
                pointerEvents="none"
              />
              <line
                x1="24"
                y1="512"
                x2="1000"
                y2="512"
                stroke="currentColor"
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
        {grade != null && grade.similarCharacterGrades.length > 0 ? (
          <Text className="text-muted-fg">
            Similarity: {question.hanzi} {grade.geometry.similarity.toFixed(3)}
            {grade.similarCharacterGrades.map(
              ({ hanzi, geometry }) =>
                ` · ${hanzi} ${geometry.similarity.toFixed(3)}`,
            )}
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
