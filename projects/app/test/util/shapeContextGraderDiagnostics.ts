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
  calculateShapeContextSustainedTangentRegions,
  extractReferenceStrokeSegment,
  extractWritingStrokeSegment,
  resampleShapeContextStrokeByArcLength,
  shapeContextSampledTangentDirections,
} from "#util/shapeContextGrader.ts";

/** Serialized points use [x, y]; point indices flatten strokes in stroke and point order. */
export type ShapeContextDiagnosticPoint = [x: number, y: number];

export interface ShapeContextGraderDiagnostic {
  /** Bump when changing this generated report format. */
  schemaVersion: 24;
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
  strokeGeometry: ShapeContextStrokeGeometryDiagnostics;
  trajectory: ShapeContextTrajectoryDiagnostics;
  terminalHooks: ShapeContextTerminalHookDiagnostics;
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
      | `originalSourceStrokes`
      | `originalTargetStrokes`
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

export interface ShapeContextStrokeGeometryMetric {
  handwritingStrokeIndex: number;
  referenceStrokeIndex: number;
  meanPointDistance: number;
  maximumPointDistance: number;
  p90PointDistance: number;
  handwritingArcLength: number;
  referenceArcLength: number;
  relativeArcLength: number;
  dtwCost: number;
  pairCost: number;
}

export interface ShapeContextStrokeGeometryDiagnostics {
  matchedStrokeCount: number;
  meanStrokeError: number;
  maximumStrokeError: number;
  p90StrokeError: number;
  maximumIndividualPointDistance: number;
  arcLengthWeightedMeanStrokeError: number;
  strokeFractionsExceedingThreshold: Record<
    `0.1` | `0.15` | `0.2` | `0.25` | `0.3`,
    number
  >;
  individualStrokes: ShapeContextStrokeGeometryMetric[];
}

export interface ShapeContextTrajectoryBend {
  fraction: number;
  signedAngleDegrees: number;
  scale: number;
}

export interface ShapeContextSustainedMismatchRegion {
  startFraction: number;
  endFraction: number;
  lengthFraction: number;
  mismatchSampleCount: number;
  isolatedSpike: boolean;
}

export interface ShapeContextSustainedMismatchThreshold {
  thresholdDegrees: number;
  totalMismatchFraction: number;
  longestRawRegionLengthFraction: number;
  rawRegions: ShapeContextSustainedMismatchRegion[];
  sustainedRegionsByMinimumLength: Record<
    `0.05` | `0.1` | `0.15` | `0.2`,
    {
      minimumLengthFraction: number;
      longestRegionLengthFraction: number;
      totalMismatchFraction: number;
      regionCount: number;
      regions: ShapeContextSustainedMismatchRegion[];
    }
  >;
}

export interface ShapeContextTrajectoryStrokeMetric {
  handwritingStrokeIndex: number;
  referenceStrokeIndex: number;
  direction: `forward` | `reverse`;
  meanTangentMismatchDegrees: number;
  p90TangentMismatchDegrees: number;
  maximumTangentMismatchDegrees: number;
  sustainedMismatch: Record<
    `30` | `45` | `60` | `75` | `90`,
    ShapeContextSustainedMismatchThreshold
  >;
  turning: Record<
    `0.05` | `0.1` | `0.2`,
    {
      handwritingTotalAbsoluteTurningDegrees: number;
      referenceTotalAbsoluteTurningDegrees: number;
      handwritingNetTurningDegrees: number;
      referenceNetTurningDegrees: number;
      totalAbsoluteTurningDifferenceDegrees: number;
      netTurningDifferenceDegrees: number;
    }
  >;
  handwritingBends: ShapeContextTrajectoryBend[];
  referenceBends: ShapeContextTrajectoryBend[];
  unmatchedHandwritingBends: ShapeContextTrajectoryBend[];
  unmatchedReferenceBends: ShapeContextTrajectoryBend[];
  sampledFractions: number[];
  handwritingSampledTangentsDegrees: number[];
  referenceSampledTangentsDegrees: number[];
  tangentMismatchDegrees: number[];
}

export interface ShapeContextTerminalHookMeasurement {
  terminalTurnDegrees: number;
  terminalSegmentLengthFraction: number;
  terminalSegmentStartFraction: number;
  confidence: number;
  classification: `present` | `ambiguous` | `absent`;
  simplifiedPointCount: number;
}

export interface ShapeContextTerminalHookPair {
  handwritingStrokeIndex: number;
  referenceStrokeIndex: number;
  direction: `forward` | `reverse`;
  reference: ShapeContextTerminalHookMeasurement;
  handwriting: ShapeContextTerminalHookMeasurement;
  observation:
    | `reference-hook-present-handwriting-hook-present`
    | `reference-hook-present-handwriting-hook-missing`
    | `reference-hook-present-handwriting-hook-malformed`
    | `reference-hook-ambiguous`
    | `reference-hook-not-detected`;
  terminalTurnDifferenceDegrees: number;
  terminalLengthRatioDifference: number;
}

export interface ShapeContextTerminalHookDiagnostics {
  matchedStrokeCount: number;
  pairs: ShapeContextTerminalHookPair[];
}

export interface ShapeContextTrajectoryDiagnostics {
  matchedStrokeCount: number;
  meanStrokeTangentMismatchDegrees: number;
  p90StrokeTangentMismatchDegrees: number;
  maximumStrokeTangentMismatchDegrees: number;
  unmatchedHandwritingBendCount: number;
  unmatchedReferenceBendCount: number;
  individualStrokes: ShapeContextTrajectoryStrokeMetric[];
  sustainedMismatch: Record<
    `30` | `45` | `60` | `75` | `90`,
    Record<
      `0.05` | `0.1` | `0.15` | `0.2`,
      {
        minimumLengthFraction: number;
        maximumSustainedMismatchLengthFraction: number;
        maximumTotalMismatchFraction: number;
        strokeCountWithSustainedMismatch: number;
        worstHandwritingStrokeIndex: number | null;
        worstReferenceStrokeIndex: number | null;
      }
    >
  >;
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const position = fraction * (sorted.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sorted[lowerIndex] ?? 0;
  const upper = sorted[upperIndex] ?? lower;
  return lower + (upper - lower) * (position - lowerIndex);
}

function calculateSustainedMismatch(
  tangentMismatchDegrees: readonly number[],
  thresholdDegrees: number,
): ShapeContextSustainedMismatchThreshold {
  const rawRegions = calculateShapeContextSustainedTangentRegions(
    tangentMismatchDegrees,
    thresholdDegrees,
    0,
  );
  const mismatchedSampleCount = tangentMismatchDegrees.filter(
    (mismatch) => mismatch >= thresholdDegrees,
  ).length;
  const sustainedRegionsByMinimumLength = Object.fromEntries(
    ([0.05, 0.1, 0.15, 0.2] as const).map((minimumLengthFraction) => {
      const regions = rawRegions.filter(
        (region) => region.lengthFraction >= minimumLengthFraction,
      );
      let longestRegionLengthFraction = 0;
      for (const region of regions) {
        longestRegionLengthFraction = Math.max(
          longestRegionLengthFraction,
          region.lengthFraction,
        );
      }
      return [
        String(minimumLengthFraction),
        {
          minimumLengthFraction,
          longestRegionLengthFraction,
          totalMismatchFraction: tangentsMismatchFraction(
            tangentMismatchDegrees,
            thresholdDegrees,
          ),
          regionCount: regions.length,
          regions,
        },
      ];
    }),
  ) as ShapeContextSustainedMismatchThreshold[`sustainedRegionsByMinimumLength`];
  let longestRawRegionLengthFraction = 0;
  for (const region of rawRegions) {
    longestRawRegionLengthFraction = Math.max(
      longestRawRegionLengthFraction,
      region.lengthFraction,
    );
  }

  return {
    thresholdDegrees,
    totalMismatchFraction:
      tangentMismatchDegrees.length === 0
        ? 0
        : mismatchedSampleCount / tangentMismatchDegrees.length,
    longestRawRegionLengthFraction,
    rawRegions,
    sustainedRegionsByMinimumLength,
  };
}

function tangentsMismatchFraction(
  tangentMismatchDegrees: readonly number[],
  thresholdDegrees: number,
): number {
  if (tangentMismatchDegrees.length === 0) {
    return 0;
  }
  return (
    tangentMismatchDegrees.filter((mismatch) => mismatch >= thresholdDegrees)
      .length / tangentMismatchDegrees.length
  );
}

function resampleStrokeByArcLength(
  stroke: readonly WritingStrokePoint[],
  pointCount = 33,
): WritingStrokePoint[] {
  return resampleShapeContextStrokeByArcLength(stroke, pointCount);
}

function normalizedAngleDegrees(radians: number): number {
  let degrees = (radians * 180) / Math.PI;
  while (degrees > 180) {
    degrees -= 360;
  }
  while (degrees < -180) {
    degrees += 360;
  }
  return degrees;
}

function absoluteAngleDifferenceDegrees(left: number, right: number): number {
  const difference = normalizedAngleDegrees(((left - right) * Math.PI) / 180);
  return Math.abs(difference);
}

function sampledTangentDirections(
  sampledStroke: readonly WritingStrokePoint[],
  windowFraction = 0.1,
): number[] {
  return shapeContextSampledTangentDirections(sampledStroke, windowFraction);
}

function strokePointDistanceToLine(
  point: WritingStrokePoint,
  start: WritingStrokePoint,
  end: WritingStrokePoint,
): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }
  const fraction =
    ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const closestX = start.x + fraction * dx;
  const closestY = start.y + fraction * dy;
  return Math.hypot(point.x - closestX, point.y - closestY);
}

