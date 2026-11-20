import type {
  HanziCharacterWritingAcceptanceDecision,
  SimilarCharacterGrade,
} from "#data/questions/hanziCharacterWriting.ts";
import type {
  ShapeContextCorrespondence,
  ShapeContextGrade,
  ThinPlateSplineTransform,
  WritingIssue,
  WritingIssueExpectation,
  WritingStrokePoint,
} from "#util/shapeContextGrader.ts";
import {
  extractReferenceStrokeSegment,
  extractWritingStrokeSegment,
} from "#util/shapeContextGrader.ts";

/** Serialized points use [x, y]; point indices flatten strokes in stroke and point order. */
export type ShapeContextDiagnosticPoint = [x: number, y: number];

export interface ShapeContextGraderDiagnostic {
  /** Bump when changing this generated report format. */
  schemaVersion: 20;
  fixtureId: string;
  targetCharacter: string;
  expectedAcceptance: boolean;
  actualAcceptance: boolean;
  acceptance: HanziCharacterWritingAcceptanceDecision;
  gradingDurationMs: number;
  input: {
    encodedDrawnStrokes: string;
    drawnStrokes: ShapeContextDiagnosticPoint[][];
    referencePaths: string[];
  };
  score: {
    shapeCost: number;
    shapeSimilarity: number;
    deformationAlpha: number;
    missingReferenceStrokeFraction: number;
    extraHandwritingStrokeFraction: number;
    missingReferenceStrokePenalty: number;
    extraHandwritingStrokePenalty: number;
    acceptanceThreshold: number;
  };
  issues: WritingIssue[];
  issueExpectations: WritingIssueExpectationDiagnostics;
  contrastiveCandidates: Array<{
    character: string;
    shapeSimilarity: number;
    deformationAlpha: number;
    comparison: {
      evaluated: boolean;
      observedMargin: number | null;
      passed: boolean | null;
    };
  }>;
  algorithm: {
    kind: `shape-context-tps`;
    geometry: Omit<
      ShapeContextGrade,
      | `transform`
      | `shapeCost`
      | `shapeSimilarity`
      | `deformationAlpha`
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
        Omit<
          Pick<
            ShapeContextCorrespondence,
            | `sourceIndex`
            | `targetIndex`
            | `targetPoint`
            | `descriptorCost`
            | `initialDistance`
            | `residualDistance`
          >,
          `targetPoint`
        > & { targetPoint: ShapeContextDiagnosticPoint }
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
    strokePresence: ShapeContextStrokePresenceDiagnostics;
  };
}

export interface WritingIssueExpectationDiagnostics {
  declared: boolean;
  expected: Array<{ issue: WritingIssueExpectation; satisfied: boolean }>;
  unexpected: Array<{ issue: WritingIssueExpectation; satisfied: boolean }>;
  allSatisfied: boolean;
}

// Localization expectations allow 3% of normalized stroke arc length.
const issueLocalizationTolerance = 0.03;

function issueMatchesExpectation(
  issue: WritingIssue,
  expectation: WritingIssueExpectation,
): boolean {
  if (issue.kind !== expectation.kind) {
    return false;
  }
  for (const [geometry, segmentExpectation] of [
    [`handwriting`, expectation.handwriting],
    [`reference`, expectation.reference],
  ] as const) {
    if (segmentExpectation == null) {
      continue;
    }
    const segment = issue[geometry];
    if (
      segment == null ||
      segment.strokeIndex !== segmentExpectation.strokeIndex ||
      (segmentExpectation.start != null &&
        Math.abs(segment.start - segmentExpectation.start) >
          issueLocalizationTolerance) ||
      (segmentExpectation.end != null &&
        Math.abs(segment.end - segmentExpectation.end) >
          issueLocalizationTolerance)
    ) {
      return false;
    }
  }
  return true;
}

export function evaluateWritingIssueExpectations(
  issues: readonly WritingIssue[],
  expectedIssues?: readonly WritingIssueExpectation[],
  unexpectedIssues?: readonly WritingIssueExpectation[],
): WritingIssueExpectationDiagnostics {
  const expected = (expectedIssues ?? []).map((issue) => ({
    issue,
    satisfied: issues.some((actual) => issueMatchesExpectation(actual, issue)),
  }));
  const unexpected = (unexpectedIssues ?? []).map((issue) => ({
    issue,
    satisfied: !issues.some((actual) => issueMatchesExpectation(actual, issue)),
  }));
  return {
    declared: expectedIssues != null || unexpectedIssues != null,
    expected,
    unexpected,
    allSatisfied:
      expected.every(({ satisfied }) => satisfied) &&
      unexpected.every(({ satisfied }) => satisfied),
  };
}

export interface ShapeContextStrokePresenceReferenceStroke {
  referenceStrokeIndex: number;
  handwritingStrokeIndex: number | null;
  selectedAssignmentCost: number | null;
  costComponents: {
    dtwCost: number;
    centroidDistance: number;
    arcLengthPenalty: number;
  } | null;
  costOfLeavingReferenceUnmatched: number;
  cheaperThanLeavingReferenceAndHandwritingUnmatched: boolean | null;
  referenceArcLength: number;
  handwritingArcLength: number | null;
  arcLengthDifference: number | null;
}

export interface ShapeContextStrokePresenceDiagnostics {
  referenceStrokeCount: number;
  handwritingStrokeCount: number;
  referenceStrokes: ShapeContextStrokePresenceReferenceStroke[];
  unmatchedHandwritingStrokes: Array<{
    handwritingStrokeIndex: number;
    handwritingArcLength: number;
  }>;
  summary: {
    matchedReferenceStrokeCount: number;
    unmatchedReferenceStrokeCount: number;
    unmatchedHandwritingStrokeCount: number;
    unmatchedReferenceArcLengthFraction: number;
    unmatchedHandwritingArcLengthFraction: number;
  };
}

function strokeArcLength(stroke: readonly WritingStrokePoint[]): number {
  let length = 0;
  for (let index = 1; index < stroke.length; index++) {
    const previous = stroke[index - 1];
    const current = stroke[index];
    if (previous != null && current != null) {
      length += Math.hypot(current.x - previous.x, current.y - previous.y);
    }
  }
  return length;
}

function pointsAsPairs(
  points: readonly WritingStrokePoint[],
): ShapeContextDiagnosticPoint[] {
  return points.map(({ x, y }) => [x, y]);
}

