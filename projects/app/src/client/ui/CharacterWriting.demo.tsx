import { hanziSvgPathsQuery } from "@/client/query";
import { CopyToClipboardButton } from "@/client/ui/CopyToClipboardButton";
import { HanziWritingCanvas } from "@/client/ui/HanziWritingCanvas";
import { HanziWritingDebug } from "@/client/ui/HanziWritingDebug";
import { ButtonGroup } from "@/client/ui/ButtonGroup";
import { RectButton } from "@/client/ui/RectButton";
import { Text } from "@/client/ui/Text";
import { TextInputMulti } from "@/client/ui/TextInputMulti";
import { TextInputSingle } from "@/client/ui/TextInputSingle";
import { View } from "@/client/ui/View";
import { useVisuallySimilarCharacterReferences } from "@/client/ui/hooks/useVisuallySimilarCharacterReferences";
import { isHanziCharacter, splitHanziText } from "@/data/hanzi";
import type { HanziCharacter, HanziText } from "@/data/model";
import {
  hanziCharacterWritingSimilarityThreshold,
  gradeSimilarCharacters,
  isHanziCharacterWritingAccepted,
} from "@/data/questions/hanziCharacterWriting";
import type { SimilarCharacterReference } from "@/data/questions/hanziCharacterWriting";
import { gradeCharacterShape } from "@/util/shapeContextGrader";
import type {
  ShapeContextGrade,
  ShapeContextOptions,
  WritingStrokePoint as Point,
} from "@/util/shapeContextGrader";
import type { ShapeContextGraderExample } from "@/util/shapeContextGraderExample";
import {
  decodeShapeContextStrokes,
  encodeShapeContextStrokes,
  parseShapeContextGraderExampleJson,
  shapeContextGraderExampleCharacter,
  serializeShapeContextGraderExample,
  shapeContextGraderExampleFragment,
} from "@/util/shapeContextGraderExample";
import { transformArphicSpaceSvgPath } from "@/util/svgFont";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