function simplifyPolyline(
  stroke: readonly WritingStrokePoint[],
  epsilonFraction: number,
): WritingStrokePoint[] {
  if (stroke.length <= 2) {
    return [...stroke];
  }
  const totalLength = strokeArcLength(stroke);
  const epsilon = totalLength * epsilonFraction;
  const keep = new Uint8Array(stroke.length);
  keep[0] = 1;
  keep[stroke.length - 1] = 1;
  const pending: Array<{ start: number; end: number }> = [
    { start: 0, end: stroke.length - 1 },
  ];
  while (pending.length > 0) {
    const range = pending.pop();
    if (range == null) {
      break;
    }
    const start = stroke[range.start];
    const end = stroke[range.end];
    if (start == null || end == null) {
      continue;
    }
    let maximumDistance = 0;
    let maximumIndex = -1;
    for (let index = range.start + 1; index < range.end; index++) {
      const point = stroke[index];
      if (point == null) {
        continue;
      }
      const distance = strokePointDistanceToLine(point, start, end);
      if (distance > maximumDistance) {
        maximumDistance = distance;
        maximumIndex = index;
      }
    }
    if (maximumIndex >= 0 && maximumDistance > epsilon) {
      keep[maximumIndex] = 1;
      pending.push(
        { start: range.start, end: maximumIndex },
        { start: maximumIndex, end: range.end },
      );
    }
  }
  const result: WritingStrokePoint[] = [];
  for (let index = 0; index < stroke.length; index++) {
    if (keep[index] === 1) {
      const point = stroke[index];
      if (point != null) {
        result.push(point);
      }
    }
  }
  return result;
}

function terminalHookMeasurement(
  stroke: readonly WritingStrokePoint[],
): ShapeContextTerminalHookMeasurement {
  if (stroke.length < 2) {
    return {
      terminalTurnDegrees: 0,
      terminalSegmentLengthFraction: 0,
      terminalSegmentStartFraction: 1,
      confidence: 0,
      classification: `absent`,
      simplifiedPointCount: stroke.length,
    };
  }
  const sampled = resampleStrokeByArcLength([...stroke]);
  const totalLength = strokeArcLength(sampled);
  let bestTurn = 0;
  let bestStartFraction = 1;
  let bestLengthRatio = 0;
  let bestConfidence = 0;
  for (let splitIndex = 21; splitIndex <= 29; splitIndex++) {
    const splitFraction = splitIndex / 32;
    const mainStartIndex = Math.max(0, splitIndex - Math.round(0.1 * 32));
    const mainStart = sampled[mainStartIndex];
    const split = sampled[splitIndex];
    const endpoint = sampled.at(-1);
    if (mainStart == null || split == null || endpoint == null) {
      continue;
    }
    const mainDirection =
      (Math.atan2(split.y - mainStart.y, split.x - mainStart.x) * 180) /
      Math.PI;
    const terminalDirection =
      (Math.atan2(endpoint.y - split.y, endpoint.x - split.x) * 180) / Math.PI;
    const signedTurn = normalizedAngleDegrees(
      ((terminalDirection - mainDirection) * Math.PI) / 180,
    );
    const absoluteTurn = Math.abs(signedTurn);
    const terminalLength =
      splitIndex >= 32 ? 0 : strokeArcLength(sampled.slice(splitIndex));
    const terminalLengthRatio =
      totalLength > 0 ? terminalLength / totalLength : 0;
    if (terminalLengthRatio < 0.05 || terminalLengthRatio > 0.35) {
      continue;
    }
    const turnConfidence = Math.min(1, Math.max(0, (absoluteTurn - 20) / 40));
    const lengthConfidence =
      terminalLengthRatio >= 0.08 && terminalLengthRatio <= 0.25 ? 1 : 0.65;
    const confidence = turnConfidence * lengthConfidence;
    if (
      absoluteTurn > bestTurn ||
      (absoluteTurn === bestTurn && confidence > bestConfidence)
    ) {
      bestTurn = absoluteTurn;
      bestStartFraction = splitFraction;
      bestLengthRatio = terminalLengthRatio;
      bestConfidence = confidence;
    }
  }
  const simplified = simplifyPolyline(stroke, 0.02);
  const classification =
    bestTurn >= 35 ? `present` : bestTurn >= 20 ? `ambiguous` : `absent`;
  return {
    terminalTurnDegrees: bestTurn,
    terminalSegmentLengthFraction: bestLengthRatio,
    terminalSegmentStartFraction: bestStartFraction,
    confidence: bestConfidence,
    classification,
    simplifiedPointCount: simplified.length,
  };
}