export function diagnoseShapeContextStrokePresence(
  geometry: ShapeContextGrade,
): ShapeContextStrokePresenceDiagnostics {
  const assignmentsByReferenceStroke = new Map(
    geometry.strokeAssignments.map((assignment) => [
      assignment.targetStrokeIndex,
      assignment,
    ]),
  );
  const referenceLengths = geometry.targetStrokes.map(strokeArcLength);
  const handwritingLengths = geometry.sourceStrokes.map(strokeArcLength);
  const referenceStrokes = geometry.targetStrokes.map(
    (_, referenceStrokeIndex) => {
      const assignment = assignmentsByReferenceStroke.get(referenceStrokeIndex);
      if (assignment == null) {
        return {
          referenceStrokeIndex,
          handwritingStrokeIndex: null,
          selectedAssignmentCost: null,
          costComponents: null,
          costOfLeavingReferenceUnmatched: geometry.options.unmatchedCost,
          cheaperThanLeavingReferenceAndHandwritingUnmatched: null,
          referenceArcLength: referenceLengths[referenceStrokeIndex] ?? 0,
          handwritingArcLength: null,
          arcLengthDifference: null,
        };
      }

      const pairCost =
        geometry.strokePairCosts[assignment.sourceStrokeIndex]?.[
          referenceStrokeIndex
        ];
      const handwritingArcLength =
        handwritingLengths[assignment.sourceStrokeIndex];
      if (pairCost == null || handwritingArcLength == null) {
        throw new Error(
          `Missing stroke-pair diagnostics for assignment ${assignment.sourceStrokeIndex}-${referenceStrokeIndex}`,
        );
      }
      const referenceArcLength = referenceLengths[referenceStrokeIndex] ?? 0;
      return {
        referenceStrokeIndex,
        handwritingStrokeIndex: assignment.sourceStrokeIndex,
        selectedAssignmentCost: pairCost.totalCost,
        costComponents: {
          dtwCost: pairCost.dtwCost,
          centroidDistance: pairCost.centroidDistance,
          arcLengthPenalty: pairCost.lengthPenalty,
        },
        costOfLeavingReferenceUnmatched: geometry.options.unmatchedCost,
        cheaperThanLeavingReferenceAndHandwritingUnmatched:
          pairCost.totalCost < 2 * geometry.options.unmatchedCost,
        referenceArcLength,
        handwritingArcLength,
        arcLengthDifference: Math.abs(
          handwritingArcLength - referenceArcLength,
        ),
      };
    },
  );
  const unmatchedHandwritingStrokes = geometry.unmatchedSourceStrokeIndices.map(
    (handwritingStrokeIndex) => ({
      handwritingStrokeIndex,
      handwritingArcLength: handwritingLengths[handwritingStrokeIndex] ?? 0,
    }),
  );
  let unmatchedReferenceArcLength = 0;
  for (const stroke of referenceStrokes) {
    if (stroke.handwritingStrokeIndex == null) {
      unmatchedReferenceArcLength += stroke.referenceArcLength;
    }
  }
  let unmatchedHandwritingArcLength = 0;
  for (const stroke of unmatchedHandwritingStrokes) {
    unmatchedHandwritingArcLength += stroke.handwritingArcLength;
  }
  const totalReferenceArcLength = referenceLengths.reduce(
    (total, length) => total + length,
    0,
  );
  let totalHandwritingArcLength = 0;
  for (const length of handwritingLengths) {
    totalHandwritingArcLength += length;
  }
  const unmatchedReferenceStrokeCount = referenceStrokes.filter(
    ({ handwritingStrokeIndex }) => handwritingStrokeIndex == null,
  ).length;

  return {
    referenceStrokeCount: geometry.targetStrokes.length,
    handwritingStrokeCount: geometry.sourceStrokes.length,
    referenceStrokes,
    unmatchedHandwritingStrokes,
    summary: {
      matchedReferenceStrokeCount:
        geometry.targetStrokes.length - unmatchedReferenceStrokeCount,
      unmatchedReferenceStrokeCount,
      unmatchedHandwritingStrokeCount: unmatchedHandwritingStrokes.length,
      unmatchedReferenceArcLengthFraction:
        totalReferenceArcLength > 0
          ? unmatchedReferenceArcLength / totalReferenceArcLength
          : 0,
      unmatchedHandwritingArcLengthFraction:
        totalHandwritingArcLength > 0
          ? unmatchedHandwritingArcLength / totalHandwritingArcLength
          : 0,
    },
  };
}

export function createShapeContextGraderDiagnostic({
  fixtureId,
  targetCharacter,
  encodedDrawnStrokes,
  drawnStrokes,
  referencePaths,
  expectedAcceptance,
  acceptanceThreshold,
  gradingDurationMs,
  geometry,
  acceptance,
  contrastiveCandidates,
  expectedIssues,
  unexpectedIssues,
}: {
  fixtureId: string;
  targetCharacter: string;
  encodedDrawnStrokes: string;
  drawnStrokes: readonly (readonly WritingStrokePoint[])[];
  referencePaths: readonly string[];
  expectedAcceptance: boolean;
  acceptanceThreshold: number;
  gradingDurationMs: number;
  geometry: ShapeContextGrade;
  acceptance: HanziCharacterWritingAcceptanceDecision;
  contrastiveCandidates: readonly SimilarCharacterGrade[];
  expectedIssues?: readonly WritingIssueExpectation[];
  unexpectedIssues?: readonly WritingIssueExpectation[];
}): ShapeContextGraderDiagnostic {
  const {
    transform,
    shapeCost: _shapeCost,
    shapeSimilarity: _shapeSimilarity,
    deformationAlpha: _deformationAlpha,
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
  const strokePresence = diagnoseShapeContextStrokePresence(geometry);
  const issueExpectations = evaluateWritingIssueExpectations(
    geometry.issues,
    expectedIssues,
    unexpectedIssues,
  );
  const diagnosticCandidates = contrastiveCandidates.map(
    ({ hanzi, geometry: candidateGeometry }, index) => {
      const comparison = acceptance.contrastiveCheck.candidates[index];
      if (comparison == null || comparison.character !== hanzi) {
        throw new Error(`Contrastive candidate diagnostics are out of sync`);
      }
      return {
        character: hanzi,
        shapeSimilarity: candidateGeometry.shapeSimilarity,
        deformationAlpha: candidateGeometry.deformationAlpha,
        comparison: {
          evaluated: comparison.evaluated,
          observedMargin: comparison.observedMargin,
          passed: comparison.passed,
        },
      };
    },
  );
  return {
    schemaVersion: 20,
    fixtureId,
    targetCharacter,
    expectedAcceptance,
    actualAcceptance: acceptance.finalAccepted,
    acceptance,
    gradingDurationMs,
    input: {
      encodedDrawnStrokes,
      drawnStrokes: drawnStrokes.map(pointsAsPairs),
      referencePaths: [...referencePaths],
    },
    score: {
      shapeCost: geometry.shapeCost,
      shapeSimilarity: geometry.shapeSimilarity,
      deformationAlpha: geometry.deformationAlpha,
      missingReferenceStrokeFraction: geometry.missingReferenceStrokeFraction,
      extraHandwritingStrokeFraction: geometry.extraHandwritingStrokeFraction,
      missingReferenceStrokePenalty:
        geometry.weightedScoreContributions.missingReferenceStrokePenalty,
      extraHandwritingStrokePenalty:
        geometry.weightedScoreContributions.extraHandwritingStrokePenalty,
      acceptanceThreshold,
    },
    issues: geometry.issues,
    issueExpectations,
    contrastiveCandidates: diagnosticCandidates,
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
            targetPoint,
            descriptorCost,
            initialDistance,
            residualDistance,
          }) => ({
            sourceIndex,
            targetIndex,
            targetPoint: [targetPoint.x, targetPoint.y],
            descriptorCost,
            initialDistance,
            residualDistance,
          }),
        ),
        transform: serializableTransform,
      },
      strokePresence,
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

