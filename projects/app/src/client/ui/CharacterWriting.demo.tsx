import { hanziSvgPathsQuery, skipQuery } from "@/client/query";
import type { HanziSvgData } from "@/client/query";
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
  const isGuided = mode === `guided`;

  function onStrokesChange(strokes: Point[][]) {
    if (isGuided) {
      setCurrentStroke((stroke) => Math.min(stroke + 1, referencePaths.length));
    } else {
      const didAddStroke = strokes.length > freeStrokes.length;
      if (didAddStroke) {
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
      }
      setFreeStrokes(strokes);
      setLastGrade(
        strokes.length === 0
          ? null
          : gradeCharacterShape(strokes, referencePaths, gradeOptions),
      );
    }
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
        onStrokesChange={onStrokesChange}
        guidedPaths={isGuided ? referencePaths : undefined}
        guidedPathIndex={isGuided ? currentStroke : undefined}
        drawnStrokes={freeStrokes}
      />
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
  const query = useQuery(
    character == null
      ? skipQuery<HanziSvgData | null>()
      : hanziSvgPathsQuery(character),
  );
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