function cumulativeTurning(
  tangents: readonly number[],
  windowFraction: number,
): {
  totalAbsoluteTurningDegrees: number;
  netTurningDegrees: number;
} {
  let totalAbsoluteTurningDegrees = 0;
  let netTurningDegrees = 0;
  for (let index = 1; index < tangents.length; index++) {
    const previous = tangents[index - 1];
    const current = tangents[index];
    if (previous == null || current == null) {
      continue;
    }
    const signedTurn = normalizedAngleDegrees(
      ((current - previous) * Math.PI) / 180,
    );
    totalAbsoluteTurningDegrees += Math.abs(signedTurn);
    netTurningDegrees += signedTurn;
  }
  void windowFraction;
  return { totalAbsoluteTurningDegrees, netTurningDegrees };
}

function detectTrajectoryBends(
  tangents: readonly number[],
  scale: number,
): ShapeContextTrajectoryBend[] {
  const bendIndices: number[] = [];
  for (let index = 1; index < tangents.length - 1; index++) {
    const previous = tangents[index - 1];
    const current = tangents[index];
    const next = tangents[index + 1];
    if (previous == null || current == null || next == null) {
      continue;
    }
    const before = normalizedAngleDegrees(
      ((current - previous) * Math.PI) / 180,
    );
    const after = normalizedAngleDegrees(((next - current) * Math.PI) / 180);
    const signedAngle = before + after;
    if (Math.abs(signedAngle) >= 45) {
      bendIndices.push(index);
    }
  }
  const clusters: number[][] = [];
  for (const index of bendIndices) {
    const previousCluster = clusters.at(-1);
    if (previousCluster != null && index <= previousCluster.at(-1)! + 1) {
      previousCluster.push(index);
    } else {
      clusters.push([index]);
    }
  }
  return clusters.flatMap((cluster) => {
    let strongestIndex = cluster[0] ?? 0;
    let strongestMagnitude = 0;
    for (const index of cluster) {
      const previous = tangents[index - 1];
      const current = tangents[index];
      const next = tangents[index + 1];
      if (previous == null || current == null || next == null) {
        continue;
      }
      const before = normalizedAngleDegrees(
        ((current - previous) * Math.PI) / 180,
      );
      const after = normalizedAngleDegrees(((next - current) * Math.PI) / 180);
      const magnitude = Math.abs(before + after);
      if (magnitude > strongestMagnitude) {
        strongestMagnitude = magnitude;
        strongestIndex = index;
      }
    }
    const previous = tangents[strongestIndex - 1];
    const current = tangents[strongestIndex];
    const next = tangents[strongestIndex + 1];
    if (previous == null || current == null || next == null) {
      return [];
    }
    const signedAngle =
      normalizedAngleDegrees(((current - previous) * Math.PI) / 180) +
      normalizedAngleDegrees(((next - current) * Math.PI) / 180);
    return [
      {
        fraction: strongestIndex / 32,
        signedAngleDegrees: signedAngle,
        scale,
      },
    ];
  });
}

export function calculateShapeContextTerminalHookDiagnostics(
  geometry: ShapeContextGrade,
  excludedHandwritingOriginalStrokeIndices: readonly number[] = [],
): ShapeContextTerminalHookDiagnostics {
  const pairs: ShapeContextTerminalHookPair[] = [];
  const cosine = Math.cos(geometry.transform.rotationRadians);
  const sine = Math.sin(geometry.transform.rotationRadians);
  for (const assignment of geometry.strokeAssignments) {
    const handwritingOriginalIndex =
      geometry.sourceStrokeOriginalIndices[assignment.sourceStrokeIndex] ??
      assignment.sourceStrokeIndex;
    const referenceOriginalIndex =
      geometry.targetStrokeOriginalIndices[assignment.targetStrokeIndex] ??
      assignment.targetStrokeIndex;
    if (
      excludedHandwritingOriginalStrokeIndices.includes(
        handwritingOriginalIndex,
      )
    ) {
      continue;
    }
    const handwritingCompact =
      geometry.originalSourceStrokes[handwritingOriginalIndex];
    const referenceCompact =
      geometry.originalTargetStrokes[referenceOriginalIndex];
    if (handwritingCompact == null || referenceCompact == null) {
      continue;
    }
    const rotatedHandwriting = handwritingCompact.map((point) => ({
      x: cosine * point.x - sine * point.y,
      y: sine * point.x + cosine * point.y,
    }));
    const handwritingStroke =
      assignment.direction === `reverse`
        ? [...rotatedHandwriting].reverse()
        : rotatedHandwriting;
    const referenceStroke = [...referenceCompact];
    const handwriting = terminalHookMeasurement(handwritingStroke);
    const reference = terminalHookMeasurement(referenceStroke);
    let observation: ShapeContextTerminalHookPair[`observation`];
    if (reference.classification === `ambiguous`) {
      observation = `reference-hook-ambiguous`;
    } else if (reference.classification === `absent`) {
      observation = `reference-hook-not-detected`;
    } else if (handwriting.classification === `present`) {
      observation = `reference-hook-present-handwriting-hook-present`;
    } else if (handwriting.classification === `ambiguous`) {
      observation = `reference-hook-present-handwriting-hook-malformed`;
    } else {
      observation = `reference-hook-present-handwriting-hook-missing`;
    }
    pairs.push({
      handwritingStrokeIndex: handwritingOriginalIndex,
      referenceStrokeIndex: referenceOriginalIndex,
      direction: assignment.direction,
      reference,
      handwriting,
      observation,
      terminalTurnDifferenceDegrees: Math.abs(
        handwriting.terminalTurnDegrees - reference.terminalTurnDegrees,
      ),
      terminalLengthRatioDifference: Math.abs(
        handwriting.terminalSegmentLengthFraction -
          reference.terminalSegmentLengthFraction,
      ),
    });
  }
  pairs.sort(
    (left, right) => right.reference.confidence - left.reference.confidence,
  );
  return {
    matchedStrokeCount: pairs.length,
    pairs,
  };
}