type WritingMode = `guided` | `free`;
type DemoMode = WritingMode | `import`;

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
  referencePaths,
  visuallySimilarReferences,
  mode,
  initialExample,
  onReset,
}: {
  character: HanziCharacter;
  referencePaths: string[];
  visuallySimilarReferences: SimilarCharacterReference[];
  mode: WritingMode;
  initialExample?: ShapeContextGraderExample;
  onReset: () => void;
}) {
  const [currentStroke, setCurrentStroke] = useState(0);
  const [freeStrokes, setFreeStrokes] = useState<Point[][]>(
    initialExample == null
      ? []
      : decodeShapeContextStrokes(initialExample.drawnStrokes),
  );
  const [exampleId, setExampleId] = useState<string | null>(
    initialExample?.id ?? null,
  );
  const [gradeOptions, setGradeOptions] = useState<
    ShapeContextOptions | undefined
  >(initialExample?.options);
  const [debugCharacter, setDebugCharacter] = useState<HanziCharacter | null>(
    null,
  );
  const [lastGrade, setLastGrade] = useState<ShapeContextGrade | null>(() =>
    freeStrokes.length === 0
      ? null
      : gradeCharacterShape(freeStrokes, referencePaths, gradeOptions),
  );
  const visuallySimilarGrades =
    lastGrade == null
      ? []
      : gradeSimilarCharacters(
          freeStrokes,
          visuallySimilarReferences,
          lastGrade.options,
          lastGrade.sampleCount,
        );
  const isAccepted =
    lastGrade != null &&
    isHanziCharacterWritingAccepted(lastGrade, visuallySimilarGrades);
  const debugSimilarGrade = visuallySimilarGrades.find(
    ({ hanzi }) => hanzi === debugCharacter,
  );
  const debugReference = visuallySimilarReferences.find(
    ({ hanzi }) => hanzi === debugCharacter,
  );
  const debugGeometry = debugSimilarGrade?.geometry ?? lastGrade;
  const debugReferencePaths = debugReference?.medianPaths ?? referencePaths;
  const currentMedian = referencePaths[currentStroke];
  const startPoint =
    currentMedian == null ? null : getPathStartPoint(currentMedian);
  const isGuided = mode === `guided`;

  function onStrokeComplete(points: Point[]) {
    const drawnPath = pathFromPoints(points);
    if (drawnPath.length > 0 && isGuided) {
      setCurrentStroke((stroke) => Math.min(stroke + 1, referencePaths.length));
    } else if (drawnPath.length > 0) {
      const nextStrokes = [...freeStrokes, points];
      const now = new Date();
      const timestamp = [
        now.getFullYear().toString().padStart(4, `0`),
        (now.getMonth() + 1).toString().padStart(2, `0`),
        now.getDate().toString().padStart(2, `0`),
        now.getHours().toString().padStart(2, `0`),
        now.getMinutes().toString().padStart(2, `0`),
        now.getSeconds().toString().padStart(2, `0`),
      ].join(``);
      setExampleId(exampleId ?? `${character}-${timestamp}`);
      setFreeStrokes(nextStrokes);
      setLastGrade(
        gradeCharacterShape(nextStrokes, referencePaths, gradeOptions),
      );
    }
  }

  function undoLastPath() {
    if (isGuided) {
      setCurrentStroke((stroke) => Math.max(stroke - 1, 0));
      return;
    }

    const nextStrokes = freeStrokes.slice(0, -1);
    setFreeStrokes(nextStrokes);
    setLastGrade(
      nextStrokes.length === 0
        ? null
        : gradeCharacterShape(nextStrokes, referencePaths, gradeOptions),
    );
  }

  function clearPractice() {
    setFreeStrokes([]);
    setExampleId(null);
    setLastGrade(null);
    setCurrentStroke(0);
    onReset();
  }

  return (
    <View className="w-full max-w-[560px] gap-2">
      <HanziWritingCanvas
        disabled={isGuided && currentStroke >= referencePaths.length}
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
        {isGuided
          ? referencePaths.map((median, index) => (
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
          ? referencePaths
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
        {isGuided &&
        currentMedian != null &&
        currentStroke < referencePaths.length ? (
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
          ? currentStroke >= referencePaths.length
            ? `${character} complete`
            : `Stroke ${currentStroke + 1} of ${referencePaths.length}`
          : `${freeStrokes.length} strokes drawn`}
      </Text>
      {!isGuided && lastGrade != null ? (
        <Text
          className={`
            text-center font-semibold

            ${isAccepted ? `text-success` : `text-danger`}
          `}
        >
          {isAccepted ? `Accepted` : `Not accepted`}
          {` · similarity ${lastGrade.similarity.toFixed(3)} / threshold ${hanziCharacterWritingSimilarityThreshold.toFixed(2)}`}
        </Text>
      ) : null}
      {!isGuided && lastGrade != null && exampleId != null ? (
        <>
          <Text className="text-center text-muted-fg">
            Similarity {lastGrade.similarity.toFixed(3)} · residual error{` `}
            {lastGrade.residualMatchingError.toFixed(3)}
          </Text>
          {visuallySimilarGrades.map(({ hanzi, geometry }) => (
            <Text key={hanzi} className="text-center text-muted-fg">
              {hanzi} similarity {geometry.similarity.toFixed(3)}
            </Text>
          ))}
          <View className="gap-2 rounded-lg border border-border p-3">
            <Text className="font-semibold text-fg">
              Regression test example
            </Text>
            <Text className="text-sm text-muted-fg">
              Add this case to the positive or negative examples in
              test/util/shapeContextGrader.test.ts, as appropriate.
            </Text>
            <Text className="text-sm text-muted-fg">ID: {exampleId}</Text>
            <View className="flex-row items-center justify-between gap-2">
              <View className="flex-row items-center gap-2">
                <Text className="text-fg">Copy JSON</Text>
                <CopyToClipboardButton
                  text={serializeShapeContextGraderExample({
                    id: exampleId,
                    drawnStrokes: encodeShapeContextStrokes(freeStrokes),
                    options: lastGrade.options,
                  })}
                />
                <RectButton
                  variant="outline"
                  onPress={() => {
                    const url = new URL(window.location.href);
                    url.pathname = `${url.pathname.slice(0, url.pathname.lastIndexOf(`/`))}/HanziWritingDebugViewer`;
                    url.search = ``;
                    url.hash = shapeContextGraderExampleFragment({
                      id: exampleId,
                      drawnStrokes: encodeShapeContextStrokes(freeStrokes),
                      options: lastGrade.options,
                    });
                    window.location.assign(url.href);
                  }}
                >
                  Open debug view
                </RectButton>
              </View>
            </View>
          </View>
          {visuallySimilarGrades.length === 0 ? null : (
            <View className="gap-2">
              <Text className="font-semibold text-fg">Debug reference</Text>
              <ButtonGroup className="flex-wrap">
                <ButtonGroup.Button
                  variant={debugSimilarGrade == null ? `filled` : `outline`}
                  onPress={() => {
                    setDebugCharacter(null);
                  }}
                >
                  {character} (target)
                </ButtonGroup.Button>
                {visuallySimilarGrades.map(({ hanzi }) => (
                  <ButtonGroup.Button
                    key={hanzi}
                    variant={debugCharacter === hanzi ? `filled` : `outline`}
                    onPress={() => {
                      setDebugCharacter(hanzi);
                    }}
                  >
                    {hanzi}
                  </ButtonGroup.Button>
                ))}
              </ButtonGroup>
            </View>
          )}
          {debugGeometry == null ? null : (
            <HanziWritingDebug
              key={debugCharacter ?? character}
              geometry={debugGeometry}
              drawnStrokes={freeStrokes}
              referencePaths={debugReferencePaths}
              onGeometryChange={(geometry) => {
                setGradeOptions(geometry.options);
                setLastGrade(
                  gradeCharacterShape(
                    freeStrokes,
                    referencePaths,
                    geometry.options,
                    geometry.sampleCount,
                  ),
                );
              }}
            />
          )}
        </>
      ) : null}
      {!isGuided && lastGrade == null ? (
        <Text className="text-center text-muted-fg">
          Draw the character in any stroke order or direction.
        </Text>
      ) : null}
      <View className="flex-row gap-2">
        <RectButton
          variant="outline"
          onPress={undoLastPath}
          disabled={isGuided ? currentStroke === 0 : freeStrokes.length === 0}
        >
          Undo
        </RectButton>
        <RectButton variant="outline" onPress={clearPractice}>
          Reset practice
        </RectButton>
      </View>
    </View>
  );
}

export default function CharacterWritingDemo() {
  const [input, setInput] = useState(`好`);
  const [mode, setMode] = useState<DemoMode>(`guided`);
  const [importText, setImportText] = useState(``);
  const [importError, setImportError] = useState<string | null>(null);
  const [loadedExample, setLoadedExample] =
    useState<ShapeContextGraderExample | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const character = parseSingleHanzi(
    loadedExample == null
      ? input
      : shapeContextGraderExampleCharacter(loadedExample),
  );
  const query = useQuery(hanziSvgPathsQuery(character));
  const visuallySimilarData = useVisuallySimilarCharacterReferences(character);
  const referencePaths = (query.data?.medians ?? []).map(
    transformArphicSpaceSvgPath,
  );
  const visuallySimilarReferences = visuallySimilarData.references;

  function loadExample() {
    try {
      const example = parseShapeContextGraderExampleJson(importText);
      setLoadedExample(example);
      setInput(shapeContextGraderExampleCharacter(example));
      setMode(`free`);
      setLoadRevision((revision) => revision + 1);
      setImportError(null);
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : `Could not load test case`,
      );
    }
  }

  return (
    <View className="w-full max-w-[720px] gap-4 p-4">
      <TextInputSingle
        value={input}
        onChangeText={(value) => {
          setInput(value);
          if (loadedExample != null) {
            setLoadedExample(null);
            setLoadRevision((revision) => revision + 1);
          }
        }}
        placeholder="Enter one Hanzi character"
        accessibilityLabel="Hanzi character"
        autoCapitalize="none"
      />
      <View className="flex-row items-center justify-between">
        <ButtonGroup>
          <ButtonGroup.Button
            variant={mode === `guided` ? `filled` : `outline`}
            onPress={() => {
              setMode(`guided`);
            }}
          >
            Guided
          </ButtonGroup.Button>
          <ButtonGroup.Button
            variant={mode === `free` ? `filled` : `outline`}
            onPress={() => {
              setMode(`free`);
            }}
          >
            Free practice
          </ButtonGroup.Button>
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroup.Button
            variant={mode === `import` ? `filled` : `outline`}
            onPress={() => {
              setMode(`import`);
              setImportError(null);
            }}
          >
            Import
          </ButtonGroup.Button>
        </ButtonGroup>
      </View>
      {mode === `import` ? (
        <View className="gap-2">
          <TextInputMulti
            value={importText}
            onChangeText={setImportText}
            placeholder="Paste exported JSON here"
            accessibilityLabel="Test case JSON"
            numberOfLines={4}
            style={{ minHeight: 100 }}
          />
          <RectButton
            variant="outline"
            onPress={loadExample}
            disabled={importText.length === 0}
          >
            Load test case
          </RectButton>
          {importError == null ? null : (
            <Text className="text-danger">{importError}</Text>
          )}
        </View>
      ) : null}
      {mode === `import` ? null : character == null ? (
        <Text className="text-muted-fg">
          Enter exactly one Hanzi character.
        </Text>
      ) : query.isLoading || visuallySimilarData.isLoading ? (
        <Text className="text-muted-fg">
          Loading writing data for {character}…
        </Text>
      ) : query.isError ? (
        <Text className="text-muted-fg">Could not load writing data.</Text>
      ) : visuallySimilarData.hasWikiError ? (
        <Text className="text-danger">
          Could not load visually similar character data for {character}.
        </Text>
      ) : visuallySimilarData.missingCharacter ? (
        <Text className="text-danger">
          {`Writing data is unavailable for visually similar character ${visuallySimilarData.missingCharacter}.`}
        </Text>
      ) : referencePaths.length === 0 ? (
        <Text className="text-muted-fg">
          No median stroke data is available for {character}.
        </Text>
      ) : (
        <CharacterWriting
          key={`${character}:${mode}:${loadRevision}`}
          character={character}
          referencePaths={referencePaths}
          visuallySimilarReferences={visuallySimilarReferences}
          mode={mode}
          initialExample={loadedExample ?? undefined}
          onReset={() => {
            if (loadedExample != null) {
              setLoadedExample(null);
              setLoadRevision((revision) => revision + 1);
            }
          }}
        />
      )}
    </View>
  );
}
