import { hanziSvgPathsQuery } from "@/client/query";
import { HanziWritingDebug } from "@/client/ui/HanziWritingDebug";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { useVisuallySimilarCharacterReferences } from "@/client/ui/hooks/useVisuallySimilarCharacterReferences";
import type { HanziCharacter } from "@/data/model";
import {
  gradeSimilarCharacters,
  hanziCharacterWritingSimilarityThreshold,
  isHanziCharacterWritingAccepted,
} from "@/data/questions/hanziCharacterWriting";
import type { SimilarCharacterReference } from "@/data/questions/hanziCharacterWriting";
import { gradeCharacterShape } from "@/util/shapeContextGrader";
import type { ShapeContextGrade } from "@/util/shapeContextGrader";
import type { ShapeContextGraderExample } from "@/util/shapeContextGraderExample";
import {
  decodeShapeContextStrokes,
  parseShapeContextGraderExampleFragment,
  shapeContextGraderExampleCharacter,
} from "@/util/shapeContextGraderExample";
import { transformArphicSpaceSvgPath } from "@/util/svgFont";
import { useQuery } from "@tanstack/react-query";
import { useState, useSyncExternalStore } from "react";

type ViewerState =
  | { kind: `error`; message: string }
  | { kind: `loaded`; example: ShapeContextGraderExample }
  | { kind: `loading` };

function subscribeToHashChange(onChange: () => void) {
  if (typeof window === `undefined`) {
    return () => {};
  }
  window.addEventListener(`hashchange`, onChange);
  return () => {
    window.removeEventListener(`hashchange`, onChange);
  };
}

function getHash() {
  return typeof window === `undefined` ? `` : window.location.hash;
}

function viewerStateForHash(hash: string): ViewerState {
  if (hash.length === 0) {
    return {
      kind: `error`,
      message: `Open this page with an exported test case in the URL fragment.`,
    };
  }

  try {
    return {
      kind: `loaded`,
      example: parseShapeContextGraderExampleFragment(hash),
    };
  } catch (error) {
    return {
      kind: `error`,
      message:
        error instanceof Error
          ? error.message
          : `Could not load test case from URL`,
    };
  }
}

function LoadedExampleWithPaths({
  example,
  referencePaths,
  similarCharacterReferences,
}: {
  example: ShapeContextGraderExample;
  referencePaths: string[];
  similarCharacterReferences: SimilarCharacterReference[];
}) {
  const drawnStrokes = decodeShapeContextStrokes(example.drawnStrokes);
  const [geometry, setGeometry] = useState<ShapeContextGrade>(() =>
    gradeCharacterShape(drawnStrokes, referencePaths, example.options),
  );
  const [similarCharacterGrades, setSimilarCharacterGrades] = useState(() =>
    gradeSimilarCharacters(
      drawnStrokes,
      similarCharacterReferences,
      geometry.options,
      geometry.sampleCount,
    ),
  );
  const accepted = isHanziCharacterWritingAccepted(
    geometry,
    similarCharacterGrades,
  );

  return (
    <View className="gap-3">
      <Text className="text-xl font-semibold text-fg">{example.id}</Text>
      <Text
        className={`
          font-semibold

          ${accepted ? `text-success` : `text-danger`}
        `}
      >
        {accepted ? `Accepted` : `Not accepted`}
      </Text>
      <Text className="text-fg">
        Similarity {geometry.similarity.toFixed(3)} · acceptance threshold{` `}
        {hanziCharacterWritingSimilarityThreshold.toFixed(2)}
      </Text>
      {similarCharacterGrades.map(({ hanzi, geometry: candidate }) => (
        <Text key={hanzi} className="text-fg">
          {hanzi} similarity {candidate.similarity.toFixed(3)}
        </Text>
      ))}
      <HanziWritingDebug
        geometry={geometry}
        drawnStrokes={drawnStrokes}
        referencePaths={referencePaths}
        onGeometryChange={(nextGeometry) => {
          setGeometry(nextGeometry);
          setSimilarCharacterGrades(
            gradeSimilarCharacters(
              drawnStrokes,
              similarCharacterReferences,
              nextGeometry.options,
              nextGeometry.sampleCount,
            ),
          );
        }}
      />
    </View>
  );
}

function LoadedExample({ example }: { example: ShapeContextGraderExample }) {
  const character = shapeContextGraderExampleCharacter(
    example,
  ) as HanziCharacter;
  const query = useQuery(hanziSvgPathsQuery(character));
  const visuallySimilarData = useVisuallySimilarCharacterReferences(character);
  if (query.isLoading) {
    return <Text className="text-muted-fg">Loading writing data…</Text>;
  }
  if (query.isError || query.data == null) {
    return (
      <Text className="text-danger">
        Could not load writing data for{` `}
        {shapeContextGraderExampleCharacter(example)}.
      </Text>
    );
  }
  if (visuallySimilarData.isLoading) {
    return (
      <Text className="text-muted-fg">Loading similar-character data…</Text>
    );
  }
  if (visuallySimilarData.hasWikiError) {
    return (
      <Text className="text-danger">
        Could not load similar-character data for {character}.
      </Text>
    );
  }
  const missingSimilarCharacter = visuallySimilarData.missingCharacter;
  if (missingSimilarCharacter != null) {
    return (
      <Text className="text-danger">
        No median stroke data is available for similar character{` `}
        {missingSimilarCharacter}.
      </Text>
    );
  }

  const referencePaths = (query.data.medians ?? []).map(
    transformArphicSpaceSvgPath,
  );
  if (referencePaths.length === 0) {
    return (
      <Text className="text-danger">
        No median stroke data is available for{` `}
        {shapeContextGraderExampleCharacter(example)}.
      </Text>
    );
  }

  return (
    <LoadedExampleWithPaths
      example={example}
      referencePaths={referencePaths}
      similarCharacterReferences={visuallySimilarData.references}
    />
  );
}

export default function HanziWritingDebugViewerDemo() {
  const hash = useSyncExternalStore(subscribeToHashChange, getHash, () => ``);
  const state = viewerStateForHash(hash);

  return (
    <View className="w-full gap-3 p-4">
      {state.kind === `error` ? (
        <Text className="text-danger">{state.message}</Text>
      ) : state.kind === `loaded` ? (
        <LoadedExample key={hash} example={state.example} />
      ) : (
        <Text className="text-muted-fg">Loading debug case…</Text>
      )}
    </View>
  );
}
