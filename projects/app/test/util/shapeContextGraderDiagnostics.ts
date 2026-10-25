import type { SimilarCharacterGrade } from "#data/questions/hanziCharacterWriting.ts";
import type {
  ShapeContextCorrespondence,
  ShapeContextGrade,
  ThinPlateSplineTransform,
  WritingStrokePoint,
} from "#util/shapeContextGrader.ts";

/** Serialized points use [x, y]; point indices flatten strokes in stroke and point order. */
export type ShapeContextDiagnosticPoint = [x: number, y: number];

export interface ShapeContextGraderDiagnostic {
  /** Bump when changing this generated report format. */
  schemaVersion: 2;
  fixtureId: string;
  targetCharacter: string;
  expectedAcceptance: boolean;
  actualAcceptance: boolean;
  gradingDurationMs: number;
  input: {
    encodedDrawnStrokes: string;
    drawnStrokes: ShapeContextDiagnosticPoint[][];
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
    geometry: Omit<
      ShapeContextGrade,
      | `transform`
      | `similarity`
      | `sourcePoints`
      | `targetPoints`
      | `sourceStrokeIndices`
      | `targetStrokeIndices`
      | `transformedPoints`
      | `correspondences`
      | `sourceStrokes`
      | `targetStrokes`
    > & {
      sourceStrokes: ShapeContextDiagnosticPoint[][];
      targetStrokes: ShapeContextDiagnosticPoint[][];
      transformedPoints: ShapeContextDiagnosticPoint[];
      correspondences: Array<
        Pick<
          ShapeContextCorrespondence,
          | `sourceIndex`
          | `targetIndex`
          | `descriptorCost`
          | `initialDistance`
          | `residualDistance`
        >
      >;
      transform: Omit<
        ThinPlateSplineTransform,
        | `transform`
        | `controlPoints`
        | `bendingEnergy`
        | `affineDistortion`
        | `rotationDegrees`
      > & {
        controlPoints: ShapeContextDiagnosticPoint[];
      };
    };
  };
}

