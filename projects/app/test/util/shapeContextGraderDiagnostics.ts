import type { SimilarCharacterGrade } from "#data/questions/hanziCharacterWriting.ts";
import type {
  ShapeContextGrade,
  ThinPlateSplineTransform,
  WritingStrokePoint,
} from "#util/shapeContextGrader.ts";

export interface ShapeContextGraderDiagnostic {
  schemaVersion: 1;
  fixtureId: string;
  targetCharacter: string;
  expectedAcceptance: boolean;
  actualAcceptance: boolean;
  gradingDurationMs: number;
  input: {
    encodedDrawnStrokes: string;
    drawnStrokes: WritingStrokePoint[][];
    referencePaths: string[];
  };
  score: {
    similarity: number;
    acceptanceThreshold: number;
  };
  contrastiveCandidates: Array<{
    character: string;
    similarity: number;
    combinedCost: number;
  }>;
  algorithm: {
    kind: `shape-context-tps`;
    geometry: Omit<ShapeContextGrade, `transform`> & {
      transform: Omit<ThinPlateSplineTransform, `transform`>;
    };
  };
}

export function createShapeContextGraderDiagnostic({
  fixtureId,
  targetCharacter,
  encodedDrawnStrokes,
  drawnStrokes,
  referencePaths,
  expectedAcceptance,
  actualAcceptance,
  acceptanceThreshold,
  gradingDurationMs,
  geometry,
  contrastiveCandidates,
}: {
  fixtureId: string;
  targetCharacter: string;
  encodedDrawnStrokes: string;
  drawnStrokes: readonly (readonly WritingStrokePoint[])[];
  referencePaths: readonly string[];
  expectedAcceptance: boolean;
  actualAcceptance: boolean;
  acceptanceThreshold: number;
  gradingDurationMs: number;
  geometry: ShapeContextGrade;
  contrastiveCandidates: readonly SimilarCharacterGrade[];
}): ShapeContextGraderDiagnostic {
  const { transform, ...geometryWithoutTransform } = geometry;
  const serializableTransform: Omit<ThinPlateSplineTransform, `transform`> = {
    controlPoints: transform.controlPoints,
    xWeights: transform.xWeights,
    yWeights: transform.yWeights,
    affineX: transform.affineX,
    affineY: transform.affineY,
    rotationRadians: transform.rotationRadians,
    regularization: transform.regularization,
    bendingEnergy: transform.bendingEnergy,
    affineDistortion: transform.affineDistortion,
    rotationDegrees: transform.rotationDegrees,
  };

  return {
    schemaVersion: 1,
    fixtureId,
    targetCharacter,
    expectedAcceptance,
    actualAcceptance,
    gradingDurationMs,
    input: {
      encodedDrawnStrokes,
      drawnStrokes: drawnStrokes.map((stroke) =>
        stroke.map(({ x, y }) => ({ x, y })),
      ),
      referencePaths: [...referencePaths],
    },
    score: {
      similarity: geometry.similarity,
      acceptanceThreshold,
    },
    contrastiveCandidates: contrastiveCandidates.map(
      ({ hanzi, geometry: candidateGeometry }) => ({
        character: hanzi,
        similarity: candidateGeometry.similarity,
        combinedCost: candidateGeometry.combinedCost,
      }),
    ),
    algorithm: {
      kind: `shape-context-tps`,
      geometry: {
        ...geometryWithoutTransform,
        transform: serializableTransform,
      },
    },
  };
}

function escapeXml(value: string): string {
  return value
    .replaceAll(`&`, `&amp;`)
    .replaceAll(`"`, `&quot;`)
    .replaceAll(`<`, `&lt;`)
    .replaceAll(`>`, `&gt;`);
}

function pathFromPoints(
  points: readonly WritingStrokePoint[],
  mapPoint: (point: WritingStrokePoint) => WritingStrokePoint,
): string {
  return points
    .map((point, index) => {
      const mappedPoint = mapPoint(point);
      return `${index === 0 ? `M` : `L`} ${mappedPoint.x} ${mappedPoint.y}`;
    })
    .join(` `);
}

function drawingPointMapper(
  strokes: readonly (readonly WritingStrokePoint[])[],
  panelOffsetX: number,
): (point: WritingStrokePoint) => WritingStrokePoint {
  const points = strokes.flat();
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => y));
  const maxY = Math.max(...points.map(({ y }) => y));
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  const scale = Math.min(448 / width, 448 / height);
  const offsetX = panelOffsetX + (512 - width * scale) / 2;
  const offsetY = (512 - height * scale) / 2;

  return ({ x, y }) => ({
    x: offsetX + (x - minX) * scale,
    y: offsetY + (y - minY) * scale,
  });
}