export function calculateShapeContextTrajectoryDiagnostics(
  geometry: ShapeContextGrade,
  excludedHandwritingOriginalStrokeIndices: readonly number[] = [],
): ShapeContextTrajectoryDiagnostics {
  const scales = [0.05, 0.1, 0.2] as const;
  const individualStrokes = geometry.strokeAssignments
    .flatMap((assignment) => {
      const handwritingOriginalIndex =
        geometry.sourceStrokeOriginalIndices[assignment.sourceStrokeIndex] ??
        assignment.sourceStrokeIndex;
      const referenceOriginalIndex =
        geometry.targetStrokeOriginalIndices[assignment.targetStrokeIndex] ??
        assignment.targetStrokeIndex;
      if (
        excludedHandwritingOriginalStrokeIndices.includes(
          handwritingOriginalIndex,
        )
      ) {
        return [];
      }
      const handwritingCompact =
        geometry.originalSourceStrokes[handwritingOriginalIndex];
      const referenceCompact =
        geometry.originalTargetStrokes[referenceOriginalIndex];
      if (handwritingCompact == null || referenceCompact == null) {
        return [];
      }
      const cosine = Math.cos(geometry.transform.rotationRadians);
      const sine = Math.sin(geometry.transform.rotationRadians);
      const rotatedHandwriting = handwritingCompact.map((point) => ({
        x: cosine * point.x - sine * point.y,
        y: sine * point.x + cosine * point.y,
      }));
      const handwritingStroke =
        assignment.direction === `reverse`
          ? [...rotatedHandwriting].reverse()
          : rotatedHandwriting;
      const referenceStroke = [...referenceCompact];
      if (handwritingStroke.length === 0 || referenceStroke.length === 0) {
        return [];
      }
      const handwritingSampled = resampleStrokeByArcLength(handwritingStroke);
      const referenceSampled = resampleStrokeByArcLength(referenceStroke);
      const handwritingTangents = sampledTangentDirections(
        handwritingSampled,
        0.1,
      );
      const referenceTangents = sampledTangentDirections(referenceSampled, 0.1);
      const tangentMismatchDegrees = handwritingTangents.map(
        (tangent, index) => {
          const reference = referenceTangents[index];
          return reference == null
            ? 0
            : absoluteAngleDifferenceDegrees(tangent, reference);
        },
      );
      const turning: ShapeContextTrajectoryStrokeMetric[`turning`] = {
        "0.05": {
          handwritingTotalAbsoluteTurningDegrees: 0,
          referenceTotalAbsoluteTurningDegrees: 0,
          handwritingNetTurningDegrees: 0,
          referenceNetTurningDegrees: 0,
          totalAbsoluteTurningDifferenceDegrees: 0,
          netTurningDifferenceDegrees: 0,
        },
        "0.1": {
          handwritingTotalAbsoluteTurningDegrees: 0,
          referenceTotalAbsoluteTurningDegrees: 0,
          handwritingNetTurningDegrees: 0,
          referenceNetTurningDegrees: 0,
          totalAbsoluteTurningDifferenceDegrees: 0,
          netTurningDifferenceDegrees: 0,
        },
        "0.2": {
          handwritingTotalAbsoluteTurningDegrees: 0,
          referenceTotalAbsoluteTurningDegrees: 0,
          handwritingNetTurningDegrees: 0,
          referenceNetTurningDegrees: 0,
          totalAbsoluteTurningDifferenceDegrees: 0,
          netTurningDifferenceDegrees: 0,
        },
      };
      for (const scale of scales) {
        const handwritingTangentsAtScale = sampledTangentDirections(
          handwritingSampled,
          scale / 2,
        );
        const referenceTangentsAtScale = sampledTangentDirections(
          referenceSampled,
          scale / 2,
        );
        const handwritingTurning = cumulativeTurning(
          handwritingTangentsAtScale,
          scale,
        );
        const referenceTurning = cumulativeTurning(
          referenceTangentsAtScale,
          scale,
        );
        const key = scale === 0.05 ? `0.05` : scale === 0.1 ? `0.1` : `0.2`;
        turning[key] = {
          handwritingTotalAbsoluteTurningDegrees:
            handwritingTurning.totalAbsoluteTurningDegrees,
          referenceTotalAbsoluteTurningDegrees:
            referenceTurning.totalAbsoluteTurningDegrees,
          handwritingNetTurningDegrees: handwritingTurning.netTurningDegrees,
          referenceNetTurningDegrees: referenceTurning.netTurningDegrees,
          totalAbsoluteTurningDifferenceDegrees: Math.abs(
            handwritingTurning.totalAbsoluteTurningDegrees -
              referenceTurning.totalAbsoluteTurningDegrees,
          ),
          netTurningDifferenceDegrees:
            handwritingTurning.netTurningDegrees -
            referenceTurning.netTurningDegrees,
        };
      }
      const handwritingBends: ShapeContextTrajectoryBend[] = [];
      const referenceBends: ShapeContextTrajectoryBend[] = [];
      for (const scale of scales) {
        const handwritingTangentsAtScale = sampledTangentDirections(
          handwritingSampled,
          scale / 2,
        );
        const referenceTangentsAtScale = sampledTangentDirections(
          referenceSampled,
          scale / 2,
        );
        handwritingBends.push(
          ...detectTrajectoryBends(handwritingTangentsAtScale, scale),
        );
        referenceBends.push(
          ...detectTrajectoryBends(referenceTangentsAtScale, scale),
        );
      }
      const unmatchedHandwritingBends = handwritingBends.filter(
        (handwritingBend) =>
          !referenceBends.some(
            (referenceBend) =>
              referenceBend.scale === handwritingBend.scale &&
              Math.abs(referenceBend.fraction - handwritingBend.fraction) <=
                0.08 &&
              Math.sign(referenceBend.signedAngleDegrees) ===
                Math.sign(handwritingBend.signedAngleDegrees),
          ),
      );
      const unmatchedReferenceBends = referenceBends.filter(
        (referenceBend) =>
          !handwritingBends.some(
            (handwritingBend) =>
              handwritingBend.scale === referenceBend.scale &&
              Math.abs(handwritingBend.fraction - referenceBend.fraction) <=
                0.08 &&
              Math.sign(handwritingBend.signedAngleDegrees) ===
                Math.sign(referenceBend.signedAngleDegrees),
          ),
      );
      let tangentMismatchTotal = 0;
      for (const mismatch of tangentMismatchDegrees) {
        tangentMismatchTotal += mismatch;
      }
      const meanTangentMismatchDegrees =
        tangentMismatchDegrees.length === 0
          ? 0
          : tangentMismatchTotal / tangentMismatchDegrees.length;
      const sustainedMismatch = {
        "30": calculateSustainedMismatch(tangentMismatchDegrees, 30),
        "45": calculateSustainedMismatch(tangentMismatchDegrees, 45),
        "60": calculateSustainedMismatch(tangentMismatchDegrees, 60),
        "75": calculateSustainedMismatch(tangentMismatchDegrees, 75),
        "90": calculateSustainedMismatch(tangentMismatchDegrees, 90),
      };
      return [
        {
          handwritingStrokeIndex:
            geometry.sourceStrokeOriginalIndices[
              assignment.sourceStrokeIndex
            ] ?? assignment.sourceStrokeIndex,
          referenceStrokeIndex:
            geometry.targetStrokeOriginalIndices[
              assignment.targetStrokeIndex
            ] ?? assignment.targetStrokeIndex,
          direction: assignment.direction,
          meanTangentMismatchDegrees,
          p90TangentMismatchDegrees: percentile(tangentMismatchDegrees, 0.9),
          maximumTangentMismatchDegrees:
            tangentMismatchDegrees.length === 0
              ? 0
              : Math.max(...tangentMismatchDegrees),
          sustainedMismatch,
          turning,
          handwritingBends,
          referenceBends,
          unmatchedHandwritingBends,
          unmatchedReferenceBends,
          sampledFractions: Array.from(
            { length: 33 },
            (_, index) => index / 32,
          ),
          handwritingSampledTangentsDegrees: handwritingTangents,
          referenceSampledTangentsDegrees: referenceTangents,
          tangentMismatchDegrees,
        },
      ];
    })
    .sort(
      (left, right) =>
        right.maximumTangentMismatchDegrees -
        left.maximumTangentMismatchDegrees,
    );
  let unmatchedHandwritingBendCount = 0;
  let unmatchedReferenceBendCount = 0;
  let meanStrokeTangentMismatchDegrees = 0;
  let maximumStrokeTangentMismatchDegrees = 0;
  const strokeMaximumMismatchValues: number[] = [];
  const strokeMeanMismatchValues: number[] = [];
  for (const stroke of individualStrokes) {
    unmatchedHandwritingBendCount += stroke.unmatchedHandwritingBends.length;
    unmatchedReferenceBendCount += stroke.unmatchedReferenceBends.length;
    strokeMaximumMismatchValues.push(stroke.maximumTangentMismatchDegrees);
    strokeMeanMismatchValues.push(stroke.meanTangentMismatchDegrees);
    maximumStrokeTangentMismatchDegrees = Math.max(
      maximumStrokeTangentMismatchDegrees,
      stroke.maximumTangentMismatchDegrees,
    );
  }
  if (strokeMeanMismatchValues.length > 0) {
    for (const value of strokeMeanMismatchValues) {
      meanStrokeTangentMismatchDegrees += value;
    }
    meanStrokeTangentMismatchDegrees /= strokeMeanMismatchValues.length;
  }
  const sustainedMismatch = Object.fromEntries(
    ([30, 45, 60, 75, 90] as const).map((thresholdDegrees) => [
      String(thresholdDegrees),
      Object.fromEntries(
        ([0.05, 0.1, 0.15, 0.2] as const).map((minimumLengthFraction) => {
          const minimumKey =
            minimumLengthFraction === 0.05
              ? `0.05`
              : minimumLengthFraction === 0.1
                ? `0.1`
                : minimumLengthFraction === 0.15
                  ? `0.15`
                  : `0.2`;
          const strokeMetrics = individualStrokes.map((stroke) => {
            const threshold =
              stroke.sustainedMismatch[
                String(thresholdDegrees) as `30` | `45` | `60` | `75` | `90`
              ];
            const minimum =
              threshold.sustainedRegionsByMinimumLength[minimumKey];
            return { stroke, minimum, threshold };
          });
          let worst:
            | {
                stroke: (typeof strokeMetrics)[number][`stroke`];
                longest: number;
                total: number;
              }
            | undefined;
          for (const metric of strokeMetrics) {
            const longest = metric.minimum.longestRegionLengthFraction;
            const total = metric.threshold.totalMismatchFraction;
            if (
              worst == null ||
              longest > worst.longest ||
              (longest === worst.longest && total > worst.total)
            ) {
              worst = { stroke: metric.stroke, longest, total };
            }
          }
          const maximumSustainedMismatchLengthFraction = worst?.longest ?? 0;
          let maximumTotalMismatchFraction = 0;
          for (const metric of strokeMetrics) {
            maximumTotalMismatchFraction = Math.max(
              maximumTotalMismatchFraction,
              metric.threshold.totalMismatchFraction,
            );
          }
          return [
            minimumKey,
            {
              minimumLengthFraction,
              maximumSustainedMismatchLengthFraction,
              maximumTotalMismatchFraction,
              strokeCountWithSustainedMismatch: strokeMetrics.filter(
                ({ minimum }) => minimum.regionCount > 0,
              ).length,
              worstHandwritingStrokeIndex:
                worst?.stroke.handwritingStrokeIndex ?? null,
              worstReferenceStrokeIndex:
                worst?.stroke.referenceStrokeIndex ?? null,
            },
          ];
        }),
      ),
    ]),
  ) as ShapeContextTrajectoryDiagnostics[`sustainedMismatch`];
  return {
    matchedStrokeCount: individualStrokes.length,
    meanStrokeTangentMismatchDegrees,
    p90StrokeTangentMismatchDegrees: percentile(
      strokeMaximumMismatchValues,
      0.9,
    ),
    maximumStrokeTangentMismatchDegrees,
    unmatchedHandwritingBendCount,
    unmatchedReferenceBendCount,
    individualStrokes,
    sustainedMismatch,
  };
}