function renderDtwAlignmentHeatmaps(
  alignments: ShapeContextGrade[`dtwAlignments`],
  sectionY: number,
): { svg: string; height: number } {
  if (alignments.length === 0) {
    return { svg: ``, height: sectionY };
  }
  const columns = alignments.length === 1 ? 1 : 2;
  const rows = Math.ceil(alignments.length / columns);
  const panelWidth = columns === 1 ? 960 : 500;
  const panelHeight = columns === 1 ? 560 : 270;
  const panelX = columns === 1 ? 32 : 12;
  const panelTop = sectionY + 36;
  const plotSize = Math.min(panelWidth - 92, panelHeight - 122);
  const panels = alignments.map((alignment, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = panelX + column * 500;
    const y = panelTop + row * panelHeight;
    const plotX = x + (panelWidth - plotSize) / 2;
    const plotY = y + 38;
    const sourceCount = alignment.sourcePointIndices.length;
    const referenceCount = alignment.referencePointIndices.length;
    const cellWidth = plotSize / sourceCount;
    const cellHeight = plotSize / referenceCount;
    const sourceMinimum = Math.min(...alignment.sourcePointIndices);
    const referenceMinimum = Math.min(...alignment.referencePointIndices);
    const values = alignment.costMatrix.flat();
    const minimumCost = Math.min(...values);
    const maximumCost = Math.max(...values);
    const cells = alignment.costMatrix
      .map((rowCosts, sourceOffset) =>
        rowCosts
          .map((cost, targetOffset) => {
            const fraction =
              maximumCost === minimumCost
                ? 0
                : (cost - minimumCost) / (maximumCost - minimumCost);
            const red = Math.round(219 - fraction * 189);
            const green = Math.round(234 - fraction * 170);
            const blue = Math.round(254 - fraction * 35);
            const referenceIndex =
              alignment.referencePointIndices[targetOffset] ?? referenceMinimum;
            const referenceOffset = referenceIndex - referenceMinimum;
            return `<rect data-dtw-cost-cell="" x="${(plotX + sourceOffset * cellWidth).toFixed(2)}" y="${(plotY + referenceOffset * cellHeight).toFixed(2)}" width="${Math.ceil(cellWidth * 100) / 100}" height="${Math.ceil(cellHeight * 100) / 100}" fill="rgb(${red},${green},${blue})"/>`;
          })
          .join(``),
      )
      .join(``);
    const diagonalStartY =
      alignment.direction === `forward` ? plotY : plotY + plotSize;
    const diagonalEndY =
      alignment.direction === `forward` ? plotY + plotSize : plotY;
    const diagonal = [
      `<line x1="${plotX}" y1="${diagonalStartY}" x2="${plotX + plotSize}" y2="${diagonalEndY}" stroke="#0f172a" stroke-width="4" opacity="0.8"/>`,
      `<line data-dtw-proportional-diagonal="${alignment.direction}" x1="${plotX}" y1="${diagonalStartY}" x2="${plotX + plotSize}" y2="${diagonalEndY}" stroke="#fff" stroke-width="2" stroke-dasharray="6 5"/>`,
    ].join(``);
    const pathSegments = alignment.path.slice(1).map((point, pathIndex) => {
      const previous = alignment.path[pathIndex];
      if (previous == null) {
        return ``;
      }
      const sourceOffset = point.sourceIndex - sourceMinimum;
      const previousSourceOffset = previous.sourceIndex - sourceMinimum;
      const referenceOffset = point.targetIndex - referenceMinimum;
      const previousReferenceOffset = previous.targetIndex - referenceMinimum;
      const repeatsSource = point.sourceIndex === previous.sourceIndex;
      const repeatsReference = point.targetIndex === previous.targetIndex;
      const stroke = repeatsSource
        ? `#facc15`
        : repeatsReference
          ? `#fb7185`
          : `#f8fafc`;
      const kind = repeatsSource
        ? `source-index`
        : repeatsReference
          ? `reference-index`
          : `diagonal`;
      return `<line data-dtw-path-segment="${kind}" x1="${plotX + (previousSourceOffset + 0.5) * cellWidth}" y1="${plotY + (previousReferenceOffset + 0.5) * cellHeight}" x2="${plotX + (sourceOffset + 0.5) * cellWidth}" y2="${plotY + (referenceOffset + 0.5) * cellHeight}" stroke="#0f172a" stroke-width="5" stroke-linecap="round"/><line x1="${plotX + (previousSourceOffset + 0.5) * cellWidth}" y1="${plotY + (previousReferenceOffset + 0.5) * cellHeight}" x2="${plotX + (sourceOffset + 0.5) * cellWidth}" y2="${plotY + (referenceOffset + 0.5) * cellHeight}" stroke="${stroke}" stroke-width="3" stroke-linecap="round"/>`;
    });
    const metricsY = plotY + plotSize + 50;
    const title = `Source stroke ${alignment.sourceStrokeIndex} / reference stroke ${alignment.targetStrokeIndex} / ${alignment.direction}`;
    const costGradientId = `dtw-cost-gradient-${index}`;
    return [
      `<g data-dtw-alignment="${alignment.sourceStrokeIndex}-${alignment.targetStrokeIndex}">`,
      `<rect x="${x}" y="${y}" width="${panelWidth - 12}" height="${panelHeight - 8}" fill="#f8fafc" stroke="#cbd5e1"/>`,
      `<text x="${x + 12}" y="${y + 22}" font-size="14" font-weight="600">${title}</text>`,
      `<defs><linearGradient id="${costGradientId}"><stop offset="0%" stop-color="#dbeafe"/><stop offset="100%" stop-color="#1e40db"/></linearGradient></defs>`,
      cells,
      diagonal,
      pathSegments.join(``),
      `<rect x="${plotX}" y="${plotY}" width="${plotSize}" height="${plotSize}" fill="none" stroke="#475569"/>`,
      `<text x="${plotX + plotSize / 2}" y="${plotY + plotSize + 20}" text-anchor="middle" font-size="11">Source point index (0-${sourceCount - 1})</text>`,
      `<text x="${x + 20}" y="${plotY + plotSize / 2}" text-anchor="middle" font-size="11" transform="rotate(-90 ${x + 20} ${plotY + plotSize / 2})">Reference point index (0-${referenceCount - 1})</text>`,
      `<text x="${x + 12}" y="${metricsY}" font-size="11">Path ${alignment.pathLength} cells · longest repeated-index run ${alignment.longestRepeatedIndexRun} · mean normalized index deviation ${alignment.meanNormalizedIndexDeviation.toFixed(3)}</text>`,
      `<text x="${x + 12}" y="${metricsY + 17}" font-size="9">Low</text>`,
      `<rect x="${x + 35}" y="${metricsY + 9}" width="48" height="9" fill="url(#${costGradientId})"/>`,
      `<text x="${x + 87}" y="${metricsY + 17}" font-size="9">High</text>`,
      `<line x1="${x + 124}" y1="${metricsY + 13}" x2="${x + 148}" y2="${metricsY + 13}" stroke="#0f172a" stroke-width="3" stroke-dasharray="4 3"/>`,
      `<text x="${x + 153}" y="${metricsY + 17}" font-size="9">proportional</text>`,
      `<rect x="${x + 222}" y="${metricsY + 9}" width="8" height="8" fill="#facc15"/>`,
      `<text x="${x + 234}" y="${metricsY + 17}" font-size="9">repeated source</text>`,
      `<rect x="${x + 322}" y="${metricsY + 9}" width="8" height="8" fill="#fb7185"/>`,
      `<text x="${x + 334}" y="${metricsY + 17}" font-size="9">repeated reference</text>`,
      `</g>`,
    ].join(``);
  });
  const height = panelTop + rows * panelHeight + 20;
  return {
    svg: [
      `<text x="24" y="${sectionY + 24}" font-size="18" font-weight="600">DTW alignment cost heatmaps</text>`,
      ...panels,
    ].join(``),
    height,
  };
}