function diagramPoint(
  point: WritingStrokePoint,
  panelOffsetX: number,
): WritingStrokePoint {
  return {
    x: panelOffsetX + 256 + point.x * 120,
    y: 256 + point.y * 120,
  };
}

function gridPaths(
  geometry: ShapeContextGrade,
  panelOffsetX: number,
  transformed: boolean,
): string[] {
  const paths: string[] = [];

  for (let index = 0; index <= 8; index++) {
    const coordinate = -1 + (index * 2) / 8;
    for (const vertical of [true, false]) {
      const points = Array.from({ length: 25 }, (_, sampleIndex) => {
        const position = -1 + (sampleIndex * 2) / 24;
        const point = vertical
          ? { x: coordinate, y: position }
          : { x: position, y: coordinate };
        return transformed ? geometry.transform.transform(point) : point;
      });
      paths.push(
        pathFromPoints(points, (point) => diagramPoint(point, panelOffsetX)),
      );
    }
  }

  return paths;
}

export function renderShapeContextGraderDiagnosticSvg({
  fixtureId,
  targetCharacter,
  drawnStrokes,
  referencePaths,
  geometry,
  expectedAcceptance,
  actualAcceptance,
  acceptanceThreshold,
}: {
  fixtureId: string;
  targetCharacter: string;
  drawnStrokes: readonly (readonly WritingStrokePoint[])[];
  referencePaths: readonly string[];
  geometry: ShapeContextGrade;
  expectedAcceptance: boolean;
  actualAcceptance: boolean;
  acceptanceThreshold: number;
}): string {
  const rawPoint = drawingPointMapper(drawnStrokes, 0);
  const overlayOffsetX = 1024;
  const sourcePaths = drawnStrokes.map(
    (stroke) =>
      `<path d="${pathFromPoints(stroke, rawPoint)}" fill="none" stroke="#159fe8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
  );
  const referencePathsSvg = referencePaths
    .map(
      (path) =>
        `<path d="${escapeXml(path)}" fill="none" stroke="#334155" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join(``);
  const targetPaths = geometry.targetStrokes
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke, (point) => diagramPoint(point, overlayOffsetX))}" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join(``);
  const normalizedSourcePaths = geometry.sourceStrokes
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke, (point) => diagramPoint(point, overlayOffsetX))}" fill="none" stroke="#159fe8" stroke-width="3" stroke-dasharray="6 4" opacity="0.8"/>`,
    )
    .join(``);
  const registeredStrokes = geometry.sourceStrokes.map((_, strokeIndex) =>
    geometry.transformedPoints.filter(
      (_, pointIndex) =>
        geometry.sourceStrokeIndices[pointIndex] === strokeIndex,
    ),
  );
  const registeredPaths = registeredStrokes
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke, (point) => diagramPoint(point, overlayOffsetX))}" fill="none" stroke="#a855f7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join(``);
  const correspondenceLines = geometry.correspondences
    .map((correspondence) => {
      const sourcePoint =
        geometry.transformedPoints[correspondence.sourceIndex];
      const targetPoint = geometry.targetPoints[correspondence.targetIndex];
      if (sourcePoint == null || targetPoint == null) {
        return ``;
      }
      const start = diagramPoint(sourcePoint, overlayOffsetX);
      const end = diagramPoint(targetPoint, overlayOffsetX);
      const color =
        correspondence.residualDistance > 0.2
          ? `#ef4444`
          : correspondence.residualDistance > 0.08
            ? `#f59e0b`
            : `#22c55e`;
      return `<line x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}" stroke="${color}" stroke-width="1.5" opacity="0.7"/>`;
    })
    .join(``);
  const unmatchedSourcePoints = geometry.unmatchedSourceIndices
    .map((index) => geometry.transformedPoints[index])
    .filter((point): point is WritingStrokePoint => point != null)
    .map((point) => {
      const mappedPoint = diagramPoint(point, overlayOffsetX);
      return `<circle cx="${mappedPoint.x}" cy="${mappedPoint.y}" r="4" fill="#f97316"/>`;
    })
    .join(``);
  const unmatchedTargetPoints = geometry.unmatchedTargetIndices
    .map((index) => geometry.targetPoints[index])
    .filter((point): point is WritingStrokePoint => point != null)
    .map((point) => {
      const mappedPoint = diagramPoint(point, overlayOffsetX);
      return `<circle cx="${mappedPoint.x}" cy="${mappedPoint.y}" r="4" fill="#ef4444"/>`;
    })
    .join(``);
  const sourceGrid = gridPaths(geometry, overlayOffsetX, false)
    .map(
      (path) =>
        `<path d="${path}" fill="none" stroke="#94a3b8" stroke-width="1" opacity="0.45"/>`,
    )
    .join(``);
  const registeredGrid = gridPaths(geometry, overlayOffsetX, true)
    .map(
      (path) =>
        `<path d="${path}" fill="none" stroke="#c084fc" stroke-width="1" opacity="0.6"/>`,
    )
    .join(``);
  const scoreContributions = geometry.weightedScoreContributions;
  const contributions = [
    `initialMatchingError: ${scoreContributions.initialMatchingError.toFixed(3)}`,
    `residualMatchingError: ${scoreContributions.residualMatchingError.toFixed(3)}`,
    `bendingEnergy: ${scoreContributions.bendingEnergy.toFixed(3)}`,
    `affineDistortion: ${scoreContributions.affineDistortion.toFixed(3)}`,
    `rotationPenalty: ${scoreContributions.rotationPenalty.toFixed(3)}`,
    `unmatchedPointPenalty: ${scoreContributions.unmatchedPointPenalty.toFixed(3)}`,
    `geometryCoveragePenalty: ${scoreContributions.geometryCoveragePenalty.toFixed(3)}`,
    `emptyGeometryPenalty: ${scoreContributions.emptyGeometryPenalty.toFixed(3)}`,
  ];
  const contributionSplit = Math.ceil(contributions.length / 2);
  const firstContributionLine = contributions
    .slice(0, contributionSplit)
    .join(` · `);
  const secondContributionLine = contributions
    .slice(contributionSplit)
    .join(` · `);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="640" viewBox="0 0 1536 640" role="img" aria-labelledby="title description">`,
    `<title id="title">Handwriting grade diagnostics for ${escapeXml(fixtureId)}</title>`,
    `<desc id="description">Raw handwriting and reference, followed by normalized Shape Context and TPS registration diagnostics.</desc>`,
    `<rect width="1536" height="640" fill="#fff"/>`,
    `<rect x="0.5" y="0.5" width="511" height="511" fill="#f8fafc" stroke="#cbd5e1"/>`,
    `<rect x="512.5" y="0.5" width="511" height="511" fill="#f8fafc" stroke="#cbd5e1"/>`,
    `<rect x="1024.5" y="0.5" width="511" height="511" fill="#f8fafc" stroke="#cbd5e1"/>`,
    sourcePaths.join(``),
    `<g transform="translate(536 52) scale(0.453125)">${referencePathsSvg}</g>`,
    `<g>${sourceGrid}${registeredGrid}${targetPaths}${normalizedSourcePaths}${registeredPaths}${correspondenceLines}${unmatchedSourcePoints}${unmatchedTargetPoints}</g>`,
    `<g font-family="sans-serif" font-size="18" fill="#0f172a">`,
    `<text x="256" y="540" text-anchor="middle">Raw handwriting · ${escapeXml(targetCharacter)}</text>`,
    `<text x="768" y="540" text-anchor="middle">Reference geometry</text>`,
    `<text x="1280" y="540" text-anchor="middle">Normalized matches and TPS registration</text>`,
    `<text x="1280" y="559" text-anchor="middle" font-size="12">Normalized source before TPS (blue) · registered source (purple) · reference (gray)</text>`,
    `<text x="24" y="582">Expected ${expectedAcceptance ? `accept` : `reject`} · actual ${actualAcceptance ? `accept` : `reject`} · similarity ${geometry.similarity.toFixed(4)} / threshold ${acceptanceThreshold.toFixed(2)} · combined cost ${geometry.combinedCost.toFixed(4)} · samples ${geometry.sampleCount} · matches ${geometry.correspondences.length}</text>`,
    `<text x="24" y="608" font-size="12">${escapeXml(firstContributionLine)}</text>`,
    `<text x="24" y="628" font-size="12">${escapeXml(secondContributionLine)}</text>`,
    `</g>`,
    `</svg>`,
  ].join(``);
}