export function calculateShapeContextStrokeGeometryDiagnostics(
  geometry: ShapeContextGrade,
  excludedHandwritingOriginalStrokeIndices: readonly number[] = [],
): ShapeContextStrokeGeometryDiagnostics {
  const individualStrokes = geometry.strokeAssignments
    .flatMap((assignment) => {
      const handwritingStroke =
        geometry.sourceStrokes[assignment.sourceStrokeIndex];
      const referenceStroke =
        geometry.targetStrokes[assignment.targetStrokeIndex];
      if (handwritingStroke == null || referenceStroke == null) {
        return [];
      }
      const handwritingOriginalIndex =
        geometry.sourceStrokeOriginalIndices[assignment.sourceStrokeIndex] ??
        assignment.sourceStrokeIndex;
      if (
        excludedHandwritingOriginalStrokeIndices.includes(
          handwritingOriginalIndex,
        )
      ) {
        return [];
      }
      const pointDistances: number[] = [];
      const cosine = Math.cos(geometry.transform.rotationRadians);
      const sine = Math.sin(geometry.transform.rotationRadians);
      for (const correspondence of geometry.correspondences) {
        const sourceCompactStrokeIndex =
          geometry.sourceStrokeIndices[correspondence.sourceIndex];
        const targetCompactStrokeIndex =
          geometry.targetStrokeIndices[correspondence.targetIndex];
        if (
          sourceCompactStrokeIndex !== assignment.sourceStrokeIndex ||
          targetCompactStrokeIndex !== assignment.targetStrokeIndex
        ) {
          continue;
        }
        const sourcePoint = geometry.sourcePoints[correspondence.sourceIndex];
        const targetPoint = correspondence.targetPoint;
        if (sourcePoint == null) {
          continue;
        }
        const rotatedSourcePoint = {
          x: cosine * sourcePoint.x - sine * sourcePoint.y,
          y: sine * sourcePoint.x + cosine * sourcePoint.y,
        };
        pointDistances.push(
          Math.hypot(
            rotatedSourcePoint.x - targetPoint.x,
            rotatedSourcePoint.y - targetPoint.y,
          ),
        );
      }
      if (pointDistances.length === 0) {
        return [];
      }
      const referenceOriginalIndex =
        geometry.targetStrokeOriginalIndices[assignment.targetStrokeIndex] ??
        assignment.targetStrokeIndex;
      const handwritingOriginalStroke =
        geometry.originalSourceStrokes[handwritingOriginalIndex];
      const referenceOriginalStroke =
        geometry.originalTargetStrokes[referenceOriginalIndex];
      const handwritingArcLength =
        handwritingOriginalStroke == null
          ? strokeArcLength(handwritingStroke)
          : strokeArcLength(handwritingOriginalStroke);
      const referenceArcLength =
        referenceOriginalStroke == null
          ? strokeArcLength(referenceStroke)
          : strokeArcLength(referenceOriginalStroke);
      const pairCost =
        geometry.strokePairCosts[assignment.sourceStrokeIndex]?.[
          assignment.targetStrokeIndex
        ];
      let pointDistanceTotal = 0;
      for (const pointDistance of pointDistances) {
        pointDistanceTotal += pointDistance;
      }
      const meanPointDistance = pointDistanceTotal / pointDistances.length;
      return [
        {
          handwritingStrokeIndex:
            geometry.sourceStrokeOriginalIndices[
              assignment.sourceStrokeIndex
            ] ?? assignment.sourceStrokeIndex,
          referenceStrokeIndex:
            geometry.targetStrokeOriginalIndices[
              assignment.targetStrokeIndex
            ] ?? assignment.targetStrokeIndex,
          meanPointDistance,
          maximumPointDistance: Math.max(...pointDistances),
          p90PointDistance: percentile(pointDistances, 0.9),
          handwritingArcLength,
          referenceArcLength,
          relativeArcLength:
            referenceArcLength > 0
              ? handwritingArcLength / referenceArcLength
              : 0,
          dtwCost: pairCost?.dtwCost ?? 0,
          pairCost: pairCost?.totalCost ?? 0,
        },
      ];
    })
    .sort((left, right) => right.meanPointDistance - left.meanPointDistance);

  const meanErrors = individualStrokes.map(
    ({ meanPointDistance }) => meanPointDistance,
  );
  let maximumIndividualPointDistance = 0;
  let totalHandwritingArcLength = 0;
  let arcLengthWeightedErrorTotal = 0;
  for (const stroke of individualStrokes) {
    maximumIndividualPointDistance = Math.max(
      maximumIndividualPointDistance,
      stroke.maximumPointDistance,
    );
    totalHandwritingArcLength += stroke.handwritingArcLength;
    arcLengthWeightedErrorTotal +=
      stroke.meanPointDistance * stroke.handwritingArcLength;
  }
  const arcLengthWeightedMeanStrokeError =
    totalHandwritingArcLength > 0
      ? arcLengthWeightedErrorTotal / totalHandwritingArcLength
      : 0;
  const fractionExceeding = (threshold: number): number =>
    individualStrokes.length === 0
      ? 0
      : individualStrokes.filter(
          ({ meanPointDistance }) => meanPointDistance > threshold,
        ).length / individualStrokes.length;

  let meanStrokeError = 0;
  for (const meanError of meanErrors) {
    meanStrokeError += meanError;
  }
  if (meanErrors.length > 0) {
    meanStrokeError /= meanErrors.length;
  }

  return {
    matchedStrokeCount: individualStrokes.length,
    meanStrokeError,
    maximumStrokeError: meanErrors.length === 0 ? 0 : Math.max(...meanErrors),
    p90StrokeError: percentile(meanErrors, 0.9),
    maximumIndividualPointDistance,
    arcLengthWeightedMeanStrokeError,
    strokeFractionsExceedingThreshold: {
      "0.1": fractionExceeding(0.1),
      "0.15": fractionExceeding(0.15),
      "0.2": fractionExceeding(0.2),
      "0.25": fractionExceeding(0.25),
      "0.3": fractionExceeding(0.3),
    },
    individualStrokes,
  };
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
    originalSourceStrokes: _originalSourceStrokes,
    originalTargetStrokes: _originalTargetStrokes,
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
  const excludedReversedStrokeIndices =
    expectedIssues?.flatMap((expectation) =>
      expectation.kind === `reversed-stroke` && expectation.handwriting != null
        ? [expectation.handwriting.strokeIndex]
        : [],
    ) ?? [];
  const strokeGeometry = calculateShapeContextStrokeGeometryDiagnostics(
    geometry,
    excludedReversedStrokeIndices,
  );
  const trajectory = calculateShapeContextTrajectoryDiagnostics(
    geometry,
    excludedReversedStrokeIndices,
  );
  const terminalHooks = calculateShapeContextTerminalHookDiagnostics(
    geometry,
    excludedReversedStrokeIndices,
  );
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
    schemaVersion: 24,
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
    strokeGeometry,
    trajectory,
    terminalHooks,
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
          : acceptance.rejectionCondition === `sustainedTangentMismatch`
            ? `sustained tangent mismatch`
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
    case `wrong-stroke-order`:
      return `Wrong stroke order`;
  }
}