function strokeCenter(
  stroke: readonly WritingStrokePoint[],
): WritingStrokePoint {
  if (stroke.length === 0) {
    return { x: 0, y: 0 };
  }
  let totalX = 0;
  let totalY = 0;
  for (const point of stroke) {
    totalX += point.x;
    totalY += point.y;
  }
  return {
    x: totalX / stroke.length,
    y: totalY / stroke.length,
  };
}

function renderStrokePresencePanel(
  geometry: ShapeContextGrade,
  diagnostics: ShapeContextStrokePresenceDiagnostics,
  sectionY: number,
): { svg: string; height: number } {
  const chartSize = 350;
  const chartY = sectionY + 100;
  const allPoints = [
    ...geometry.targetStrokes.flat(),
    ...geometry.sourceStrokes.flat(),
  ];
  const referencePoint = diagramPointMapper(allPoints, 80, chartY, chartSize);
  const handwritingPoint = diagramPointMapper(
    allPoints,
    590,
    chartY,
    chartSize,
  );
  const unmatchedHandwritingStrokes = new Set(
    diagnostics.unmatchedHandwritingStrokes.map(
      ({ handwritingStrokeIndex }) => handwritingStrokeIndex,
    ),
  );
  const referenceStrokeSvg = geometry.targetStrokes
    .map((stroke, referenceStrokeIndex) => {
      const diagnostic = diagnostics.referenceStrokes[referenceStrokeIndex];
      const matched = diagnostic?.handwritingStrokeIndex != null;
      const color = matched ? `#16a34a` : `#dc2626`;
      const center = referencePoint(strokeCenter(stroke));
      return [
        `<g data-reference-stroke-index="${referenceStrokeIndex}" data-reference-stroke-status="${matched ? `matched` : `unmatched`}">`,
        stroke.length === 0
          ? ``
          : `<path d="${pathFromPoints(stroke, referencePoint)}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
        `<text x="${center.x + 4}" y="${center.y - 4}" font-size="9" font-weight="600" fill="${color}" stroke="#fff" stroke-width="2.5" paint-order="stroke">R${referenceStrokeIndex}</text>`,
        `</g>`,
      ].join(``);
    })
    .join(``);
  const handwritingStrokeSvg = geometry.sourceStrokes
    .map((stroke, handwritingStrokeIndex) => {
      const unmatched = unmatchedHandwritingStrokes.has(handwritingStrokeIndex);
      const color = unmatched ? `#f97316` : `#2563eb`;
      const center = handwritingPoint(strokeCenter(stroke));
      return [
        `<g data-handwriting-stroke-index="${handwritingStrokeIndex}" data-handwriting-stroke-status="${unmatched ? `unmatched` : `matched`}">`,
        stroke.length === 0
          ? ``
          : `<path d="${pathFromPoints(stroke, handwritingPoint)}" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"${unmatched ? ` stroke-dasharray="6 4"` : ``}/>`,
        `<text x="${center.x + 4}" y="${center.y - 4}" font-size="9" font-weight="600" fill="${color}" stroke="#fff" stroke-width="2.5" paint-order="stroke">H${handwritingStrokeIndex}</text>`,
        `</g>`,
      ].join(``);
    })
    .join(``);
  const rowHeight = 18;
  const tableTop = chartY + chartSize + 45;
  const rowCount =
    diagnostics.referenceStrokes.length +
    diagnostics.unmatchedHandwritingStrokes.length;
  const columnHeaders = [
    [`R`, 24],
    [`Handwriting`, 75],
    [`Pair cost`, 170],
    [`DTW`, 250],
    [`Centroid`, 315],
    [`|log(H/R)|`, 395],
    [`|Δ arc|`, 480],
    [`R length`, 560],
    [`H length`, 640],
    [`Leave ref U`, 730],
    [`Pair < 2U?`, 865],
  ]
    .map(
      ([label, x]) =>
        `<text x="${x}" y="${tableTop}" font-size="9" font-weight="600">${label}</text>`,
    )
    .join(``);
  const referenceRows = diagnostics.referenceStrokes.map((stroke, index) => {
    const y = tableTop + 18 + index * rowHeight;
    const matched = stroke.handwritingStrokeIndex != null;
    const color = matched ? `#16a34a` : `#dc2626`;
    const values = [
      [`R${stroke.referenceStrokeIndex}`, 24],
      [
        stroke.handwritingStrokeIndex == null
          ? `-`
          : `H${stroke.handwritingStrokeIndex}`,
        75,
      ],
      [stroke.selectedAssignmentCost?.toFixed(3) ?? `-`, 170],
      [stroke.costComponents?.dtwCost.toFixed(3) ?? `-`, 250],
      [stroke.costComponents?.centroidDistance.toFixed(3) ?? `-`, 315],
      [stroke.costComponents?.arcLengthPenalty.toFixed(3) ?? `-`, 395],
      [stroke.arcLengthDifference?.toFixed(3) ?? `-`, 480],
      [stroke.referenceArcLength.toFixed(3), 560],
      [stroke.handwritingArcLength?.toFixed(3) ?? `-`, 640],
      [stroke.costOfLeavingReferenceUnmatched.toFixed(3), 730],
      [
        stroke.cheaperThanLeavingReferenceAndHandwritingUnmatched == null
          ? `-`
          : stroke.cheaperThanLeavingReferenceAndHandwritingUnmatched
            ? `yes`
            : `no`,
        865,
      ],
    ]
      .map(
        ([value, x]) =>
          `<text x="${x}" y="${y}" font-size="9" fill="${color}">${value}</text>`,
      )
      .join(``);
    return `<g data-reference-stroke-row="${stroke.referenceStrokeIndex}" data-reference-stroke-status="${matched ? `matched` : `unmatched`}">${values}</g>`;
  });
  const unmatchedHandwritingRows = diagnostics.unmatchedHandwritingStrokes.map(
    ({ handwritingStrokeIndex, handwritingArcLength }, index) => {
      const y =
        tableTop +
        18 +
        (diagnostics.referenceStrokes.length + index) * rowHeight;
      return `<g data-handwriting-stroke-row="${handwritingStrokeIndex}" data-handwriting-stroke-status="unmatched"><text x="75" y="${y}" font-size="9" fill="#f97316">H${handwritingStrokeIndex} · extra · arc length ${handwritingArcLength.toFixed(3)}</text></g>`;
    },
  );
  const summary = diagnostics.summary;
  const height = tableTop + 18 + rowCount * rowHeight + 20;

  return {
    svg: [
      `<rect x="12" y="${sectionY + 8}" width="1000" height="${height - sectionY - 8}" fill="#f8fafc" stroke="#cbd5e1"/>`,
      `<text x="24" y="${sectionY + 30}" font-size="18" font-weight="600">Stroke presence from global assignment</text>`,
      `<text x="24" y="${sectionY + 48}" font-size="11">Matched references ${summary.matchedReferenceStrokeCount}/${diagnostics.referenceStrokeCount} · potentially missing ${summary.unmatchedReferenceStrokeCount} · extra handwriting ${summary.unmatchedHandwritingStrokeCount} · unmatched reference arc-length fraction ${(summary.unmatchedReferenceArcLengthFraction * 100).toFixed(1)}%</text>`,
      `<text x="256" y="${chartY - 12}" text-anchor="middle" font-size="12" font-weight="600">Reference strokes</text>`,
      `<text x="766" y="${chartY - 12}" text-anchor="middle" font-size="12" font-weight="600">Handwriting strokes</text>`,
      `<circle cx="24" cy="${sectionY + 68}" r="4" fill="#16a34a"/><text x="32" y="${sectionY + 72}" font-size="9">matched reference</text>`,
      `<circle cx="134" cy="${sectionY + 68}" r="4" fill="#dc2626"/><text x="142" y="${sectionY + 72}" font-size="9">unmatched reference</text>`,
      `<circle cx="272" cy="${sectionY + 68}" r="4" fill="#2563eb"/><text x="280" y="${sectionY + 72}" font-size="9">matched handwriting</text>`,
      `<circle cx="420" cy="${sectionY + 68}" r="4" fill="#f97316"/><text x="428" y="${sectionY + 72}" font-size="9">unmatched handwriting</text>`,
      referenceStrokeSvg,
      handwritingStrokeSvg,
      columnHeaders,
      ...referenceRows,
      ...unmatchedHandwritingRows,
    ].join(``),
    height,
  };
}

function renderContrastiveAcceptancePanel({
  targetCharacter,
  geometry,
  acceptance,
  candidates,
  startY,
}: {
  targetCharacter: string;
  geometry: ShapeContextGrade;
  acceptance: HanziCharacterWritingAcceptanceDecision;
  candidates: readonly SimilarCharacterGrade[];
  startY: number;
}): { svg: string; height: number } {
  const check = acceptance.contrastiveCheck;
  const rowHeight = 19;
  const headerY = startY + 72;
  const targetRowY = headerY + 19;
  const candidateRowsY = targetRowY + rowHeight;
  const height = candidateRowsY + candidates.length * rowHeight + 10;
  const checkStatus = check.ran
    ? check.passed
      ? candidates.length === 0
        ? `PASS (no candidates; vacuous)`
        : `PASS`
      : `FAIL`
    : `NOT RUN (${check.skippedReason})`;
  const rejectionLabel =
    acceptance.rejectionCondition === `missingReferenceStroke`
      ? `missing reference stroke`
      : acceptance.rejectionCondition === `primaryShapeThresholdFailed`
        ? `primary shape threshold not met`
        : acceptance.rejectionCondition === `candidateShapeSimilarityNotLower`
          ? `candidate shape similarity was not lower`
          : `none`;
  const marginText =
    check.observedMargin == null
      ? `no candidate margin`
      : `observed margin ${check.observedMargin.toFixed(4)}`;
  const headers = [
    [`Character`, 24],
    [`Shape similarity`, 174],
    [`Contrastive comparison`, 360],
  ]
    .map(
      ([label, x]) =>
        `<text x="${x}" y="${headerY}" font-size="10" font-weight="600">${label}</text>`,
    )
    .join(``);

  function scoreRow({
    character,
    shapeSimilarity,
    comparison,
    y,
    kind,
  }: {
    character: string;
    shapeSimilarity: number;
    comparison: string;
    y: number;
    kind: `target` | `candidate`;
  }): string {
    return [
      `<rect data-contrastive-row="${kind}" x="16" y="${y - 13}" width="992" height="${rowHeight}" fill="${kind === `target` ? `#e0f2fe` : `#f8fafc`}" rx="2"/>`,
      `<text x="24" y="${y}" font-size="11">${escapeXml(character)}</text>`,
      `<text x="174" y="${y}" font-size="11">${shapeSimilarity.toFixed(4)}</text>`,
      `<text x="360" y="${y}" font-size="11">${escapeXml(comparison)}</text>`,
    ].join(``);
  }

  const targetRow = scoreRow({
    character: `${targetCharacter} (target)`,
    shapeSimilarity: geometry.shapeSimilarity,
    comparison: `target`,
    y: targetRowY,
    kind: `target`,
  });
  const candidateRows = candidates
    .map(({ hanzi, geometry: candidateGeometry }, index) => {
      const decision = check.candidates[index];
      if (decision == null || decision.character !== hanzi) {
        throw new Error(`Contrastive candidate diagnostics are out of sync`);
      }
      const comparison = decision.evaluated
        ? decision.passed
          ? `PASS (${decision.observedMargin?.toFixed(4)})`
          : `FAIL (${decision.observedMargin?.toFixed(4)})`
        : `not evaluated`;
      return scoreRow({
        character: hanzi,
        shapeSimilarity: candidateGeometry.shapeSimilarity,
        comparison,
        y: candidateRowsY + index * rowHeight,
        kind: `candidate`,
      });
    })
    .join(``);

  return {
    svg: [
      `<g data-contrastive-acceptance="">`,
      `<text x="24" y="${startY + 18}" font-size="14" font-weight="600">Contrastive acceptance check</text>`,
      `<text x="24" y="${startY + 38}" font-size="11">Primary shape threshold ${acceptance.primaryShapeThreshold.passed ? `PASS` : `FAIL`}: ${acceptance.primaryShapeThreshold.observedValue.toFixed(4)} ${acceptance.primaryShapeThreshold.comparisonOperator} ${acceptance.primaryShapeThreshold.requiredValue.toFixed(2)} · contrastive check ${checkStatus} using ${check.metric} ${check.comparisonOperator} ${check.requiredMargin} (${marginText})</text>`,
      `<text x="24" y="${startY + 54}" font-size="11">Final ${acceptance.finalAccepted ? `ACCEPT` : `REJECT`} · rejection condition: ${rejectionLabel}${check.rejectingCandidateCharacter == null ? `` : ` · first rejecting candidate: ${escapeXml(check.rejectingCandidateCharacter)}`}</text>`,
      headers,
      targetRow,
      candidateRows,
      `</g>`,
    ].join(``),
    height,
  };
}

function renderStrokeCompletenessPanel({
  acceptance,
  startY,
}: {
  acceptance: HanziCharacterWritingAcceptanceDecision;
  startY: number;
}): { svg: string; height: number } {
  const { strokeCompleteness } = acceptance;
  const unmatchedIndices =
    strokeCompleteness.unmatchedReferenceStrokeIndices.length === 0
      ? `none`
      : strokeCompleteness.unmatchedReferenceStrokeIndices.join(`, `);
  const rejectionReason = acceptance.rejectionCondition ?? `none`;
  const height = startY + 56;

  return {
    svg: [
      `<g data-stroke-completeness="" data-stroke-completeness-passed="${strokeCompleteness.passed}" data-stroke-completeness-final="${acceptance.finalAccepted}" data-stroke-completeness-reason="${rejectionReason}">`,
      `<text x="24" y="${startY + 18}" font-size="14" font-weight="600">Stroke-completeness check</text>`,
      `<text x="24" y="${startY + 38}" font-size="11">Completeness ${strokeCompleteness.passed ? `PASS` : `FAIL`} · reference strokes ${strokeCompleteness.referenceStrokeCount} · matched ${strokeCompleteness.matchedReferenceStrokeCount} · unmatched ${strokeCompleteness.unmatchedReferenceStrokeCount} · unmatched indices: ${escapeXml(unmatchedIndices)}</text>`,
      `<text x="24" y="${startY + 54}" font-size="11">Final ${acceptance.finalAccepted ? `ACCEPT` : `REJECT`} · rejection reason: ${rejectionReason}</text>`,
      `</g>`,
    ].join(``),
    height,
  };
}

function formatIssueExpectation(expectation: WritingIssueExpectation): string {
  const segment = (
    label: string,
    value: WritingIssueExpectation[`handwriting`],
  ): string =>
    value == null
      ? ``
      : ` · ${label} #${value.strokeIndex + 1}${
          value.start == null && value.end == null
            ? ``
            : ` ${value.start?.toFixed(2) ?? `*`}–${value.end?.toFixed(2) ?? `*`}`
        }`;
  return `${expectation.kind}${segment(`handwriting`, expectation.handwriting)}${segment(`reference`, expectation.reference)}`;
}

function writingIssueLabel(kind: WritingIssue[`kind`]): string {
  switch (kind) {
    case `missing-stroke`:
      return `Missing stroke`;
    case `extra-stroke`:
      return `Extra stroke`;
    case `reversed-stroke`:
      return `Reversed stroke`;
  }
}

function renderWritingIssuePanel({
  drawnStrokes,
  referencePaths,
  geometry,
  expectedIssues,
  unexpectedIssues,
  startY,
}: {
  drawnStrokes: readonly (readonly WritingStrokePoint[])[];
  referencePaths: readonly string[];
  geometry: ShapeContextGrade;
  expectedIssues?: readonly WritingIssueExpectation[];
  unexpectedIssues?: readonly WritingIssueExpectation[];
  startY: number;
}): { svg: string; height: number } {
  const expectationStatus = evaluateWritingIssueExpectations(
    geometry.issues,
    expectedIssues,
    unexpectedIssues,
  );
  const handwritingMapper = diagramPointMapper(
    drawnStrokes.flat(),
    32,
    startY + 52,
    448,
  );
  const referenceGeometry = referencePaths.map((path) =>
    extractReferenceStrokeSegment(path, 0, 1),
  );
  const referenceMapper = diagramPointMapper(
    referenceGeometry.flat(),
    544,
    startY + 52,
    448,
  );
  const handwritingBase = drawnStrokes
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke, handwritingMapper)}" fill="none" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join(``);
  const referenceBase = referenceGeometry
    .map(
      (stroke) =>
        `<path d="${pathFromPoints(stroke, referenceMapper)}" fill="none" stroke="#cbd5e1" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join(``);
  const handwritingLabels = drawnStrokes
    .map((stroke, strokeIndex) => {
      const start = stroke[0];
      if (start == null) {
        return ``;
      }
      const point = handwritingMapper(start);
      return `<g data-issue-stroke-label="handwriting-${strokeIndex}"><circle cx="${point.x + 8}" cy="${point.y - 8}" r="11" fill="#fff" stroke="#334155"/><text x="${point.x + 8}" y="${point.y - 4}" text-anchor="middle" font-size="10" font-weight="600">${strokeIndex + 1}</text></g>`;
    })
    .join(``);
  const referenceLabels = referenceGeometry
    .map((stroke, strokeIndex) => {
      const start = stroke[0];
      if (start == null) {
        return ``;
      }
      const point = referenceMapper(start);
      return `<g data-issue-stroke-label="reference-${strokeIndex}"><circle cx="${point.x + 8}" cy="${point.y - 8}" r="11" fill="#fff" stroke="#334155"/><text x="${point.x + 8}" y="${point.y - 4}" text-anchor="middle" font-size="10" font-weight="600">${strokeIndex + 1}</text></g>`;
    })
    .join(``);
  const highlights = geometry.issues
    .flatMap((issue) => {
      const renderHighlight = (
        kind: `handwriting` | `reference`,
        points: WritingStrokePoint[],
        mapper: (point: WritingStrokePoint) => WritingStrokePoint,
      ): string | null => {
        if (points.length === 0) {
          return null;
        }
        const color = kind === `handwriting` ? `#ef4444` : `#22c55e`;
        if (points.length === 1) {
          const point = mapper(points[0] ?? { x: 0, y: 0 });
          return `<circle data-issue-highlight="${issue.kind}-${kind}" cx="${point.x}" cy="${point.y}" r="8" fill="${color}" stroke="#fff" stroke-width="2"/>`;
        }
        return `<path data-issue-highlight="${issue.kind}-${kind}" d="${pathFromPoints(points, mapper)}" fill="none" stroke="${color}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
      };
      const output: string[] = [];
      if (issue.handwriting != null) {
        const stroke = drawnStrokes[issue.handwriting.strokeIndex];
        if (stroke != null) {
          const highlight = renderHighlight(
            `handwriting`,
            extractWritingStrokeSegment(
              stroke,
              issue.handwriting.start,
              issue.handwriting.end,
            ),
            handwritingMapper,
          );
          if (highlight != null) {
            output.push(highlight);
          }
        }
      }
      if (issue.reference != null) {
        const path = referencePaths[issue.reference.strokeIndex];
        if (path != null) {
          const highlight = renderHighlight(
            `reference`,
            extractReferenceStrokeSegment(
              path,
              issue.reference.start,
              issue.reference.end,
            ),
            referenceMapper,
          );
          if (highlight != null) {
            output.push(highlight);
          }
        }
      }
      return output;
    })
    .join(``);
  const issueText =
    geometry.issues.length === 0
      ? [
          `<text x="24" y="${startY + 526}" font-size="12">No issues detected.</text>`,
        ]
      : geometry.issues.flatMap((issue, issueIndex) => {
          const issueLineOffset = issueIndex * 32;
          const handwriting =
            issue.handwriting == null
              ? ``
              : `Handwriting #${issue.handwriting.strokeIndex + 1} ${issue.handwriting.start.toFixed(2)}–${issue.handwriting.end.toFixed(2)}`;
          const reference =
            issue.reference == null
              ? ``
              : `Reference #${issue.reference.strokeIndex + 1} ${issue.reference.start.toFixed(2)}–${issue.reference.end.toFixed(2)}`;
          const relation = [handwriting, reference].filter(Boolean).join(` → `);
          const direction =
            issue.kind === `reversed-stroke`
              ? ` · drawn opposite to reference`
              : ``;
          return [
            `<text x="24" y="${startY + 526 + issueLineOffset}" font-size="12" font-weight="600">${writingIssueLabel(issue.kind)}</text>`,
            `<text x="40" y="${startY + 542 + issueLineOffset}" font-size="11">${escapeXml(relation + direction)}</text>`,
          ];
        });
  const expectationLines = [
    ...(expectedIssues ?? []).map((issue, index) => ({
      expectation: issue,
      satisfied: expectationStatus.expected[index]?.satisfied ?? false,
      label: `Expected`,
    })),
    ...(unexpectedIssues ?? []).map((issue, index) => ({
      expectation: issue,
      satisfied: expectationStatus.unexpected[index]?.satisfied ?? false,
      label: `Prohibited`,
    })),
  ];
  const expectationTop =
    startY + 526 + Math.max(0, geometry.issues.length * 32);
  const expectationText = expectationStatus.declared
    ? [
        `<text x="24" y="${expectationTop + 20}" font-size="12" font-weight="600">Issue expectations ${expectationStatus.allSatisfied ? `satisfied` : `violated`}</text>`,
        ...expectationLines.map(
          ({ expectation, satisfied, label }, index) =>
            `<text x="40" y="${expectationTop + 40 + index * 18}" font-size="11">${label} ${satisfied ? `satisfied` : `violated`}: ${escapeXml(formatIssueExpectation(expectation))}</text>`,
        ),
      ]
    : [
        `<text x="24" y="${expectationTop + 20}" font-size="12">No issue expectations declared.</text>`,
      ];
  const height =
    expectationTop + 30 + Math.max(1, expectationLines.length) * 18;

  return {
    svg: [
      `<g data-writing-issues="" data-issue-count="${geometry.issues.length}" data-issue-expectations-declared="${expectationStatus.declared}" data-issue-expectations-satisfied="${expectationStatus.allSatisfied}">`,
      `<text x="24" y="${startY + 24}" font-size="18" font-weight="600">Localized writing issues (${geometry.issues.length})</text>`,
      `<rect x="24" y="${startY + 34}" width="476" height="458" fill="#f8fafc" stroke="#cbd5e1"/>`,
      `<rect x="524" y="${startY + 34}" width="476" height="458" fill="#f8fafc" stroke="#cbd5e1"/>`,
      `<text x="262" y="${startY + 50}" text-anchor="middle" font-size="12">Handwriting · red highlights</text>`,
      `<text x="762" y="${startY + 50}" text-anchor="middle" font-size="12">Reference · green highlights</text>`,
      handwritingBase,
      referenceBase,
      highlights,
      handwritingLabels,
      referenceLabels,
      ...issueText,
      ...expectationText,
      `</g>`,
    ].join(``),
    height,
  };
}