function pointsAsPairs(
  points: readonly WritingStrokePoint[],
): ShapeContextDiagnosticPoint[] {
  return points.map(({ x, y }) => [x, y]);
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
  const {
    transform,
    similarity: _similarity,
    sourcePoints: _sourcePoints,
    targetPoints: _targetPoints,
    sourceStrokeIndices: _sourceStrokeIndices,
    targetStrokeIndices: _targetStrokeIndices,
    correspondences,
    sourceStrokes,
    targetStrokes,
    transformedPoints,
    ...geometryWithoutRedundantFields
  } = geometry;
  const {
    controlPoints,
    bendingEnergy: _bendingEnergy,
    affineDistortion: _affineDistortion,
    rotationDegrees: _rotationDegrees,
    ...transformWithoutRedundantMetrics
  } = transform;
  const serializableTransform = {
    ...transformWithoutRedundantMetrics,
    controlPoints: pointsAsPairs(controlPoints),
  };

  return {
    schemaVersion: 2,
    fixtureId,
    targetCharacter,
    expectedAcceptance,
    actualAcceptance,
    gradingDurationMs,
    input: {
      encodedDrawnStrokes,
      drawnStrokes: drawnStrokes.map(pointsAsPairs),
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
        ...geometryWithoutRedundantFields,
        sourceStrokes: sourceStrokes.map(pointsAsPairs),
        targetStrokes: targetStrokes.map(pointsAsPairs),
        transformedPoints: pointsAsPairs(transformedPoints),
        correspondences: correspondences.map(
          ({
            sourceIndex,
            targetIndex,
            descriptorCost,
            initialDistance,
            residualDistance,
          }) => ({
            sourceIndex,
            targetIndex,
            descriptorCost,
            initialDistance,
            residualDistance,
          }),
        ),
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

interface PointBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function pointBounds(points: readonly WritingStrokePoint[]): PointBounds {
  if (points.length === 0) {
    return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  }
  const bounds = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };
  for (const { x, y } of points) {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  }
  const padding =
    Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, 1) * 0.1;
  return {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };
}

function diagramPointMapper(
  points: readonly WritingStrokePoint[],
  panelX: number,
  panelY: number,
  panelSize: number,
): (point: WritingStrokePoint) => WritingStrokePoint {
  const { minX, minY, maxX, maxY } = pointBounds(points);
  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.min((panelSize - 64) / width, (panelSize - 64) / height);
  const offsetX = panelX + (panelSize - width * scale) / 2;
  const offsetY = panelY + (panelSize - height * scale) / 2;

  return ({ x, y }) => ({
    x: offsetX + (x - minX) * scale,
    y: offsetY + (y - minY) * scale,
  });
}

function gridPaths(
  bounds: PointBounds,
  transform: (point: WritingStrokePoint) => WritingStrokePoint,
): WritingStrokePoint[][] {
  const paths: WritingStrokePoint[][] = [];

  for (let index = 0; index <= 8; index++) {
    const x = bounds.minX + ((bounds.maxX - bounds.minX) * index) / 8;
    const y = bounds.minY + ((bounds.maxY - bounds.minY) * index) / 8;
    for (const vertical of [true, false]) {
      const points = Array.from({ length: 25 }, (_, sampleIndex) => {
        const position =
          bounds.minY + ((bounds.maxY - bounds.minY) * sampleIndex) / 24;
        return vertical
          ? { x, y: position }
          : {
              x: bounds.minX + ((bounds.maxX - bounds.minX) * sampleIndex) / 24,
              y,
            };
      });
      paths.push(points.map(transform));
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
  const overlayOffsetY = 576;
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
  const registeredStrokes = geometry.sourceStrokes.map((_, strokeIndex) =>
    geometry.transformedPoints.filter(
      (_, pointIndex) =>
        geometry.sourceStrokeIndices[pointIndex] === strokeIndex,
    ),
  );
  const normalizedBounds = pointBounds([
    ...geometry.sourcePoints,
    ...geometry.targetPoints,
  ]);
  const sourceGrid = gridPaths(normalizedBounds, (point) => point);
  const registeredGrid = gridPaths(normalizedBounds, (point) =>
    geometry.transform.transform(point),
  );
  const diagramPoint = diagramPointMapper(
    [
      ...geometry.sourcePoints,
      ...geometry.targetPoints,
      ...geometry.transformedPoints,
      ...sourceGrid.flat(),
      ...registeredGrid.flat(),
    ],
    0,
    overlayOffsetY,
    1024,
  );
  const targetPaths = geometry.targetStrokes
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke, diagramPoint)}" fill="none" stroke="#334155" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join(``);
  const normalizedSourcePaths = geometry.sourceStrokes
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke, diagramPoint)}" fill="none" stroke="#159fe8" stroke-width="3" stroke-dasharray="6 4" opacity="0.8"/>`,
    )
    .join(``);
  const registeredPaths = registeredStrokes
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke, diagramPoint)}" fill="none" stroke="#a855f7" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`,
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
      const start = diagramPoint(sourcePoint);
      const end = diagramPoint(targetPoint);
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
      const mappedPoint = diagramPoint(point);
      return `<circle cx="${mappedPoint.x}" cy="${mappedPoint.y}" r="4" fill="#f97316"/>`;
    })
    .join(``);
  const unmatchedTargetPoints = geometry.unmatchedTargetIndices
    .map((index) => geometry.targetPoints[index])
    .filter((point): point is WritingStrokePoint => point != null)
    .map((point) => {
      const mappedPoint = diagramPoint(point);
      return `<circle cx="${mappedPoint.x}" cy="${mappedPoint.y}" r="4" fill="#ef4444"/>`;
    })
    .join(``);
  const sourceGridPaths = sourceGrid
    .map(
      (path) =>
        `<path d="${pathFromPoints(path, diagramPoint)}" fill="none" stroke="#94a3b8" stroke-width="1" opacity="0.45"/>`,
    )
    .join(``);
  const registeredGridPaths = registeredGrid
    .map(
      (path) =>
        `<path d="${pathFromPoints(path, diagramPoint)}" fill="none" stroke="#c084fc" stroke-width="1" opacity="0.6"/>`,
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
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1740" viewBox="0 0 1024 1740" role="img" aria-labelledby="title description">`,
    `<title id="title">Handwriting grade diagnostics for ${escapeXml(fixtureId)}</title>`,
    `<desc id="description">Raw handwriting and reference geometry side by side, with a larger normalized Shape Context and TPS registration diagram below.</desc>`,
    `<rect width="1024" height="1740" fill="#fff"/>`,
    `<rect x="0.5" y="0.5" width="511" height="511" fill="#f8fafc" stroke="#cbd5e1"/>`,
    `<rect x="512.5" y="0.5" width="511" height="511" fill="#f8fafc" stroke="#cbd5e1"/>`,
    `<rect x="0.5" y="576.5" width="1023" height="1023" fill="#f8fafc" stroke="#cbd5e1"/>`,
    sourcePaths.join(``),
    `<g transform="translate(536 52) scale(0.453125)">${referencePathsSvg}</g>`,
    `<g>${sourceGridPaths}${registeredGridPaths}${targetPaths}${normalizedSourcePaths}${registeredPaths}${correspondenceLines}${unmatchedSourcePoints}${unmatchedTargetPoints}</g>`,
    `<g font-family="sans-serif" font-size="18" fill="#0f172a">`,
    `<text x="256" y="540" text-anchor="middle">Raw handwriting · ${escapeXml(targetCharacter)}</text>`,
    `<text x="768" y="540" text-anchor="middle">Reference geometry</text>`,
    `<text x="512" y="1624" text-anchor="middle">Normalized matches and TPS registration</text>`,
    `<text x="512" y="1645" text-anchor="middle" font-size="12">Normalized source before TPS (blue) · registered source (purple) · reference (gray)</text>`,
    `<text x="24" y="1670">Expected ${expectedAcceptance ? `accept` : `reject`} · actual ${actualAcceptance ? `accept` : `reject`} · similarity ${geometry.similarity.toFixed(4)} / threshold ${acceptanceThreshold.toFixed(2)} · combined cost ${geometry.combinedCost.toFixed(4)} · samples ${geometry.sampleCount} · matches ${geometry.correspondences.length}</text>`,
    `<text x="24" y="1695" font-size="12">${escapeXml(firstContributionLine)}</text>`,
    `<text x="24" y="1718" font-size="12">${escapeXml(secondContributionLine)}</text>`,
    `</g>`,
    `</svg>`,
  ].join(``);
}