function renderTrajectoryTable({
  geometry,
  startY,
}: {
  geometry: ShapeContextGrade;
  startY: number;
}): { svg: string; height: number } {
  const trajectory = calculateShapeContextTrajectoryDiagnostics(geometry);
  const headerY = startY + 18;
  const columnY = startY + 38;
  const rowHeight = 18;
  const rows = trajectory.individualStrokes
    .map((stroke, index) => {
      const y = columnY + 20 + index * rowHeight;
      const bends =
        stroke.unmatchedHandwritingBends.length +
        stroke.unmatchedReferenceBends.length;
      const sustained45 =
        stroke.sustainedMismatch[`45`].sustainedRegionsByMinimumLength[`0.1`];
      const sustainedRegions = sustained45.regions
        .map(
          (region) =>
            `${(region.startFraction * 100).toFixed(0)}-${(region.endFraction * 100).toFixed(0)}%`,
        )
        .join(`,`);
      return [
        `<rect x="16" y="${y - 13}" width="992" height="${rowHeight}" fill="${index < 3 ? `#fff7ed` : `#f8fafc`}" rx="2"/>`,
        `<text x="24" y="${y}" font-size="9">H#${stroke.handwritingStrokeIndex + 1} / R#${stroke.referenceStrokeIndex + 1} · ${stroke.direction}</text>`,
        `<text x="180" y="${y}" font-size="9">${stroke.meanTangentMismatchDegrees.toFixed(2)}°</text>`,
        `<text x="300" y="${y}" font-size="9">${stroke.p90TangentMismatchDegrees.toFixed(2)}°</text>`,
        `<text x="420" y="${y}" font-size="9">${stroke.maximumTangentMismatchDegrees.toFixed(2)}°</text>`,
        `<text x="540" y="${y}" font-size="9">${stroke.turning[`0.1`].handwritingNetTurningDegrees.toFixed(1)}° / ${stroke.turning[`0.1`].referenceNetTurningDegrees.toFixed(1)}°</text>`,
        `<text x="690" y="${y}" font-size="9">${bends}</text>`,
        `<text x="730" y="${y}" font-size="9">${(sustained45.longestRegionLengthFraction * 100).toFixed(1)}%</text>`,
        `<text x="790" y="${y}" font-size="9">${(sustained45.totalMismatchFraction * 100).toFixed(1)}%</text>`,
        `<text x="850" y="${y}" font-size="9">${escapeXml(sustainedRegions || `none`)}</text>`,
        `<text x="970" y="${y}" font-size="9">${stroke.unmatchedHandwritingBends.length}/${stroke.unmatchedReferenceBends.length}</text>`,
      ].join(``);
    })
    .join(``);
  const tableHeight = 64 + trajectory.individualStrokes.length * rowHeight;
  return {
    svg: [
      `<g data-stroke-trajectory-table="">`,
      `<text x="24" y="${headerY}" font-size="14" font-weight="600">Stroke trajectory diagnostics (worst tangent mismatch first)</text>`,
      `<text x="24" y="${columnY}" font-size="9" font-weight="600">Stroke pair</text>`,
      `<text x="180" y="${columnY}" font-size="9" font-weight="600">Mean tangent</text>`,
      `<text x="300" y="${columnY}" font-size="9" font-weight="600">P90 tangent</text>`,
      `<text x="420" y="${columnY}" font-size="9" font-weight="600">Max tangent</text>`,
      `<text x="540" y="${columnY}" font-size="9" font-weight="600">10% net H/R</text>`,
      `<text x="690" y="${columnY}" font-size="9" font-weight="600">Bends</text>`,
      `<text x="730" y="${columnY}" font-size="9" font-weight="600">45° longest 10%+</text>`,
      `<text x="790" y="${columnY}" font-size="9" font-weight="600">45° total</text>`,
      `<text x="850" y="${columnY}" font-size="9" font-weight="600">Regions</text>`,
      `<text x="970" y="${columnY}" font-size="9" font-weight="600">H/R bends</text>`,
      rows,
      `<text x="24" y="${columnY + 38 + trajectory.individualStrokes.length * rowHeight}" font-size="9">Aggregate mean tangent mismatch ${trajectory.meanStrokeTangentMismatchDegrees.toFixed(2)}° · p90 ${trajectory.p90StrokeTangentMismatchDegrees.toFixed(2)}° · max ${trajectory.maximumStrokeTangentMismatchDegrees.toFixed(2)}° · unmatched bends H ${trajectory.unmatchedHandwritingBendCount} / R ${trajectory.unmatchedReferenceBendCount}</text>`,
      `</g>`,
    ].join(``),
    height: startY + tableHeight,
  };
}