export function renderShapeContextGraderDiagnosticSvg({
  fixtureId,
  targetCharacter,
  drawnStrokes,
  referencePaths,
  geometry,
  acceptance,
  contrastiveCandidates,
  expectedAcceptance,
  acceptanceThreshold,
  expectedIssues,
  unexpectedIssues,
}: {
  fixtureId: string;
  targetCharacter: string;
  drawnStrokes: readonly (readonly WritingStrokePoint[])[];
  referencePaths: readonly string[];
  geometry: ShapeContextGrade;
  acceptance: HanziCharacterWritingAcceptanceDecision;
  contrastiveCandidates: readonly SimilarCharacterGrade[];
  expectedAcceptance: boolean;
  acceptanceThreshold: number;
  expectedIssues?: readonly WritingIssueExpectation[];
  unexpectedIssues?: readonly WritingIssueExpectation[];
}): string {
  const rawPoint = drawingPointMapper(drawnStrokes, 0);
  const overlayOffsetY = 576;
  const issueExtraStrokeIndices = new Set(
    geometry.issues.flatMap((issue) =>
      issue.kind === `extra-stroke` && issue.handwriting != null
        ? [issue.handwriting.strokeIndex]
        : [],
    ),
  );
  const issueMissingStrokeIndices = new Set(
    geometry.issues.flatMap((issue) =>
      issue.kind === `missing-stroke` && issue.reference != null
        ? [issue.reference.strokeIndex]
        : [],
    ),
  );
  const strokeLabel = (
    kind: `handwriting` | `reference`,
    strokeIndex: number,
    point: WritingStrokePoint,
    mapper: (point: WritingStrokePoint) => WritingStrokePoint,
  ): string => {
    const mapped = mapper(point);
    return `<g data-stroke-number="${kind}-${strokeIndex}"><circle cx="${mapped.x + 8}" cy="${mapped.y - 8}" r="11" fill="#fff" stroke="#334155"/><text x="${mapped.x + 8}" y="${mapped.y - 4}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="600" fill="#0f172a">${strokeIndex + 1}</text></g>`;
  };
  const sourcePaths = drawnStrokes.map((stroke, strokeIndex) => {
    const color = issueExtraStrokeIndices.has(strokeIndex)
      ? `#ef4444`
      : `#159fe8`;
    return `<path d="${pathFromPoints(stroke, rawPoint)}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`;
  });
  const sourceLabels = drawnStrokes
    .map((stroke, strokeIndex) => {
      const start = stroke.find(
        (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
      );
      return start == null
        ? ``
        : strokeLabel(`handwriting`, strokeIndex, start, rawPoint);
    })
    .join(``);
  const referencePathsSvg = referencePaths
    .map((path, strokeIndex) => {
      const color = issueMissingStrokeIndices.has(strokeIndex)
        ? `#22c55e`
        : `#334155`;
      return `<path d="${escapeXml(path)}" fill="none" stroke="${color}" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join(``);
  const referenceLabels = referencePaths
    .map((path, strokeIndex) => {
      const start = extractReferenceStrokeSegment(path, 0, 0)[0];
      return start == null
        ? ``
        : `<g transform="translate(536 52) scale(0.453125)">${strokeLabel(`reference`, strokeIndex, start, (point) => point)}</g>`;
    })
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
    .map((stroke, compactIndex) => {
      const strokeIndex =
        geometry.targetStrokeOriginalIndices[compactIndex] ?? compactIndex;
      const color = issueMissingStrokeIndices.has(strokeIndex)
        ? `#22c55e`
        : `#334155`;
      return `<path d="${pathFromPoints(stroke, diagramPoint)}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join(``);
  const normalizedSourcePaths = geometry.sourceStrokes
    .map((stroke, compactIndex) => {
      const strokeIndex =
        geometry.sourceStrokeOriginalIndices[compactIndex] ?? compactIndex;
      const color = issueExtraStrokeIndices.has(strokeIndex)
        ? `#ef4444`
        : `#159fe8`;
      return `<path d="${pathFromPoints(stroke, diagramPoint)}" fill="none" stroke="${color}" stroke-width="3" stroke-dasharray="6 4" opacity="0.8"/>`;
    })
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
      if (sourcePoint == null) {
        return ``;
      }
      const start = diagramPoint(sourcePoint);
      const end = diagramPoint(correspondence.targetPoint);
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
    {
      key: `initialMatchingError`,
      label: `Initial matching error`,
      value: scoreContributions.initialMatchingError,
    },
    {
      key: `residualMatchingError`,
      label: `Residual matching error`,
      value: scoreContributions.residualMatchingError,
    },
    {
      key: `missingReferenceStrokePenalty`,
      label: `Missing reference stroke penalty`,
      value: scoreContributions.missingReferenceStrokePenalty,
    },
    {
      key: `extraHandwritingStrokePenalty`,
      label: `Extra handwriting stroke penalty`,
      value: scoreContributions.extraHandwritingStrokePenalty,
    },
    {
      key: `emptyGeometryPenalty`,
      label: `Empty geometry penalty`,
      value: scoreContributions.emptyGeometryPenalty,
    },
  ];
  const totalContribution = contributions.reduce(
    (total, { value }) => total + value,
    0,
  );
  const contributionChartX = 300;
  const contributionChartWidth = 560;
  const contributionRowsTop = 1760;
  const contributionRowHeight = 18;
  const contributionBarHeight = 10;
  const contributionChartBottom =
    contributionRowsTop +
    (contributions.length - 1) * contributionRowHeight +
    contributionBarHeight;
  const contributionTracks = contributions
    .map(
      (_, index) =>
        `<rect data-score-contribution-track="" x="${contributionChartX}" y="${contributionRowsTop + index * contributionRowHeight}" width="${contributionChartWidth}" height="${contributionBarHeight}" fill="#e2e8f0" rx="2"/>`,
    )
    .join(``);
  const contributionTicks = [0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const x = contributionChartX + contributionChartWidth * fraction;
      const label = `${Math.round(fraction * 100)}%`;
      return [
        `<line x1="${x}" y1="${contributionRowsTop - 3}" x2="${x}" y2="${contributionChartBottom + 3}" stroke="#94a3b8" stroke-width="1" stroke-dasharray="2 3"/>`,
        `<text x="${x}" y="1748" text-anchor="middle" font-size="10">${label}</text>`,
      ].join(``);
    })
    .join(``);
  const contributionBars = contributions
    .map(({ key, value }, index) => {
      const share = totalContribution > 0 ? value / totalContribution : 0;
      const y = contributionRowsTop + index * contributionRowHeight;
      const barWidth = contributionChartWidth * share;
      return `<rect data-score-contribution="${key}" x="${contributionChartX}" y="${y}" width="${barWidth.toFixed(2)}" height="${contributionBarHeight}" fill="#159fe8" rx="2"/>`;
    })
    .join(``);
  const contributionLabels = contributions
    .map(({ label, value }, index) => {
      const share =
        totalContribution > 0 ? (value / totalContribution) * 100 : 0;
      const y = contributionRowsTop + index * contributionRowHeight + 9;
      return [
        `<text x="24" y="${y}" font-size="12">${label}</text>`,
        `<text x="880" y="${y}" font-size="12">${value.toFixed(3)} · ${share.toFixed(1)}%</text>`,
      ].join(``);
    })
    .join(``);
  const contrastivePanel = renderContrastiveAcceptancePanel({
    targetCharacter,
    geometry,
    acceptance,
    candidates: contrastiveCandidates,
    startY: 1940,
  });
  const strokeCompletenessPanel = renderStrokeCompletenessPanel({
    acceptance,
    startY: contrastivePanel.height + 8,
  });
  const dtwHeatmaps = renderDtwAlignmentHeatmaps(
    geometry.dtwAlignments,
    strokeCompletenessPanel.height + 12,
  );
  const strokePresence = diagnoseShapeContextStrokePresence(geometry);
  const strokePresencePanel = renderStrokePresencePanel(
    geometry,
    strokePresence,
    dtwHeatmaps.height,
  );
  const writingIssuePanel = renderWritingIssuePanel({
    drawnStrokes,
    referencePaths,
    geometry,
    expectedIssues,
    unexpectedIssues,
    startY: strokePresencePanel.height + 12,
  });
  const svgHeight = writingIssuePanel.height;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="${svgHeight}" viewBox="0 0 1024 ${svgHeight}" role="img" aria-labelledby="title description">`,
    `<title id="title">Handwriting grade diagnostics for ${escapeXml(fixtureId)}</title>`,
    `<desc id="description">Raw handwriting and reference geometry side by side with stroke numbers, a normalized Shape Context and TPS registration diagram, scoring and acceptance diagnostics, stroke-presence diagnostics, and localized writing issue highlights with fixture expectation results.</desc>`,
    `<rect width="1024" height="${svgHeight}" fill="#fff"/>`,
    `<rect x="0.5" y="0.5" width="511" height="511" fill="#f8fafc" stroke="#cbd5e1"/>`,
    `<rect x="512.5" y="0.5" width="511" height="511" fill="#f8fafc" stroke="#cbd5e1"/>`,
    `<rect x="0.5" y="576.5" width="1023" height="1023" fill="#f8fafc" stroke="#cbd5e1"/>`,
    sourcePaths.join(``),
    sourceLabels,
    `<g transform="translate(536 52) scale(0.453125)">${referencePathsSvg}</g>`,
    referenceLabels,
    `<g>${sourceGridPaths}${registeredGridPaths}${targetPaths}${normalizedSourcePaths}${registeredPaths}${correspondenceLines}${unmatchedSourcePoints}${unmatchedTargetPoints}</g>`,
    `<g font-family="sans-serif" font-size="18" fill="#0f172a">`,
    `<text x="256" y="540" text-anchor="middle">Raw handwriting · ${escapeXml(targetCharacter)}</text>`,
    `<text x="768" y="540" text-anchor="middle">Reference geometry</text>`,
    `<text x="512" y="1624" text-anchor="middle">Normalized matches and TPS registration</text>`,
    `<text x="512" y="1645" text-anchor="middle" font-size="12">Normalized source before TPS (blue) · registered source (purple) · reference (gray)</text>`,
    `<text x="24" y="1670" font-size="14">Expected ${expectedAcceptance ? `accept` : `reject`} · actual ${acceptance.finalAccepted ? `accept` : `reject`} · shape similarity ${geometry.shapeSimilarity.toFixed(4)} / threshold ${acceptanceThreshold.toFixed(2)} · rejection reason ${acceptance.rejectionCondition ?? `none`}</text>`,
    `<text x="24" y="1692" font-size="14">TPS alpha ${geometry.deformationAlpha.toFixed(4)} · bending energy ${geometry.bendingEnergy.toFixed(4)} · affine distortion ${geometry.affineDistortion.toFixed(4)} · rotation ${geometry.rotationDegrees.toFixed(2)}° · samples ${geometry.sampleCount} · matches ${geometry.correspondences.length}</text>`,
    `<text x="24" y="1710" font-size="12">Missing reference stroke fraction ${(geometry.missingReferenceStrokeFraction * 100).toFixed(1)}% × weight ${geometry.options.missingReferenceStrokePenaltyWeight.toFixed(2)} = ${scoreContributions.missingReferenceStrokePenalty.toFixed(3)} · extra handwriting fraction ${(geometry.extraHandwritingStrokeFraction * 100).toFixed(1)}% × weight ${geometry.options.extraHandwritingStrokePenaltyWeight.toFixed(2)} = ${scoreContributions.extraHandwritingStrokePenalty.toFixed(3)}</text>`,
    `<text x="24" y="1732" font-size="14">Weighted score contributions (share of total cost)</text>`,
    contributionTracks,
    contributionTicks,
    contributionBars,
    contributionLabels,
    `</g>`,
    contrastivePanel.svg,
    strokeCompletenessPanel.svg,
    dtwHeatmaps.svg,
    strokePresencePanel.svg,
    writingIssuePanel.svg,
    `</svg>`,
  ].join(``);
}
