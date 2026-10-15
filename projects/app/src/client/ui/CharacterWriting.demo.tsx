import { hanziSvgPathsQuery } from "@/client/query";
import { HanziWritingCanvas } from "@/client/ui/HanziWritingCanvas";
import { RectButton } from "@/client/ui/RectButton";
import { Text } from "@/client/ui/Text";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { View } from "@/client/ui/View";
import { isHanziCharacter, splitHanziText } from "@/data/hanzi";
import type { HanziCharacter, HanziText } from "@/data/model";
import { gradeCharacterShape } from "@/util/shapeContextGrader";
import type { ShapeContextGrade } from "@/util/shapeContextGrader";
import { transformArphicSpaceSvgPath } from "@/util/svgFont";
import type { WritingStrokePoint as Point } from "@/util/writingStrokeGrader";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type WritingMode = `guided` | `free`;

function parseSingleHanzi(input: string): HanziCharacter | null {
  const chars = splitHanziText(input.trim() as HanziText);
  const char = chars.length === 1 ? chars[0] : null;
  return char != null && isHanziCharacter(char) ? char : null;
}

function getPathStartPoint(path: string): Point | null {
  const match =
    /^[Mm]\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*[, ]\s*([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)/u.exec(
      path,
    );
  if (match == null) {
    return null;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function pathFromPoints(points: readonly Point[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(` `);
}

function CharacterWriting({
  character,
  medians,
  mode,
}: {
  character: HanziCharacter;
  medians: string[];
  mode: WritingMode;
}) {
  const [currentStroke, setCurrentStroke] = useState(0);
  const [freeStrokes, setFreeStrokes] = useState<Point[][]>([]);
  const [lastGrade, setLastGrade] = useState<ShapeContextGrade | null>(null);
  const transformedMedians = medians.map(transformArphicSpaceSvgPath);
  const currentMedian = transformedMedians[currentStroke];
  const startPoint =
    currentMedian == null ? null : getPathStartPoint(currentMedian);
  const isGuided = mode === `guided`;

  function onStrokeComplete(points: Point[]) {
    const drawnPath = pathFromPoints(points);
    if (drawnPath.length > 0 && isGuided) {
      setCurrentStroke((stroke) => Math.min(stroke + 1, medians.length));
    } else if (drawnPath.length > 0) {
      const nextStrokes = [...freeStrokes, points];
      setFreeStrokes(nextStrokes);
      setLastGrade(gradeCharacterShape(nextStrokes, transformedMedians));
    }
  }

  function clearPractice() {
    setFreeStrokes([]);
    setLastGrade(null);
    setCurrentStroke(0);
  }

  return (
    <View className="w-full max-w-[560px] gap-2">
      <HanziWritingCanvas
        disabled={isGuided && currentStroke >= medians.length}
        onStrokeComplete={onStrokeComplete}
      >
        <defs>
          <marker
            id="character-writing-arrow"
            markerWidth="18"
            markerHeight="18"
            refX="9"
            refY="9"
            orient="auto"
            markerUnits="userSpaceOnUse"
            viewBox="0 0 18 18"
          >
            <path d="M 2 2 L 16 9 L 2 16 Z" fill="#19aaf5" />
          </marker>
        </defs>
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
        {isGuided
          ? transformedMedians.map((median, index) => (
              <path
                key={`ghost:${index}`}
                d={median}
                fill="none"
                stroke="#e2e2e2"
                strokeWidth="48"
                strokeLinecap="round"
                strokeLinejoin="round"
                pointerEvents="none"
              />
            ))
          : null}
        {isGuided
          ? transformedMedians
              .slice(0, currentStroke)
              .map((median, index) => (
                <path
                  key={`complete:${index}`}
                  d={median}
                  fill="none"
                  stroke="#19aaf5"
                  strokeWidth="24"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pointerEvents="none"
                />
              ))
          : null}
        {isGuided && currentMedian != null && currentStroke < medians.length ? (
          <>
            <path
              d={currentMedian}
              fill="none"
              stroke="#19aaf5"
              strokeWidth="16"
              strokeDasharray="24 20"
              strokeLinecap="round"
              markerEnd="url(#character-writing-arrow)"
              pointerEvents="none"
            />
            {startPoint == null ? null : (
              <g pointerEvents="none">
                <circle
                  cx={startPoint.x}
                  cy={startPoint.y}
                  r="48"
                  fill="#19aaf5"
                />
                <path
                  d={`M ${startPoint.x - 18} ${startPoint.y} H ${startPoint.x + 17} M ${startPoint.x + 1} ${startPoint.y - 17} L ${startPoint.x + 19} ${startPoint.y} L ${startPoint.x + 1} ${startPoint.y + 17}`}
                  fill="none"
                  stroke="white"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </>
        ) : null}
        {freeStrokes.map((stroke, index) => (
          <path
            key={`free:${index}`}
            d={pathFromPoints(stroke)}
            fill="none"
            stroke="#19aaf5"
            strokeWidth="24"
            strokeLinecap="round"
            strokeLinejoin="round"
            pointerEvents="none"
          />
        ))}
      </HanziWritingCanvas>
      <Text className="text-center text-muted-fg">
        {isGuided
          ? currentStroke >= medians.length
            ? `${character} complete`
            : `Stroke ${currentStroke + 1} of ${medians.length}`
          : `${freeStrokes.length} strokes drawn`}
      </Text>
      {!isGuided && lastGrade != null ? (
        <Text className="text-center text-muted-fg">
          Similarity {lastGrade.similarity.toFixed(3)} · residual error{` `}
          {lastGrade.residualMatchingError.toFixed(3)}
        </Text>
      ) : null}
      {!isGuided && lastGrade == null ? (
        <Text className="text-center text-muted-fg">
          Draw the character in any stroke order or direction.
        </Text>
      ) : null}
      <RectButton variant="outline" onPress={clearPractice}>
        Reset practice
      </RectButton>
    </View>
  );
}

export default function CharacterWritingDemo() {
  const [input, setInput] = useState(`好`);
  const [mode, setMode] = useState<WritingMode>(`guided`);
  const character = parseSingleHanzi(input);
  const query = useQuery(hanziSvgPathsQuery(character));
  const medians = query.data?.medians ?? [];

  return (
    <View className="w-full max-w-[720px] gap-4 p-4">
      <Text className="text-2xl font-semibold text-fg">Character writing</Text>
      <TextInputSingle
        value={input}
        onChangeText={setInput}
        placeholder="Enter one Hanzi character"
        accessibilityLabel="Hanzi character"
        autoCapitalize="none"
      />
      <View className="flex-row gap-2">
        <RectButton
          variant={mode === `guided` ? `filled` : `outline`}
          onPress={() => {
            setMode(`guided`);
          }}
        >
          Guided
        </RectButton>
        <RectButton
          variant={mode === `free` ? `filled` : `outline`}
          onPress={() => {
            setMode(`free`);
          }}
        >
          Free practice
        </RectButton>
      </View>
      {character == null ? (
        <Text className="text-muted-fg">
          Enter exactly one Hanzi character.
        </Text>
      ) : query.isLoading ? (
        <Text className="text-muted-fg">
          Loading writing data for {character}…
        </Text>
      ) : query.isError ? (
        <Text className="text-muted-fg">Could not load writing data.</Text>
      ) : medians.length === 0 ? (
        <Text className="text-muted-fg">
          No median stroke data is available for {character}.
        </Text>
      ) : (
        <CharacterWriting
          key={`${character}:${mode}`}
          character={character}
          medians={medians}
          mode={mode}
        />
      )}
    </View>
  );
}