function renderStrokeGeometryTable({
  geometry,
  startY,
}: {
  geometry: ShapeContextGrade;
  startY: number;
}): { svg: string; height: number } {
  const diagnostics = calculateShapeContextStrokeGeometryDiagnostics(geometry);
  const headerY = startY + 18;
  const columnY = startY + 38;
  const rowHeight = 18;
  const rows = diagnostics.individualStrokes
    .map((stroke, index) => {
      const y = columnY + 20 + index * rowHeight;
      return [
        `<rect x="16" y="${y - 13}" width="992" height="${rowHeight}" fill="${index < 3 ? `#fff7ed` : `#f8fafc`}" rx="2"/>`,
        `<text x="24" y="${y}" font-size="10">H#${stroke.handwritingStrokeIndex + 1} / R#${stroke.referenceStrokeIndex + 1}</text>`,
        `<text x="180" y="${y}" font-size="10">${stroke.meanPointDistance.toFixed(4)}</text>`,
        `<text x="300" y="${y}" font-size="10">${stroke.maximumPointDistance.toFixed(4)}</text>`,
        `<text x="420" y="${y}" font-size="10">${stroke.p90PointDistance.toFixed(4)}</text>`,
        `<text x="540" y="${y}" font-size="10">${stroke.handwritingArcLength.toFixed(4)} / ${stroke.referenceArcLength.toFixed(4)}</text>`,
        `<text x="710" y="${y}" font-size="10">${stroke.relativeArcLength.toFixed(3)}</text>`,
        `<text x="820" y="${y}" font-size="10">${stroke.dtwCost.toFixed(4)} / ${stroke.pairCost.toFixed(4)}</text>`,
      ].join(``);
    })
    .join(``);
  const tableHeight = 64 + diagnostics.individualStrokes.length * rowHeight;
  return {
    svg: [
      `<g data-stroke-geometry-table="">`,
      `<text x="24" y="${headerY}" font-size="14" font-weight="600">Matched stroke geometry diagnostics (sorted worst first)</text>`,
      `<text x="24" y="${columnY}" font-size="10" font-weight="600">Stroke pair</text>`,
      `<text x="180" y="${columnY}" font-size="10" font-weight="600">Mean</text>`,
      `<text x="300" y="${columnY}" font-size="10" font-weight="600">Max point</text>`,
      `<text x="420" y="${columnY}" font-size="10" font-weight="600">P90 point</text>`,
      `<text x="540" y="${columnY}" font-size="10" font-weight="600">H / R arc length</text>`,
      `<text x="710" y="${columnY}" font-size="10" font-weight="600">H/R length</text>`,
      `<text x="820" y="${columnY}" font-size="10" font-weight="600">DTW / pair cost</text>`,
      rows,
      `<text x="24" y="${columnY + 38 + diagnostics.individualStrokes.length * rowHeight}" font-size="10">Aggregate mean ${diagnostics.meanStrokeError.toFixed(4)} · max mean ${diagnostics.maximumStrokeError.toFixed(4)} · p90 mean ${diagnostics.p90StrokeError.toFixed(4)} · max point ${diagnostics.maximumIndividualPointDistance.toFixed(4)} · arc-weighted mean ${diagnostics.arcLengthWeightedMeanStrokeError.toFixed(4)}</text>`,
      `</g>`,
    ].join(``),
    height: startY + tableHeight,
  };
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
      return `<g data-issue-stroke-label="handwriting-${strokeIndex}"><circle cx="${point.x + 8}" cy="${point.y - 8}" r="11" fill="#fff" stroke="#334155" stroke-width="1"/><text x="${point.x + 8}" y="${point.y - 4}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="600" fill="#0f172a">${strokeIndex + 1}</text></g>`;
    })
    .join(``);
  const referenceLabels = referenceGeometry
    .map((stroke, strokeIndex) => {
      const start = stroke[0];
      if (start == null) {
        return ``;
      }
      const point = referenceMapper(start);
      return `<g data-issue-stroke-label="reference-${strokeIndex}"><circle cx="${point.x + 8}" cy="${point.y - 8}" r="11" fill="#fff" stroke="#334155" stroke-width="1"/><text x="${point.x + 8}" y="${point.y - 4}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="600" fill="#0f172a">${strokeIndex + 1}</text></g>`;
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
  const excludedReversedSvgStrokeIndices =
    expectedIssues?.flatMap((expectation) =>
      expectation.kind === `reversed-stroke` && expectation.handwriting != null
        ? [expectation.handwriting.strokeIndex]
        : [],
    ) ?? [];
  const trajectoryForSvg = calculateShapeContextTrajectoryDiagnostics(
    geometry,
    excludedReversedSvgStrokeIndices,
  );
  const terminalHooksForSvg = calculateShapeContextTerminalHookDiagnostics(
    geometry,
    excludedReversedSvgStrokeIndices,
  );
  const sustainedHighlightPaths = trajectoryForSvg.individualStrokes
    .flatMap((stroke) => {
      const regions =
        stroke.sustainedMismatch[`45`].sustainedRegionsByMinimumLength[`0.1`]
          .regions;
      const handwritingStroke = drawnStrokes[stroke.handwritingStrokeIndex];
      if (handwritingStroke == null || regions.length === 0) {
        return [];
      }
      const selectedHandwritingStroke =
        stroke.direction === `reverse`
          ? [...handwritingStroke].reverse()
          : handwritingStroke;
      const handwritingSelectedSamples = resampleStrokeByArcLength(
        selectedHandwritingStroke,
      );
      const referencePath = referencePaths[stroke.referenceStrokeIndex];
      return regions.flatMap((region) => {
        const startIndex = Math.max(
          0,
          Math.min(32, Math.round(region.startFraction * 32)),
        );
        const endIndex = Math.max(
          startIndex,
          Math.min(32, Math.round(region.endFraction * 32)),
        );
        const handwritingRegion = handwritingSelectedSamples.slice(
          startIndex,
          endIndex + 1,
        );
        const handwritingPath =
          handwritingRegion.length === 0
            ? ``
            : `<path data-sustained-tangent-region="45deg-10pct-H${stroke.handwritingStrokeIndex + 1}-R${stroke.referenceStrokeIndex + 1}" d="${pathFromPoints(handwritingRegion, rawPoint)}" fill="none" stroke="#dc2626" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`;
        const referenceRegion =
          referencePath == null
            ? []
            : extractReferenceStrokeSegment(
                referencePath,
                region.startFraction,
                region.endFraction,
              );
        const referencePathSvg =
          referenceRegion.length === 0
            ? ``
            : `<path data-sustained-tangent-region="45deg-10pct-H${stroke.handwritingStrokeIndex + 1}-R${stroke.referenceStrokeIndex + 1}" d="${pathFromPoints(referenceRegion, (point) => ({ x: 536 + point.x * 0.453125, y: 52 + point.y * 0.453125 }))}" fill="none" stroke="#dc2626" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>`;
        const startLabel = handwritingSelectedSamples[startIndex];
        const labels =
          startLabel == null
            ? ``
            : `<text data-sustained-region-label="H${stroke.handwritingStrokeIndex + 1}-R${stroke.referenceStrokeIndex + 1}" x="${rawPoint(startLabel).x}" y="${rawPoint(startLabel).y - 18}" text-anchor="middle" font-size="10" fill="#dc2626">${(region.startFraction * 100).toFixed(0)}-${(region.endFraction * 100).toFixed(0)}%</text>`;
        return [handwritingPath, referencePathSvg, labels];
      });
    })
    .join(``);
  const terminalHookHighlightPaths = terminalHooksForSvg.pairs
    .flatMap((pair) => {
      if (pair.reference.classification === `absent`) {
        return [];
      }
      const handwritingStroke = drawnStrokes[pair.handwritingStrokeIndex];
      const referencePath = referencePaths[pair.referenceStrokeIndex];
      const handwritingSamples =
        handwritingStroke == null
          ? []
          : resampleStrokeByArcLength(handwritingStroke);
      const handwritingStartIndex = Math.round(
        pair.handwriting.terminalSegmentStartFraction * 32,
      );
      const handwritingRegion = handwritingSamples.slice(
        Math.max(0, Math.min(32, handwritingStartIndex)),
      );
      const referenceRegion =
        referencePath == null
          ? []
          : extractReferenceStrokeSegment(
              referencePath,
              pair.reference.terminalSegmentStartFraction,
              1,
            );
      const handwritingPath =
        handwritingRegion.length === 0
          ? ``
          : `<path data-terminal-hook="H${pair.handwritingStrokeIndex + 1}-R${pair.referenceStrokeIndex + 1}-${pair.observation}" d="${pathFromPoints(handwritingRegion, rawPoint)}" fill="none" stroke="#7c3aed" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`;
      const referencePathSvg =
        referenceRegion.length === 0
          ? ``
          : `<path data-terminal-hook="H${pair.handwritingStrokeIndex + 1}-R${pair.referenceStrokeIndex + 1}-${pair.observation}" d="${pathFromPoints(referenceRegion, (point) => ({ x: 536 + point.x * 0.453125, y: 52 + point.y * 0.453125 }))}" fill="none" stroke="#7c3aed" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>`;
      const label =
        handwritingRegion.at(-1) == null
          ? ``
          : `<text data-terminal-hook-label="H${pair.handwritingStrokeIndex + 1}-R${pair.referenceStrokeIndex + 1}" x="${rawPoint(handwritingRegion.at(-1)!).x}" y="${rawPoint(handwritingRegion.at(-1)!).y - 10}" text-anchor="middle" font-size="10" fill="#6d28d9">hook ${pair.handwriting.terminalTurnDegrees.toFixed(0)}deg · ${(pair.handwriting.terminalSegmentLengthFraction * 100).toFixed(0)}%</text>`;
      return [handwritingPath, referencePathSvg, label];
    })
    .join(``);
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
  ): string => {
    return `<g data-stroke-number="${kind}-${strokeIndex}"><circle cx="${point.x + 8}" cy="${point.y - 8}" r="11" fill="#fff" stroke="#334155" stroke-width="1"/><text x="${point.x + 8}" y="${point.y - 4}" text-anchor="middle" font-family="sans-serif" font-size="10" font-weight="600" fill="#0f172a">${strokeIndex + 1}</text></g>`;
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
        : strokeLabel(`handwriting`, strokeIndex, rawPoint(start));
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
        : strokeLabel(`reference`, strokeIndex, {
            x: 536 + start.x * 0.453125,
            y: 52 + start.y * 0.453125,
          });
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
  const strokeGeometryTable = renderStrokeGeometryTable({
    geometry,
    startY: strokePresencePanel.height + 12,
  });
  const trajectoryTable = renderTrajectoryTable({
    geometry,
    startY: strokeGeometryTable.height + 12,
  });
  const writingIssuePanel = renderWritingIssuePanel({
    drawnStrokes,
    referencePaths,
    geometry,
    expectedIssues,
    unexpectedIssues,
    startY: trajectoryTable.height + 12,
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
    `<g data-sustained-tangent-highlights="" data-angular-threshold="45" data-minimum-length="0.1">${sustainedHighlightPaths}</g>`,
    `<g data-terminal-hook-highlights="" data-candidate-turn="35" data-terminal-length="0.05-0.35">${terminalHookHighlightPaths}</g>`,
    `<g>${sourceGridPaths}${registeredGridPaths}${targetPaths}${normalizedSourcePaths}${registeredPaths}${correspondenceLines}${unmatchedSourcePoints}${unmatchedTargetPoints}</g>`,
    `<g font-family="sans-serif" font-size="18" fill="#0f172a">`,
    `<text x="256" y="540" text-anchor="middle">Raw handwriting · ${escapeXml(targetCharacter)}</text>`,
    `<text x="768" y="540" text-anchor="middle">Reference geometry</text>`,
    `<text x="512" y="1624" text-anchor="middle">Normalized matches and TPS registration</text>`,
    `<text x="512" y="1645" text-anchor="middle" font-size="12">Normalized source before TPS (blue) · registered source (purple) · reference (gray)</text>`,
    `<text x="24" y="1670" font-size="14">Expected ${expectedAcceptance ? `accept` : `reject`} · actual ${acceptance.finalAccepted ? `accept` : `reject`} · shape similarity ${geometry.shapeSimilarity.toFixed(4)} / threshold ${acceptanceThreshold.toFixed(2)} · rejection reason ${acceptance.rejectionCondition ?? `none`}</text>`,
    `<text x="24" y="1692" font-size="14">Sustained tangent mismatch ${geometry.sustainedTangentMismatchRejection.enabled ? `enabled` : `disabled`} · passed ${geometry.sustainedTangentMismatchRejection.passed ? `true` : `false`} · threshold ${geometry.sustainedTangentMismatchRejection.thresholdDegrees}° · min ${geometry.sustainedTangentMismatchRejection.minimumLengthFraction * 100}% · offending ${geometry.sustainedTangentMismatchRejection.offendingStrokes.length}</text>`,
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
    strokeGeometryTable.svg,
    trajectoryTable.svg,
    writingIssuePanel.svg,
    `</svg>`,
  ].join(``);
}
