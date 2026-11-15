import SVGPathCommander from "svg-path-commander";

// shortcut: 4096 points and 64 strokes, raise if valid handwriting is clipped.
export const maxWritingPointCount = 4096;
export const maxWritingStrokeCount = 64;

export interface WritingStrokePoint {
  x: number;
  y: number;
}

export function limitWritingStrokes(
  strokes: readonly (readonly WritingStrokePoint[])[],
): WritingStrokePoint[][] {
  let remainingPointCount = maxWritingPointCount;
  const limitedStrokes: WritingStrokePoint[][] = [];
  for (const stroke of strokes.slice(0, maxWritingStrokeCount)) {
    if (remainingPointCount === 0) {
      break;
    }

    if (stroke.length <= remainingPointCount) {
      limitedStrokes.push([...stroke]);
      remainingPointCount -= stroke.length;
      continue;
    }

    const sampledStroke: WritingStrokePoint[] = [];
    for (let index = 0; index < remainingPointCount; index++) {
      const sourceIndex =
        remainingPointCount === 1
          ? 0
          : Math.round(
              (index * (stroke.length - 1)) / (remainingPointCount - 1),
            );
      const point = stroke[sourceIndex];
      if (point != null) {
        sampledStroke.push(point);
      }
    }
    limitedStrokes.push(sampledStroke);
    break;
  }
  return limitedStrokes;
}

export interface ShapeContextOptions {
  sampleCount: number | null;
  sampleSpacing: number;
  radialBins: number;
  angularBins: number;
  iterations: number;
  tpsRegularization: number;
  unmatchedCost: number;
  missingReferenceStrokePenaltyWeight: number;
  extraHandwritingStrokePenaltyWeight: number;
  maxRotationDegrees: number;
  rotationSteps: number;
}

export interface ShapeContextCorrespondence {
  sourceIndex: number;
  targetIndex: number;
  targetPoint: WritingStrokePoint;
  descriptorCost: number;
  initialDistance: number;
  residualDistance: number;
}

export interface ShapeContextStrokePairCost {
  sourceStrokeIndex: number;
  targetStrokeIndex: number;
  direction: `forward` | `reverse`;
  dtwCost: number;
  centroidDistance: number;
  lengthPenalty: number;
  totalCost: number;
}

export interface ShapeContextStrokeAssignment {
  sourceStrokeIndex: number;
  targetStrokeIndex: number;
  direction: `forward` | `reverse`;
  cost: number;
}

export interface ShapeContextDtwAlignment {
  sourceStrokeIndex: number;
  targetStrokeIndex: number;
  direction: `forward` | `reverse`;
  sourcePointIndices: number[];
  referencePointIndices: number[];
  costMatrix: number[][];
  path: Array<{ sourceIndex: number; targetIndex: number }>;
  pathLength: number;
  longestRepeatedIndexRun: number;
  meanNormalizedIndexDeviation: number;
}

export interface ShapeContextScoreContributions {
  initialMatchingError: number;
  residualMatchingError: number;
  missingReferenceStrokePenalty: number;
  extraHandwritingStrokePenalty: number;
  emptyGeometryPenalty: number;
}

const shapeContextScoreWeights = {
  initialMatchingError: 0.25,
  residualMatchingError: 0.35,
} as const;

const emptyGeometryBaseCost = 2;

export interface ThinPlateSplineTransform {
  controlPoints: WritingStrokePoint[];
  xWeights: number[];
  yWeights: number[];
  affineX: [number, number, number];
  affineY: [number, number, number];
  rotationRadians: number;
  regularization: number;
  bendingEnergy: number;
  affineDistortion: number;
  rotationDegrees: number;
  transform(point: WritingStrokePoint): WritingStrokePoint;
}

export interface ShapeContextGrade {
  shapeCost: number;
  shapeSimilarity: number;
  deformationAlpha: number;
  initialMatchingError: number;
  residualMatchingError: number;
  bendingEnergy: number;
  affineDistortion: number;
  rotationDegrees: number;
  missingReferenceStrokeFraction: number;
  extraHandwritingStrokeFraction: number;
  weightedScoreContributions: ShapeContextScoreContributions;
  correspondences: ShapeContextCorrespondence[];
  strokePairCosts: ShapeContextStrokePairCost[][];
  strokeAssignments: ShapeContextStrokeAssignment[];
  dtwAlignments: ShapeContextDtwAlignment[];
  unmatchedSourceStrokeIndices: number[];
  unmatchedTargetStrokeIndices: number[];
  sourceStrokeIndices: number[];
  targetStrokeIndices: number[];
  unmatchedSourceIndices: number[];
  unmatchedTargetIndices: number[];
  sourcePoints: WritingStrokePoint[];
  targetPoints: WritingStrokePoint[];
  transformedPoints: WritingStrokePoint[];
  sourceStrokes: WritingStrokePoint[][];
  targetStrokes: WritingStrokePoint[][];
  referenceLength: number;
  sampleCount: number;
  sourceStrokeSampleCounts: number[];
  targetStrokeSampleCounts: number[];
  transform: ThinPlateSplineTransform;
  options: ShapeContextOptions;
}

export const shapeContextGraderDefaults: ShapeContextOptions = {
  sampleCount: null,
  sampleSpacing: 0.1,
  radialBins: 5,
  angularBins: 12,
  iterations: 1,
  tpsRegularization: 0.08,
  unmatchedCost: 0.55,
  missingReferenceStrokePenaltyWeight: 1.5,
  extraHandwritingStrokePenaltyWeight: 0.5,
  maxRotationDegrees: 12,
  rotationSteps: 1,
};

const radialMinimum = 0.125;
const radialMaximum = 2.5;
const defaultSampleCountLimit = 80;

interface SampledShape {
  points: WritingStrokePoint[];
  strokes: WritingStrokePoint[][];
  pointStrokeIndices: number[];
  strokeSampleCounts: number[];
}

interface StrokeGeometryMetrics {
  totalLength: number;
  centroid: WritingStrokePoint;
  scale: number;
}

interface MatchResult {
  pairs: Array<{
    sourceIndex: number;
    targetIndex: number;
    targetPoint: WritingStrokePoint;
    cost: number;
  }>;
  unmatchedSourceIndices: number[];
  unmatchedTargetIndices: number[];
  totalCost: number;
}

function validateOptions(options: ShapeContextOptions): void {
  if (
    (options.sampleCount != null &&
      (!Number.isInteger(options.sampleCount) ||
        options.sampleCount < 8 ||
        options.sampleCount > 256)) ||
    !Number.isFinite(options.sampleSpacing) ||
    options.sampleSpacing <= 0 ||
    options.sampleSpacing > 1 ||
    !Number.isInteger(options.radialBins) ||
    options.radialBins < 1 ||
    options.radialBins > 16 ||
    !Number.isInteger(options.angularBins) ||
    options.angularBins < 4 ||
    options.angularBins > 32 ||
    !Number.isInteger(options.iterations) ||
    options.iterations < 0 ||
    options.iterations > 8 ||
    !Number.isFinite(options.tpsRegularization) ||
    options.tpsRegularization <= 0 ||
    options.tpsRegularization > 100 ||
    !Number.isFinite(options.unmatchedCost) ||
    options.unmatchedCost <= 0 ||
    options.unmatchedCost > 5 ||
    !Number.isFinite(options.missingReferenceStrokePenaltyWeight) ||
    options.missingReferenceStrokePenaltyWeight < 0 ||
    options.missingReferenceStrokePenaltyWeight > 5 ||
    !Number.isFinite(options.extraHandwritingStrokePenaltyWeight) ||
    options.extraHandwritingStrokePenaltyWeight < 0 ||
    options.extraHandwritingStrokePenaltyWeight > 5 ||
    !Number.isFinite(options.maxRotationDegrees) ||
    options.maxRotationDegrees < 0 ||
    options.maxRotationDegrees > 45 ||
    !Number.isInteger(options.rotationSteps) ||
    options.rotationSteps < 1 ||
    options.rotationSteps > 12
  ) {
    throw new RangeError(`Invalid shape-context grading options`);
  }
}

function distance(a: WritingStrokePoint, b: WritingStrokePoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pathLength(path: string): number {
  return new SVGPathCommander(path).length;
}

function samplePath(path: string, count: number): WritingStrokePoint[] {
  const parsedPath = new SVGPathCommander(path);
  const length = parsedPath.length;
  if (!(length > 0)) {
    return [];
  }
  if (count === 1) {
    return [parsedPath.getPointAtLength(length / 2)];
  }
  return Array.from({ length: count }, (_, index) =>
    parsedPath.getPointAtLength((length * index) / (count - 1)),
  );
}

function samplePolyline(
  points: readonly WritingStrokePoint[],
  count: number,
): WritingStrokePoint[] {
  const finitePoints = points.filter(
    (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
  );
  if (finitePoints.length === 0) {
    return [];
  }

  const segments: Array<{
    start: WritingStrokePoint;
    end: WritingStrokePoint;
    startLength: number;
    length: number;
  }> = [];
  let totalLength = 0;
  for (let index = 1; index < finitePoints.length; index++) {
    const start = finitePoints[index - 1];
    const end = finitePoints[index];
    if (start == null || end == null) {
      continue;
    }
    const length = distance(start, end);
    if (length === 0) {
      continue;
    }
    segments.push({ start, end, startLength: totalLength, length });
    totalLength += length;
  }
  if (!(totalLength > 0)) {
    return [];
  }
  if (count === 1) {
    const middle = totalLength / 2;
    const segment =
      segments.find(
        (candidate) => middle <= candidate.startLength + candidate.length,
      ) ?? segments.at(-1);
    if (segment == null) {
      return finitePoints[0] == null ? [] : [finitePoints[0]];
    }
    const t = (middle - segment.startLength) / segment.length;
    return [
      {
        x: segment.start.x + (segment.end.x - segment.start.x) * t,
        y: segment.start.y + (segment.end.y - segment.start.y) * t,
      },
    ];
  }

  return Array.from({ length: count }, (_, index) => {
    const targetLength = (totalLength * index) / (count - 1);
    const segment =
      segments.find(
        (candidate) => targetLength <= candidate.startLength + candidate.length,
      ) ?? segments.at(-1);
    if (segment == null) {
      return finitePoints[0] ?? { x: 0, y: 0 };
    }
    const t = (targetLength - segment.startLength) / segment.length;
    return {
      x: segment.start.x + (segment.end.x - segment.start.x) * t,
      y: segment.start.y + (segment.end.y - segment.start.y) * t,
    };
  });
}

function allocateSampleCounts(
  lengths: readonly number[],
  budget: number,
): number[] {
  const activeIndices = lengths.flatMap((length, index) =>
    length > 0 ? [index] : [],
  );
  const counts = lengths.map(() => 0);
  if (activeIndices.length === 0) {
    return counts;
  }

  const minimum = budget >= activeIndices.length * 2 ? 2 : 1;
  for (const index of activeIndices) {
    counts[index] = minimum;
  }
  const remaining = Math.max(0, budget - activeIndices.length * minimum);
  let totalLength = 0;
  for (const index of activeIndices) {
    totalLength += lengths[index] ?? 0;
  }
  const remainders: Array<{ index: number; fraction: number }> = [];
  let allocated = 0;
  for (const index of activeIndices) {
    const exact = remaining * ((lengths[index] ?? 0) / totalLength);
    const whole = Math.floor(exact);
    counts[index] = (counts[index] ?? 0) + whole;
    allocated += whole;
    remainders.push({ index, fraction: exact - whole });
  }
  remainders.sort((a, b) => b.fraction - a.fraction);
  for (let index = 0; index < remaining - allocated; index++) {
    const candidate = remainders[index];
    if (candidate != null) {
      counts[candidate.index] = (counts[candidate.index] ?? 0) + 1;
    }
  }
  return counts;
}

function geometryMetrics(
  strokes: readonly (readonly WritingStrokePoint[])[],
): StrokeGeometryMetrics {
  const segments: Array<{
    start: WritingStrokePoint;
    end: WritingStrokePoint;
    length: number;
  }> = [];
  let totalLength = 0;
  let centroidX = 0;
  let centroidY = 0;
  for (const stroke of strokes) {
    for (let index = 1; index < stroke.length; index++) {
      const start = stroke[index - 1];
      const end = stroke[index];
      if (start == null || end == null) {
        continue;
      }
      const length = distance(start, end);
      if (length === 0) {
        continue;
      }
      segments.push({ start, end, length });
      totalLength += length;
      centroidX += ((start.x + end.x) / 2) * length;
      centroidY += ((start.y + end.y) / 2) * length;
    }
  }
  if (totalLength === 0) {
    const centroid = { x: 0, y: 0 };
    let pointCount = 0;
    for (const stroke of strokes) {
      for (const point of stroke) {
        if (Number.isFinite(point.x) && Number.isFinite(point.y)) {
          centroid.x += point.x;
          centroid.y += point.y;
          pointCount++;
        }
      }
    }
    return {
      totalLength: 0,
      centroid:
        pointCount === 0
          ? centroid
          : {
              x: centroid.x / pointCount,
              y: centroid.y / pointCount,
            },
      scale: 1,
    };
  }

  const centroid = {
    x: centroidX / totalLength,
    y: centroidY / totalLength,
  };
  let squaredDistanceTotal = 0;
  for (const { start, end, length } of segments) {
    const startX = start.x - centroid.x;
    const startY = start.y - centroid.y;
    const endX = end.x - centroid.x;
    const endY = end.y - centroid.y;
    squaredDistanceTotal +=
      (length *
        (startX * startX +
          startX * endX +
          startY * startY +
          startY * endY +
          endX * endX +
          endY * endY)) /
      3;
  }
  const rms = Math.sqrt(squaredDistanceTotal / totalLength);
  return {
    totalLength,
    centroid,
    scale: rms > 1e-9 ? Math.SQRT2 / rms : 1,
  };
}

function normalizePoint(
  point: WritingStrokePoint,
  metrics: StrokeGeometryMetrics,
): WritingStrokePoint {
  return {
    x: (point.x - metrics.centroid.x) * metrics.scale,
    y: (point.y - metrics.centroid.y) * metrics.scale,
  };
}

function sampleStrokes(
  strokes: readonly (readonly WritingStrokePoint[])[],
  sampleCount: number,
): SampledShape {
  const cleaned = strokes.map((stroke) =>
    stroke.filter(
      (point) => Number.isFinite(point.x) && Number.isFinite(point.y),
    ),
  );
  const lengths = cleaned.map((stroke) => {
    let length = 0;
    for (let index = 1; index < stroke.length; index++) {
      const previous = stroke[index - 1];
      const point = stroke[index];
      if (previous != null && point != null) {
        length += distance(previous, point);
      }
    }
    return length;
  });
  const metrics = geometryMetrics(cleaned);
  const counts = allocateSampleCounts(lengths, sampleCount);
  const sampledStrokes = cleaned.flatMap((stroke, index) => {
    const count = counts[index] ?? 0;
    return count < 1
      ? []
      : [
          samplePolyline(stroke, count).map((point) =>
            normalizePoint(point, metrics),
          ),
        ];
  });
  return {
    points: sampledStrokes.flat(),
    strokes: sampledStrokes,
    pointStrokeIndices: sampledStrokes.flatMap((stroke, strokeIndex) =>
      stroke.map(() => strokeIndex),
    ),
    strokeSampleCounts: counts,
  };
}

function samplePaths(
  paths: readonly string[],
  sampleCount: number,
): SampledShape {
  const lengths = paths.map(pathLength);
  const metrics = geometryMetrics(paths.map((path) => samplePath(path, 256)));
  const counts = allocateSampleCounts(lengths, sampleCount);
  const strokes = paths.flatMap((path, index) => {
    const count = counts[index] ?? 0;
    return count < 1
      ? []
      : [
          samplePath(path, count).map((point) =>
            normalizePoint(point, metrics),
          ),
        ];
  });
  return {
    points: strokes.flat(),
    strokes,
    pointStrokeIndices: strokes.flatMap((stroke, strokeIndex) =>
      stroke.map(() => strokeIndex),
    ),
    strokeSampleCounts: counts,
  };
}

function resolvedSampleCount(
  paths: readonly string[],
  settings: ShapeContextOptions,
  sampleCountOverride?: number,
): {
  count: number;
  referenceLength: number;
} {
  const lengths = paths.map(pathLength);
  const integrationCount = 256;
  const metrics = geometryMetrics(
    paths.map((path) => samplePath(path, integrationCount)),
  );
  const referenceLength = lengths.reduce((total, length) => total + length, 0);
  const normalizedReferenceLength = referenceLength * metrics.scale;
  const activeStrokeCount = lengths.filter((length) => length > 0).length;
  const requestedCount =
    sampleCountOverride ??
    settings.sampleCount ??
    Math.max(
      8,
      Math.min(
        defaultSampleCountLimit,
        Math.ceil(normalizedReferenceLength / settings.sampleSpacing),
      ),
    );
  return {
    count: Math.max(requestedCount, Math.min(256, activeStrokeCount * 2)),
    referenceLength: normalizedReferenceLength,
  };
}

function rotate(
  point: WritingStrokePoint,
  radians: number,
): WritingStrokePoint {
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  return {
    x: cosine * point.x - sine * point.y,
    y: sine * point.x + cosine * point.y,
  };
}

function shapeContexts(
  points: readonly WritingStrokePoint[],
  radialBins: number,
  angularBins: number,
): number[][] {
  if (points.length === 0) {
    return [];
  }
  let pairDistanceTotal = 0;
  let pairCount = 0;
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (point == null) {
      continue;
    }
    for (let otherIndex = index + 1; otherIndex < points.length; otherIndex++) {
      const other = points[otherIndex];
      if (other != null) {
        pairDistanceTotal += distance(point, other);
        pairCount++;
      }
    }
  }
  const meanDistance = pairCount === 0 ? 1 : pairDistanceTotal / pairCount;
  const radialRange = Math.log(radialMaximum / radialMinimum);

  return points.map((point, pointIndex) => {
    const histogram = Array.from({ length: radialBins * angularBins }, () => 0);
    for (const [otherIndex, other] of points.entries()) {
      if (otherIndex === pointIndex) {
        continue;
      }
      const dx = other.x - point.x;
      const dy = other.y - point.y;
      const radius = Math.hypot(dx, dy);
      if (radius <= 1e-12) {
        continue;
      }
      const normalizedRadius = Math.max(
        radialMinimum,
        Math.min(radialMaximum, radius / meanDistance),
      );
      const radialIndex = Math.min(
        radialBins - 1,
        Math.floor(
          (Math.log(normalizedRadius / radialMinimum) / radialRange) *
            radialBins,
        ),
      );
      const angle = (Math.atan2(dy, dx) + 2 * Math.PI) % (2 * Math.PI);
      const angularIndex = Math.min(
        angularBins - 1,
        Math.floor((angle / (2 * Math.PI)) * angularBins),
      );
      const bin = radialIndex * angularBins + angularIndex;
      histogram[bin] = (histogram[bin] ?? 0) + 1;
    }
    let total = 0;
    for (const value of histogram) {
      total += value;
    }
    return total === 0 ? histogram : histogram.map((value) => value / total);
  });
}

function chiSquaredDistance(
  a: readonly number[],
  b: readonly number[],
): number {
  let cost = 0;
  for (let index = 0; index < a.length; index++) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    const sum = left + right;
    if (sum > 0) {
      cost += ((left - right) ** 2 / sum) * 0.5;
    }
  }
  return cost;
}

function hungarian(costs: readonly (readonly number[])[]): number[] {
  const rowCount = costs.length;
  const columnCount = costs[0]?.length ?? 0;
  const u = Array.from({ length: rowCount + 1 }, () => 0);
  const v = Array.from({ length: columnCount + 1 }, () => 0);
  const p = Array.from({ length: columnCount + 1 }, () => 0);
  const way = Array.from({ length: columnCount + 1 }, () => 0);

  for (let row = 1; row <= rowCount; row++) {
    p[0] = row;
    let column0 = 0;
    const minimums = Array.from({ length: columnCount + 1 }, () => Infinity);
    const used = Array.from({ length: columnCount + 1 }, () => false);
    do {
      used[column0] = true;
      const row0 = p[column0] ?? 0;
      let delta = Infinity;
      let column1 = 0;
      for (let column = 1; column <= columnCount; column++) {
        if (used[column]) {
          continue;
        }
        const rowCosts = costs[row0 - 1];
        const cost = rowCosts?.[column - 1] ?? Infinity;
        const reducedCost = cost - (u[row0] ?? 0) - (v[column] ?? 0);
        if (reducedCost < (minimums[column] ?? Infinity)) {
          minimums[column] = reducedCost;
          way[column] = column0;
        }
        if ((minimums[column] ?? Infinity) < delta) {
          delta = minimums[column] ?? Infinity;
          column1 = column;
        }
      }
      for (let column = 0; column <= columnCount; column++) {
        if (used[column]) {
          const assignedRow = p[column] ?? 0;
          u[assignedRow] = (u[assignedRow] ?? 0) + delta;
          v[column] = (v[column] ?? 0) - delta;
        } else {
          minimums[column] = (minimums[column] ?? 0) - delta;
        }
      }
      column0 = column1;
    } while ((p[column0] ?? 0) !== 0);
    do {
      const previousColumn = way[column0] ?? 0;
      p[column0] = p[previousColumn] ?? 0;
      column0 = previousColumn;
    } while (column0 !== 0);
  }

  const assignment = Array.from({ length: rowCount }, () => -1);
  for (let column = 1; column <= columnCount; column++) {
    const row = p[column] ?? 0;
    if (row > 0) {
      assignment[row - 1] = column - 1;
    }
  }
  return assignment;
}

interface StrokeAlignment {
  direction: `forward` | `reverse`;
  pathCost: number;
  pathLength: number;
  sourceIndices: number[];
  targetIndices: number[];
  costMatrix: number[][];
  path: Array<{ sourceIndex: number; targetIndex: number }>;
  longestRepeatedIndexRun: number;
  meanNormalizedIndexDeviation: number;
  pairs: MatchResult[`pairs`];
}

function alignStrokePair(
  sourceContexts: readonly (readonly number[])[],
  targetContexts: readonly (readonly number[])[],
  sourcePoints: readonly WritingStrokePoint[],
  targetPoints: readonly WritingStrokePoint[],
  spatialWeight: number,
  sourceIndices: readonly number[],
  targetIndices: readonly number[],
  direction: `forward` | `reverse`,
): StrokeAlignment | null {
  const orderedTargetIndices =
    direction === `forward` ? targetIndices : [...targetIndices].reverse();
  const costs = sourceIndices.map((sourceIndex) =>
    orderedTargetIndices.map((targetIndex) => {
      const sourcePoint = sourcePoints[sourceIndex];
      const targetPoint = targetPoints[targetIndex];
      if (sourcePoint == null || targetPoint == null) {
        return Infinity;
      }
      return (
        chiSquaredDistance(
          sourceContexts[sourceIndex] ?? [],
          targetContexts[targetIndex] ?? [],
        ) +
        spatialWeight * distance(sourcePoint, targetPoint)
      );
    }),
  );
  const accumulated = Array.from({ length: sourceIndices.length + 1 }, () =>
    Array.from({ length: orderedTargetIndices.length + 1 }, () => Infinity),
  );
  const initialRow = accumulated[0];
  if (initialRow == null) {
    return null;
  }
  initialRow[0] = 0;
  for (
    let sourceOffset = 1;
    sourceOffset <= sourceIndices.length;
    sourceOffset++
  ) {
    for (
      let targetOffset = 1;
      targetOffset <= orderedTargetIndices.length;
      targetOffset++
    ) {
      const previousRow = accumulated[sourceOffset - 1];
      const currentRow = accumulated[sourceOffset];
      const currentCost = costs[sourceOffset - 1]?.[targetOffset - 1];
      if (previousRow == null || currentRow == null || currentCost == null) {
        continue;
      }
      currentRow[targetOffset] =
        currentCost +
        Math.min(
          previousRow[targetOffset] ?? Infinity,
          currentRow[targetOffset - 1] ?? Infinity,
          previousRow[targetOffset - 1] ?? Infinity,
        );
    }
  }

  const pathCost =
    accumulated[sourceIndices.length]?.[orderedTargetIndices.length] ??
    Infinity;
  if (!Number.isFinite(pathCost)) {
    return null;
  }

  const alignedBySource = new Map<
    number,
    Array<{
      targetIndex: number;
      targetPoint: WritingStrokePoint;
      cost: number;
    }>
  >();
  let sourceOffset = sourceIndices.length;
  let targetOffset = orderedTargetIndices.length;
  let pathLength = 0;
  const path: StrokeAlignment[`path`] = [];
  while (sourceOffset > 0 && targetOffset > 0) {
    const sourceIndex = sourceIndices[sourceOffset - 1];
    const targetIndex = orderedTargetIndices[targetOffset - 1];
    const targetPoint = targetPoints[targetIndex ?? -1];
    const cost = costs[sourceOffset - 1]?.[targetOffset - 1];
    if (
      sourceIndex == null ||
      targetIndex == null ||
      targetPoint == null ||
      cost == null
    ) {
      return null;
    }
    const matches = alignedBySource.get(sourceIndex) ?? [];
    matches.push({ targetIndex, targetPoint, cost });
    alignedBySource.set(sourceIndex, matches);
    path.push({ sourceIndex, targetIndex });
    pathLength++;

    if (sourceOffset === 1 && targetOffset === 1) {
      break;
    }
    const previousSourceRow = accumulated[sourceOffset - 1];
    const currentSourceRow = accumulated[sourceOffset];
    const diagonal = previousSourceRow?.[targetOffset - 1] ?? Infinity;
    const vertical = previousSourceRow?.[targetOffset] ?? Infinity;
    const horizontal = currentSourceRow?.[targetOffset - 1] ?? Infinity;
    if (diagonal <= vertical && diagonal <= horizontal) {
      sourceOffset--;
      targetOffset--;
    } else if (vertical <= horizontal) {
      sourceOffset--;
    } else {
      targetOffset--;
    }
  }
  path.reverse();
  let longestRepeatedIndexRun = path.length > 0 ? 1 : 0;
  let sourceIndexRun = longestRepeatedIndexRun;
  let targetIndexRun = longestRepeatedIndexRun;
  let normalizedIndexDeviation = 0;
  for (let index = 0; index < path.length; index++) {
    const point = path[index];
    if (point == null) {
      continue;
    }
    const sourceNormalized =
      sourceIndices.length <= 1
        ? 0
        : (point.sourceIndex - (sourceIndices[0] ?? 0)) /
          (sourceIndices.length - 1);
    const targetNormalized =
      targetIndices.length <= 1
        ? 0
        : ((direction === `forward` ? 1 : -1) *
            (point.targetIndex - (orderedTargetIndices[0] ?? 0))) /
          (targetIndices.length - 1);
    normalizedIndexDeviation += Math.abs(sourceNormalized - targetNormalized);
    if (index === 0) {
      continue;
    }
    const previous = path[index - 1];
    if (previous == null) {
      continue;
    }
    sourceIndexRun =
      previous.sourceIndex === point.sourceIndex ? sourceIndexRun + 1 : 1;
    targetIndexRun =
      previous.targetIndex === point.targetIndex ? targetIndexRun + 1 : 1;
    longestRepeatedIndexRun = Math.max(
      longestRepeatedIndexRun,
      sourceIndexRun,
      targetIndexRun,
    );
  }

  const pairs: MatchResult[`pairs`] = [];
  for (const sourceIndex of sourceIndices) {
    const aligned = alignedBySource.get(sourceIndex);
    if (aligned == null || aligned.length === 0) {
      return null;
    }
    let targetX = 0;
    let targetY = 0;
    let targetIndexTotal = 0;
    let costTotal = 0;
    for (const match of aligned) {
      targetX += match.targetPoint.x;
      targetY += match.targetPoint.y;
      targetIndexTotal += match.targetIndex;
      costTotal += match.cost;
    }
    pairs.push({
      sourceIndex,
      targetIndex: Math.round(targetIndexTotal / aligned.length),
      targetPoint: {
        x: targetX / aligned.length,
        y: targetY / aligned.length,
      },
      cost: costTotal / aligned.length,
    });
  }
  return {
    direction,
    pathCost,
    pathLength,
    sourceIndices: [...sourceIndices],
    targetIndices: [...orderedTargetIndices],
    costMatrix: costs,
    path,
    longestRepeatedIndexRun,
    meanNormalizedIndexDeviation:
      pathLength === 0 ? 0 : normalizedIndexDeviation / pathLength,
    pairs,
  };
}

function matchStrokes(
  sourceContexts: readonly (readonly number[])[],
  targetContexts: readonly (readonly number[])[],
  sourcePoints: readonly WritingStrokePoint[],
  targetPoints: readonly WritingStrokePoint[],
  sourceStrokes: readonly (readonly WritingStrokePoint[])[],
  targetStrokes: readonly (readonly WritingStrokePoint[])[],
  unmatchedCost: number,
  spatialWeight: number,
): {
  matches: MatchResult;
  pairCosts: ShapeContextStrokePairCost[][];
  assignments: ShapeContextStrokeAssignment[];
  dtwAlignments: ShapeContextDtwAlignment[];
  unmatchedSourceStrokeIndices: number[];
  unmatchedTargetStrokeIndices: number[];
} {
  const sourceIndicesByStroke: number[][] = [];
  let sourceOffset = 0;
  for (const stroke of sourceStrokes) {
    const indices: number[] = [];
    for (let index = 0; index < stroke.length; index++) {
      indices.push(sourceOffset + index);
    }
    sourceIndicesByStroke.push(indices);
    sourceOffset += stroke.length;
  }
  const targetIndicesByStroke: number[][] = [];
  let targetOffset = 0;
  for (const stroke of targetStrokes) {
    const indices: number[] = [];
    for (let index = 0; index < stroke.length; index++) {
      indices.push(targetOffset + index);
    }
    targetIndicesByStroke.push(indices);
    targetOffset += stroke.length;
  }
  const sourceMetrics = sourceStrokes.map((stroke) =>
    geometryMetrics([stroke]),
  );
  const targetMetrics = targetStrokes.map((stroke) =>
    geometryMetrics([stroke]),
  );
  const alignments: (StrokeAlignment | null)[][] = [];
  const pairCosts: ShapeContextStrokePairCost[][] = [];

  for (const [
    sourceStrokeIndex,
    sourceIndices,
  ] of sourceIndicesByStroke.entries()) {
    const sourceGeometry = sourceMetrics[sourceStrokeIndex];
    const alignmentsForStroke: (StrokeAlignment | null)[] = [];
    const costsForStroke: ShapeContextStrokePairCost[] = [];
    for (const [
      targetStrokeIndex,
      targetIndices,
    ] of targetIndicesByStroke.entries()) {
      const targetGeometry = targetMetrics[targetStrokeIndex];
      const forward = alignStrokePair(
        sourceContexts,
        targetContexts,
        sourcePoints,
        targetPoints,
        spatialWeight,
        sourceIndices,
        targetIndices,
        `forward`,
      );
      const reverse = alignStrokePair(
        sourceContexts,
        targetContexts,
        sourcePoints,
        targetPoints,
        spatialWeight,
        sourceIndices,
        targetIndices,
        `reverse`,
      );
      const alignment =
        reverse != null &&
        (forward == null ||
          reverse.pathCost / reverse.pathLength <
            forward.pathCost / forward.pathLength)
          ? reverse
          : forward;
      if (
        alignment == null ||
        sourceGeometry == null ||
        targetGeometry == null
      ) {
        alignmentsForStroke.push(null);
        costsForStroke.push({
          sourceStrokeIndex,
          targetStrokeIndex,
          direction: `forward`,
          dtwCost: Infinity,
          centroidDistance: Infinity,
          lengthPenalty: Infinity,
          totalCost: Infinity,
        });
        continue;
      }
      const dtwCost = alignment.pathCost / alignment.pathLength;
      const centroidDistance = distance(
        sourceGeometry.centroid,
        targetGeometry.centroid,
      );
      const lengthPenalty = Math.abs(
        Math.log(
          (sourceGeometry.totalLength + 1e-9) /
            (targetGeometry.totalLength + 1e-9),
        ),
      );
      alignmentsForStroke.push(alignment);
      costsForStroke.push({
        sourceStrokeIndex,
        targetStrokeIndex,
        direction: alignment.direction,
        dtwCost,
        centroidDistance,
        lengthPenalty,
        totalCost: dtwCost + 0.1 * centroidDistance + 0.1 * lengthPenalty,
      });
    }
    alignments.push(alignmentsForStroke);
    pairCosts.push(costsForStroke);
  }

  const sourceStrokeCount = sourceStrokes.length;
  const targetStrokeCount = targetStrokes.length;
  const assignmentCosts = Array.from(
    { length: sourceStrokeCount + targetStrokeCount },
    (_, row) =>
      Array.from(
        { length: sourceStrokeCount + targetStrokeCount },
        (_, column) => {
          if (row < sourceStrokeCount && column < targetStrokeCount) {
            return pairCosts[row]?.[column]?.totalCost ?? Infinity;
          }
          if (row < sourceStrokeCount || column < targetStrokeCount) {
            return unmatchedCost;
          }
          return 0;
        },
      ),
  );
  const assignment = hungarian(assignmentCosts);
  const assignments: ShapeContextStrokeAssignment[] = [];
  const unmatchedSourceStrokeIndices: number[] = [];
  const matchedTargetStrokes = new Set<number>();
  const pairs: MatchResult[`pairs`] = [];
  const dtwAlignments: ShapeContextDtwAlignment[] = [];
  let totalCost = 0;

  for (
    let sourceStrokeIndex = 0;
    sourceStrokeIndex < sourceStrokeCount;
    sourceStrokeIndex++
  ) {
    const targetStrokeIndex = assignment[sourceStrokeIndex] ?? -1;
    if (targetStrokeIndex < 0 || targetStrokeIndex >= targetStrokeCount) {
      unmatchedSourceStrokeIndices.push(sourceStrokeIndex);
      totalCost += unmatchedCost;
      continue;
    }
    const alignment = alignments[sourceStrokeIndex]?.[targetStrokeIndex];
    const pairCost = pairCosts[sourceStrokeIndex]?.[targetStrokeIndex];
    if (alignment == null || pairCost == null) {
      unmatchedSourceStrokeIndices.push(sourceStrokeIndex);
      totalCost += unmatchedCost;
      continue;
    }
    assignments.push({
      sourceStrokeIndex,
      targetStrokeIndex,
      direction: alignment.direction,
      cost: pairCost.totalCost,
    });
    dtwAlignments.push({
      sourceStrokeIndex,
      targetStrokeIndex,
      direction: alignment.direction,
      sourcePointIndices: alignment.sourceIndices,
      referencePointIndices: alignment.targetIndices,
      costMatrix: alignment.costMatrix,
      path: alignment.path,
      pathLength: alignment.pathLength,
      longestRepeatedIndexRun: alignment.longestRepeatedIndexRun,
      meanNormalizedIndexDeviation: alignment.meanNormalizedIndexDeviation,
    });
    matchedTargetStrokes.add(targetStrokeIndex);
    pairs.push(...alignment.pairs);
    totalCost += pairCost.totalCost;
  }

  const unmatchedTargetStrokeIndices = targetStrokes.flatMap((_, index) =>
    matchedTargetStrokes.has(index) ? [] : [index],
  );
  totalCost += unmatchedTargetStrokeIndices.length * unmatchedCost;
  const unmatchedSourceIndices = sourceIndicesByStroke.flatMap(
    (indices, strokeIndex) =>
      unmatchedSourceStrokeIndices.includes(strokeIndex) ? indices : [],
  );
  const unmatchedTargetIndices = targetIndicesByStroke.flatMap(
    (indices, strokeIndex) =>
      unmatchedTargetStrokeIndices.includes(strokeIndex) ? indices : [],
  );
  return {
    matches: {
      pairs: pairs.sort((left, right) => left.sourceIndex - right.sourceIndex),
      unmatchedSourceIndices,
      unmatchedTargetIndices,
      totalCost,
    },
    pairCosts,
    assignments,
    dtwAlignments,
    unmatchedSourceStrokeIndices,
    unmatchedTargetStrokeIndices,
  };
}

function solveLinearSystem(
  matrix: readonly (readonly number[])[],
  values: readonly number[],
): number[] | null {
  const size = values.length;
  const augmented = matrix.map((row, index) => [...row, values[index] ?? 0]);
  for (let column = 0; column < size; column++) {
    let pivot = column;
    for (let row = column + 1; row < size; row++) {
      if (
        Math.abs(augmented[row]?.[column] ?? 0) >
        Math.abs(augmented[pivot]?.[column] ?? 0)
      ) {
        pivot = row;
      }
    }
    const pivotRow = augmented[pivot];
    if (pivotRow == null || Math.abs(pivotRow[column] ?? 0) < 1e-12) {
      return null;
    }
    const currentRow = augmented[column];
    if (currentRow == null) {
      return null;
    }
    augmented[column] = pivotRow;
    augmented[pivot] = currentRow;
    const divisor = pivotRow[column] ?? 1;
    for (let entry = column; entry <= size; entry++) {
      pivotRow[entry] = (pivotRow[entry] ?? 0) / divisor;
    }
    for (let row = 0; row < size; row++) {
      if (row === column) {
        continue;
      }
      const targetRow = augmented[row];
      const factor = targetRow?.[column] ?? 0;
      if (targetRow == null || factor === 0) {
        continue;
      }
      for (let entry = column; entry <= size; entry++) {
        targetRow[entry] =
          (targetRow[entry] ?? 0) - factor * (pivotRow[entry] ?? 0);
      }
    }
  }
  return augmented.map((row) => row[size] ?? 0);
}

function tpsKernel(a: WritingStrokePoint, b: WritingStrokePoint): number {
  const squaredDistance = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  return squaredDistance <= 1e-16
    ? 0
    : squaredDistance * 0.5 * Math.log(squaredDistance);
}

function makeIdentityTransform(
  rotationRadians: number,
  regularization: number,
): ThinPlateSplineTransform {
  return {
    controlPoints: [],
    xWeights: [],
    yWeights: [],
    affineX: [0, 1, 0],
    affineY: [0, 0, 1],
    rotationRadians,
    regularization,
    bendingEnergy: 0,
    affineDistortion: 0,
    rotationDegrees: (rotationRadians * 180) / Math.PI,
    transform(point) {
      const rotated = rotate(point, rotationRadians);
      return { x: rotated.x, y: rotated.y };
    },
  };
}

function fitSimilarityTransform(
  controls: readonly {
    source: WritingStrokePoint;
    target: WritingStrokePoint;
  }[],
  rotationRadians: number,
  regularization: number,
): ThinPlateSplineTransform {
  if (controls.length === 0) {
    return makeIdentityTransform(rotationRadians, regularization);
  }

  const sourceCenter = { x: 0, y: 0 };
  const targetCenter = { x: 0, y: 0 };
  for (const control of controls) {
    sourceCenter.x += control.source.x;
    sourceCenter.y += control.source.y;
    targetCenter.x += control.target.x;
    targetCenter.y += control.target.y;
  }
  sourceCenter.x /= controls.length;
  sourceCenter.y /= controls.length;
  targetCenter.x /= controls.length;
  targetCenter.y /= controls.length;

  let denominator = 0;
  let cosineWeight = 0;
  let sineWeight = 0;
  for (const control of controls) {
    const sourceX = control.source.x - sourceCenter.x;
    const sourceY = control.source.y - sourceCenter.y;
    const targetX = control.target.x - targetCenter.x;
    const targetY = control.target.y - targetCenter.y;
    denominator += sourceX * sourceX + sourceY * sourceY;
    cosineWeight += sourceX * targetX + sourceY * targetY;
    sineWeight += sourceX * targetY - sourceY * targetX;
  }
  const a = denominator > 1e-12 ? cosineWeight / denominator : 1;
  const b = denominator > 1e-12 ? sineWeight / denominator : 0;
  const affineX: [number, number, number] = [
    targetCenter.x - a * sourceCenter.x + b * sourceCenter.y,
    a,
    -b,
  ];
  const affineY: [number, number, number] = [
    targetCenter.y - b * sourceCenter.x - a * sourceCenter.y,
    b,
    a,
  ];
  return {
    controlPoints: controls.map(({ source }) => source),
    xWeights: controls.map(() => 0),
    yWeights: controls.map(() => 0),
    affineX,
    affineY,
    rotationRadians,
    regularization,
    bendingEnergy: 0,
    affineDistortion: 0,
    rotationDegrees: (Math.atan2(b, a) * 180) / Math.PI,
    transform(point) {
      const rotated = rotate(point, rotationRadians);
      return {
        x: affineX[0] + affineX[1] * rotated.x + affineX[2] * rotated.y,
        y: affineY[0] + affineY[1] * rotated.x + affineY[2] * rotated.y,
      };
    },
  };
}

function isEffectivelyOneDimensional(
  points: readonly WritingStrokePoint[],
): boolean {
  if (points.length < 3) {
    return true;
  }
  let centerX = 0;
  let centerY = 0;
  for (const point of points) {
    centerX += point.x;
    centerY += point.y;
  }
  centerX /= points.length;
  centerY /= points.length;
  let xx = 0;
  let xy = 0;
  let yy = 0;
  for (const point of points) {
    const x = point.x - centerX;
    const y = point.y - centerY;
    xx += x * x;
    xy += x * y;
    yy += y * y;
  }
  const trace = xx + yy;
  const discriminant = Math.sqrt((xx - yy) ** 2 + 4 * xy * xy);
  const smallestEigenvalue = (trace - discriminant) / 2;
  const largestEigenvalue = (trace + discriminant) / 2;
  return (
    largestEigenvalue <= 1e-12 || smallestEigenvalue <= largestEigenvalue * 1e-6
  );
}

function fitThinPlateSpline(
  source: readonly WritingStrokePoint[],
  matches: readonly MatchResult[`pairs`][number][],
  rotationRadians: number,
  regularization: number,
): ThinPlateSplineTransform {
  const controls: Array<{
    source: WritingStrokePoint;
    target: WritingStrokePoint;
  }> = [];
  for (const match of matches) {
    const sourcePoint = source[match.sourceIndex];
    if (sourcePoint == null) {
      continue;
    }
    const targetPoint = match.targetPoint;
    const rotatedSource = rotate(sourcePoint, rotationRadians);
    const existing = controls.find(
      (control) => distance(control.source, rotatedSource) < 1e-6,
    );
    if (existing == null) {
      controls.push({ source: rotatedSource, target: targetPoint });
    } else {
      existing.target = {
        x: (existing.target.x + targetPoint.x) / 2,
        y: (existing.target.y + targetPoint.y) / 2,
      };
    }
  }

  if (
    controls.length < 3 ||
    isEffectivelyOneDimensional(controls.map(({ source }) => source)) ||
    isEffectivelyOneDimensional(controls.map(({ target }) => target))
  ) {
    return fitSimilarityTransform(controls, rotationRadians, regularization);
  }

  const count = controls.length;
  const systemSize = count + 3;
  const matrix = Array.from({ length: systemSize }, () =>
    Array.from({ length: systemSize }, () => 0),
  );
  for (let row = 0; row < count; row++) {
    const control = controls[row];
    const controlRow = matrix[row];
    const constantConstraintRow = matrix[count];
    const xConstraintRow = matrix[count + 1];
    const yConstraintRow = matrix[count + 2];
    if (
      control == null ||
      controlRow == null ||
      constantConstraintRow == null ||
      xConstraintRow == null ||
      yConstraintRow == null
    ) {
      return makeIdentityTransform(rotationRadians, regularization);
    }
    for (let column = 0; column < count; column++) {
      const other = controls[column];
      if (other != null) {
        controlRow[column] =
          tpsKernel(control.source, other.source) +
          (row === column ? regularization : 0);
      }
    }
    controlRow[count] = 1;
    controlRow[count + 1] = control.source.x;
    controlRow[count + 2] = control.source.y;
    constantConstraintRow[row] = 1;
    xConstraintRow[row] = control.source.x;
    yConstraintRow[row] = control.source.y;
  }
  const xConstraintRow = matrix[count + 1];
  const yConstraintRow = matrix[count + 2];
  if (xConstraintRow == null || yConstraintRow == null) {
    return makeIdentityTransform(rotationRadians, regularization);
  }
  xConstraintRow[count + 1] = 1e-10;
  yConstraintRow[count + 2] = 1e-10;
  const xSolution = solveLinearSystem(
    matrix,
    controls.map((control) => control.target.x).concat([0, 0, 0]),
  );
  const ySolution = solveLinearSystem(
    matrix,
    controls.map((control) => control.target.y).concat([0, 0, 0]),
  );
  if (xSolution == null || ySolution == null) {
    return makeIdentityTransform(rotationRadians, regularization);
  }

  const xWeights = xSolution.slice(0, count);
  const yWeights = ySolution.slice(0, count);
  const affineX = xSolution.slice(count) as [number, number, number];
  const affineY = ySolution.slice(count) as [number, number, number];
  let bendingEnergy = 0;
  for (let row = 0; row < count; row++) {
    for (let column = 0; column < count; column++) {
      const rowControl = controls[row];
      const columnControl = controls[column];
      if (rowControl == null || columnControl == null) {
        continue;
      }
      const kernel = tpsKernel(rowControl.source, columnControl.source);
      bendingEnergy +=
        (xWeights[row] ?? 0) * kernel * (xWeights[column] ?? 0) +
        (yWeights[row] ?? 0) * kernel * (yWeights[column] ?? 0);
    }
  }
  bendingEnergy = Math.max(0, bendingEnergy / count);

  const affineDistortion = calculateAffineDistortion(affineX, affineY);
  const rotationDegrees = calculateRotationDegrees(
    affineX,
    affineY,
    rotationRadians,
  );

  return {
    controlPoints: controls.map((control) => control.source),
    xWeights,
    yWeights,
    affineX,
    affineY,
    rotationRadians,
    regularization,
    bendingEnergy,
    affineDistortion,
    rotationDegrees,
    transform(point) {
      const rotated = rotate(point, rotationRadians);
      let x = affineX[0] + affineX[1] * rotated.x + affineX[2] * rotated.y;
      let y = affineY[0] + affineY[1] * rotated.x + affineY[2] * rotated.y;
      for (const [index, control] of controls.entries()) {
        const kernel = tpsKernel(rotated, control.source);
        x += (xWeights[index] ?? 0) * kernel;
        y += (yWeights[index] ?? 0) * kernel;
      }
      return { x, y };
    },
  };
}

interface TransformJacobian {
  xx: number;
  xy: number;
  yx: number;
  yy: number;
}

function transformJacobian(
  transform: ThinPlateSplineTransform,
  point: WritingStrokePoint,
): TransformJacobian {
  const { rotationRadians, controlPoints, xWeights, yWeights } = transform;
  const cosine = Math.cos(rotationRadians);
  const sine = Math.sin(rotationRadians);
  const rotated = rotate(point, rotationRadians);
  let xQx = transform.affineX[1];
  let xQy = transform.affineX[2];
  let yQx = transform.affineY[1];
  let yQy = transform.affineY[2];

  for (const [index, control] of controlPoints.entries()) {
    const dx = rotated.x - control.x;
    const dy = rotated.y - control.y;
    const squaredDistance = dx * dx + dy * dy;
    if (squaredDistance <= 1e-16) {
      continue;
    }
    const derivative = Math.log(squaredDistance) + 1;
    const gradientX = dx * derivative;
    const gradientY = dy * derivative;
    xQx += (xWeights[index] ?? 0) * gradientX;
    xQy += (xWeights[index] ?? 0) * gradientY;
    yQx += (yWeights[index] ?? 0) * gradientX;
    yQy += (yWeights[index] ?? 0) * gradientY;
  }

  return {
    xx: xQx * cosine + xQy * sine,
    xy: -xQx * sine + xQy * cosine,
    yx: yQx * cosine + yQy * sine,
    yy: -yQx * sine + yQy * cosine,
  };
}

function isValidJacobian({ xx, xy, yx, yy }: TransformJacobian): boolean {
  const determinant = xx * yy - xy * yx;
  if (!(determinant > 0)) {
    return false;
  }
  const squaredSingularValueSum = xx * xx + xy * xy + yx * yx + yy * yy;
  const discriminant = Math.sqrt(
    Math.max(
      0,
      squaredSingularValueSum * squaredSingularValueSum -
        4 * determinant * determinant,
    ),
  );
  const largestSingularValue = Math.sqrt(
    Math.max(0, (squaredSingularValueSum + discriminant) / 2),
  );
  const smallestSingularValue =
    largestSingularValue > 0 ? determinant / largestSingularValue : 0;
  return (
    Number.isFinite(largestSingularValue) &&
    Number.isFinite(smallestSingularValue) &&
    smallestSingularValue >= 0.5 &&
    largestSingularValue <= 2
  );
}

function blendJacobians(
  baseline: TransformJacobian,
  fitted: TransformJacobian,
  alpha: number,
): TransformJacobian {
  return {
    xx: baseline.xx + alpha * (fitted.xx - baseline.xx),
    xy: baseline.xy + alpha * (fitted.xy - baseline.xy),
    yx: baseline.yx + alpha * (fitted.yx - baseline.yx),
    yy: baseline.yy + alpha * (fitted.yy - baseline.yy),
  };
}

function deformationValidationGrid(): WritingStrokePoint[] {
  const gridCoordinates = Array.from(
    { length: 7 },
    (_, index) => -1.5 + index * 0.5,
  );
  const lineSampleCoordinates = Array.from(
    { length: 17 },
    (_, index) => -1.5 + (index * 3) / 16,
  );
  const coordinates = [
    ...new Set([...gridCoordinates, ...lineSampleCoordinates]),
  ].sort((a, b) => a - b);
  return coordinates.flatMap((y) => coordinates.map((x) => ({ x, y })));
}

function preservesGridOrientation(
  transform: ThinPlateSplineTransform,
): boolean {
  const coordinates = [
    ...new Set(deformationValidationGrid().map(({ x }) => x)),
  ].sort((a, b) => a - b);
  const transformedRows = coordinates.map((y) =>
    coordinates.map((x) => transform.transform({ x, y })),
  );
  for (let row = 0; row < coordinates.length - 1; row++) {
    for (let column = 0; column < coordinates.length - 1; column++) {
      const topLeft = transformedRows[row]?.[column];
      const topRight = transformedRows[row]?.[column + 1];
      const bottomLeft = transformedRows[row + 1]?.[column];
      const bottomRight = transformedRows[row + 1]?.[column + 1];
      if (
        topLeft == null ||
        topRight == null ||
        bottomLeft == null ||
        bottomRight == null
      ) {
        return false;
      }
      const firstTriangle =
        (topRight.x - topLeft.x) * (bottomRight.y - topLeft.y) -
        (topRight.y - topLeft.y) * (bottomRight.x - topLeft.x);
      const secondTriangle =
        (bottomRight.x - topLeft.x) * (bottomLeft.y - topLeft.y) -
        (bottomRight.y - topLeft.y) * (bottomLeft.x - topLeft.x);
      if (firstTriangle <= 0 || secondTriangle <= 0) {
        return false;
      }
    }
  }
  return true;
}

function fitThinPlateSplineWithoutFoldovers(
  source: readonly WritingStrokePoint[],
  matches: readonly MatchResult[`pairs`][number][],
  rotationRadians: number,
  initialRegularization: number,
): ThinPlateSplineTransform {
  let regularization = initialRegularization;
  let lastTransform = makeIdentityTransform(rotationRadians, regularization);
  for (let attempt = 0; attempt < 16; attempt++) {
    lastTransform = fitThinPlateSpline(
      source,
      matches,
      rotationRadians,
      regularization,
    );
    if (preservesGridOrientation(lastTransform)) {
      return lastTransform;
    }
    regularization *= 2;
  }
  return lastTransform;
}

function calculateAffineDistortion(
  affineX: readonly [number, number, number],
  affineY: readonly [number, number, number],
): number {
  const [, b, c] = affineX;
  const [, e, f] = affineY;
  const trace = b * b + c * c + e * e + f * f;
  const determinant = (b * f - c * e) ** 2;
  const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * determinant));
  const largestSingularValue = Math.sqrt(
    Math.max(0, (trace + discriminant) / 2),
  );
  const smallestSingularValue = Math.sqrt(
    Math.max(0, (trace - discriminant) / 2),
  );
  return smallestSingularValue <= 1e-9
    ? 2
    : Math.max(0, largestSingularValue / smallestSingularValue - 1) +
        (b * f - c * e < 0 ? 2 : 0);
}

function calculateRotationDegrees(
  affineX: readonly [number, number, number],
  affineY: readonly [number, number, number],
  rotationRadians: number,
): number {
  const [, b, c] = affineX;
  const [, e, f] = affineY;
  const cosine = Math.cos(rotationRadians);
  const sine = Math.sin(rotationRadians);
  const combinedA = b * cosine + c * sine;
  const combinedB = -b * sine + c * cosine;
  const combinedC = e * cosine + f * sine;
  const combinedD = -e * sine + f * cosine;
  return (
    (Math.atan2(combinedC - combinedB, combinedA + combinedD) * 180) / Math.PI
  );
}

function blendThinPlateSplineTransform(
  fitted: ThinPlateSplineTransform,
  alpha: number,
): ThinPlateSplineTransform {
  const affineX: [number, number, number] = [
    alpha * fitted.affineX[0],
    1 - alpha + alpha * fitted.affineX[1],
    alpha * fitted.affineX[2],
  ];
  const affineY: [number, number, number] = [
    alpha * fitted.affineY[0],
    alpha * fitted.affineY[1],
    1 - alpha + alpha * fitted.affineY[2],
  ];
  const xWeights = fitted.xWeights.map((weight) => alpha * weight);
  const yWeights = fitted.yWeights.map((weight) => alpha * weight);
  return {
    ...fitted,
    xWeights,
    yWeights,
    affineX,
    affineY,
    bendingEnergy: fitted.bendingEnergy * alpha * alpha,
    affineDistortion: calculateAffineDistortion(affineX, affineY),
    rotationDegrees: calculateRotationDegrees(
      affineX,
      affineY,
      fitted.rotationRadians,
    ),
    transform(point) {
      const rotated = rotate(point, fitted.rotationRadians);
      let x = affineX[0] + affineX[1] * rotated.x + affineX[2] * rotated.y;
      let y = affineY[0] + affineY[1] * rotated.x + affineY[2] * rotated.y;
      for (const [index, control] of fitted.controlPoints.entries()) {
        const kernel = tpsKernel(rotated, control);
        x += (xWeights[index] ?? 0) * kernel;
        y += (yWeights[index] ?? 0) * kernel;
      }
      return { x, y };
    },
  };
}

function constrainThinPlateSpline(fitted: ThinPlateSplineTransform): {
  transform: ThinPlateSplineTransform;
  deformationAlpha: number;
} {
  const validationPoints = deformationValidationGrid();
  const fittedJacobians = validationPoints.map((point) =>
    transformJacobian(fitted, point),
  );
  const cosine = Math.cos(fitted.rotationRadians);
  const sine = Math.sin(fitted.rotationRadians);
  const baseline: TransformJacobian = {
    xx: cosine,
    xy: -sine,
    yx: sine,
    yy: cosine,
  };
  const isValid = (alpha: number): boolean =>
    fittedJacobians.every((jacobian) =>
      isValidJacobian(blendJacobians(baseline, jacobian, alpha)),
    );
  if (isValid(1)) {
    return { transform: fitted, deformationAlpha: 1 };
  }

  let validAlpha = 0;
  let invalidAlpha = 1;
  for (let iteration = 0; iteration < 20; iteration++) {
    const alpha = (validAlpha + invalidAlpha) / 2;
    if (isValid(alpha)) {
      validAlpha = alpha;
    } else {
      invalidAlpha = alpha;
    }
  }
  if (validAlpha === 0) {
    return {
      transform: makeIdentityTransform(
        fitted.rotationRadians,
        fitted.regularization,
      ),
      deformationAlpha: 0,
    };
  }
  return {
    transform: blendThinPlateSplineTransform(fitted, validAlpha),
    deformationAlpha: validAlpha,
  };
}

function averageMatchDistance(
  source: readonly WritingStrokePoint[],
  matches: readonly MatchResult[`pairs`][number][],
): number {
  if (matches.length === 0) {
    return 2;
  }
  let distanceTotal = 0;
  let validMatches = 0;
  for (const match of matches) {
    const sourcePoint = source[match.sourceIndex];
    if (sourcePoint != null) {
      const targetPoint = match.targetPoint;
      distanceTotal += distance(sourcePoint, targetPoint);
      validMatches++;
    }
  }
  return validMatches === 0 ? 2 : distanceTotal / validMatches;
}

function polylineLength(points: readonly WritingStrokePoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    const start = points[index - 1];
    const end = points[index];
    if (start != null && end != null) {
      length += distance(start, end);
    }
  }
  return length;
}

function unmatchedStrokeArcLengthFraction(
  strokes: readonly (readonly WritingStrokePoint[])[],
  unmatchedStrokeIndices: readonly number[],
): number {
  let totalLength = 0;
  for (const stroke of strokes) {
    totalLength += polylineLength(stroke);
  }
  if (totalLength === 0) {
    return 0;
  }
  let unmatchedLength = 0;
  for (const index of unmatchedStrokeIndices) {
    unmatchedLength += polylineLength(strokes[index] ?? []);
  }
  return unmatchedLength / totalLength;
}

function transformPoints(
  points: readonly WritingStrokePoint[],
  transform: ThinPlateSplineTransform,
): WritingStrokePoint[] {
  return points.map((point) => transform.transform(point));
}

export function gradeCharacterShape(
  drawnStrokes: readonly (readonly WritingStrokePoint[])[],
  referencePaths: readonly string[],
  options: Partial<ShapeContextOptions> = {},
  sampleCountOverride?: number,
): ShapeContextGrade {
  const settings = { ...shapeContextGraderDefaults, ...options };
  validateOptions(settings);
  if (
    sampleCountOverride != null &&
    (!Number.isInteger(sampleCountOverride) ||
      sampleCountOverride < 8 ||
      sampleCountOverride > 256)
  ) {
    throw new RangeError(`Invalid shape-context sample-count override`);
  }
  const sampling = resolvedSampleCount(
    referencePaths,
    settings,
    sampleCountOverride,
  );
  const source = sampleStrokes(
    limitWritingStrokes(drawnStrokes),
    sampling.count,
  );
  const target = samplePaths(referencePaths, sampling.count);
  const sourcePoints = source.points;
  const targetPoints = target.points;
  if (sourcePoints.length === 0 || targetPoints.length === 0) {
    const unmatchedSourceStrokeIndices = source.strokes.map(
      (_, index) => index,
    );
    const unmatchedTargetStrokeIndices = target.strokes.map(
      (_, index) => index,
    );
    const missingReferenceStrokeFraction = unmatchedStrokeArcLengthFraction(
      target.strokes,
      unmatchedTargetStrokeIndices,
    );
    const extraHandwritingStrokeFraction = unmatchedStrokeArcLengthFraction(
      source.strokes,
      unmatchedSourceStrokeIndices,
    );
    const transform = makeIdentityTransform(0, settings.tpsRegularization);
    const weightedInitialMatchingError =
      emptyGeometryBaseCost * shapeContextScoreWeights.initialMatchingError;
    const weightedResidualMatchingError =
      emptyGeometryBaseCost * shapeContextScoreWeights.residualMatchingError;
    // Preserve the fixed empty-geometry cost while exposing its weighted components.
    const emptyGeometryPenalty =
      emptyGeometryBaseCost -
      weightedInitialMatchingError -
      weightedResidualMatchingError;
    const missingReferenceStrokePenalty =
      missingReferenceStrokeFraction *
      settings.missingReferenceStrokePenaltyWeight;
    const extraHandwritingStrokePenalty =
      extraHandwritingStrokeFraction *
      settings.extraHandwritingStrokePenaltyWeight;
    const weightedScoreContributions: ShapeContextScoreContributions = {
      initialMatchingError: weightedInitialMatchingError,
      residualMatchingError: weightedResidualMatchingError,
      missingReferenceStrokePenalty,
      extraHandwritingStrokePenalty,
      emptyGeometryPenalty,
    };
    const shapeCost =
      weightedScoreContributions.initialMatchingError +
      weightedScoreContributions.residualMatchingError +
      weightedScoreContributions.missingReferenceStrokePenalty +
      weightedScoreContributions.extraHandwritingStrokePenalty +
      weightedScoreContributions.emptyGeometryPenalty;
    return {
      shapeCost,
      shapeSimilarity: Math.exp(-shapeCost),
      deformationAlpha: 1,
      initialMatchingError: emptyGeometryBaseCost,
      residualMatchingError: emptyGeometryBaseCost,
      bendingEnergy: 0,
      affineDistortion: 0,
      rotationDegrees: 0,
      missingReferenceStrokeFraction,
      extraHandwritingStrokeFraction,
      weightedScoreContributions,
      correspondences: [],
      strokePairCosts: [],
      strokeAssignments: [],
      dtwAlignments: [],
      unmatchedSourceStrokeIndices,
      unmatchedTargetStrokeIndices,
      sourceStrokeIndices: source.pointStrokeIndices,
      targetStrokeIndices: target.pointStrokeIndices,
      unmatchedSourceIndices: sourcePoints.map((_, index) => index),
      unmatchedTargetIndices: targetPoints.map((_, index) => index),
      sourcePoints,
      targetPoints,
      transformedPoints: sourcePoints.map((point) =>
        transform.transform(point),
      ),
      sourceStrokes: source.strokes,
      targetStrokes: target.strokes,
      referenceLength: sampling.referenceLength,
      sampleCount: sampling.count,
      sourceStrokeSampleCounts: source.strokeSampleCounts,
      targetStrokeSampleCounts: target.strokeSampleCounts,
      transform,
      options: settings,
    };
  }

  let rotationRadians = 0;
  let bestCost = Infinity;
  const targetShapeContexts = shapeContexts(
    targetPoints,
    settings.radialBins,
    settings.angularBins,
  );
  const sourceSteps = settings.rotationSteps;
  let strokeMatching: ReturnType<typeof matchStrokes> | undefined;
  for (let step = 0; step <= sourceSteps * 2; step++) {
    const degrees =
      settings.maxRotationDegrees === 0
        ? 0
        : -settings.maxRotationDegrees +
          (2 * settings.maxRotationDegrees * step) / (sourceSteps * 2);
    const candidateRotation = (degrees * Math.PI) / 180;
    const rotatedPoints = sourcePoints.map((point) =>
      rotate(point, candidateRotation),
    );
    const rotatedStrokes = source.strokes.map((stroke) =>
      stroke.map((point) => rotate(point, candidateRotation)),
    );
    const candidateMatching = matchStrokes(
      shapeContexts(rotatedPoints, settings.radialBins, settings.angularBins),
      targetShapeContexts,
      rotatedPoints,
      targetPoints,
      rotatedStrokes,
      target.strokes,
      settings.unmatchedCost,
      0.04,
    );
    if (candidateMatching.matches.totalCost < bestCost) {
      bestCost = candidateMatching.matches.totalCost;
      rotationRadians = candidateRotation;
      strokeMatching = candidateMatching;
    }
  }
  if (strokeMatching == null) {
    throw new Error(`Rotation search did not evaluate a stroke assignment`);
  }
  const rotatedSourcePoints = sourcePoints.map((point) =>
    rotate(point, rotationRadians),
  );
  const activeMatches = strokeMatching.matches;
  const initialMatchingError = averageMatchDistance(
    rotatedSourcePoints,
    activeMatches.pairs,
  );
  let transformedPoints = sourcePoints.map((point) =>
    rotate(point, rotationRadians),
  );
  let transform = makeIdentityTransform(
    rotationRadians,
    settings.tpsRegularization,
  );
  let deformationAlpha = 1;

  for (let iteration = 0; iteration < settings.iterations; iteration++) {
    const constrainedTransform = constrainThinPlateSpline(
      fitThinPlateSplineWithoutFoldovers(
        sourcePoints,
        activeMatches.pairs,
        rotationRadians,
        settings.tpsRegularization,
      ),
    );
    transform = constrainedTransform.transform;
    deformationAlpha = constrainedTransform.deformationAlpha;
    transformedPoints = transformPoints(sourcePoints, transform);
  }
  const constrainedTransform = constrainThinPlateSpline(
    fitThinPlateSplineWithoutFoldovers(
      sourcePoints,
      activeMatches.pairs,
      rotationRadians,
      settings.tpsRegularization,
    ),
  );
  transform = constrainedTransform.transform;
  deformationAlpha = constrainedTransform.deformationAlpha;
  transformedPoints = transformPoints(sourcePoints, transform);

  const residualMatchingError = averageMatchDistance(
    transformedPoints,
    activeMatches.pairs,
  );
  const missingReferenceStrokeFraction = unmatchedStrokeArcLengthFraction(
    target.strokes,
    strokeMatching.unmatchedTargetStrokeIndices,
  );
  const extraHandwritingStrokeFraction = unmatchedStrokeArcLengthFraction(
    source.strokes,
    strokeMatching.unmatchedSourceStrokeIndices,
  );
  const missingReferenceStrokePenalty =
    missingReferenceStrokeFraction *
    settings.missingReferenceStrokePenaltyWeight;
  const extraHandwritingStrokePenalty =
    extraHandwritingStrokeFraction *
    settings.extraHandwritingStrokePenaltyWeight;
  const bendingEnergy = transform.bendingEnergy;
  const affineDistortion = transform.affineDistortion;
  const rotationDegrees = transform.rotationDegrees;
  const weightedScoreContributions: ShapeContextScoreContributions = {
    initialMatchingError:
      initialMatchingError * shapeContextScoreWeights.initialMatchingError,
    residualMatchingError:
      residualMatchingError * shapeContextScoreWeights.residualMatchingError,
    missingReferenceStrokePenalty,
    extraHandwritingStrokePenalty,
    emptyGeometryPenalty: 0,
  };
  const shapeCost =
    weightedScoreContributions.initialMatchingError +
    weightedScoreContributions.residualMatchingError +
    weightedScoreContributions.missingReferenceStrokePenalty +
    weightedScoreContributions.extraHandwritingStrokePenalty;
  const correspondences = activeMatches.pairs.flatMap((match) => {
    const sourcePoint = sourcePoints[match.sourceIndex];
    const targetPoint = match.targetPoint;
    const transformedPoint = transformedPoints[match.sourceIndex];
    if (sourcePoint == null || transformedPoint == null) {
      return [];
    }
    const initialPoint = rotate(sourcePoint, rotationRadians);
    return [
      {
        ...match,
        descriptorCost: match.cost,
        initialDistance: distance(initialPoint, targetPoint),
        residualDistance: distance(transformedPoint, targetPoint),
      },
    ];
  });

  return {
    shapeCost,
    shapeSimilarity: Math.exp(-shapeCost),
    deformationAlpha,
    initialMatchingError,
    residualMatchingError,
    bendingEnergy,
    affineDistortion,
    rotationDegrees,
    missingReferenceStrokeFraction,
    extraHandwritingStrokeFraction,
    weightedScoreContributions,
    correspondences,
    strokePairCosts: strokeMatching.pairCosts,
    strokeAssignments: strokeMatching.assignments,
    dtwAlignments: strokeMatching.dtwAlignments,
    unmatchedSourceStrokeIndices: strokeMatching.unmatchedSourceStrokeIndices,
    unmatchedTargetStrokeIndices: strokeMatching.unmatchedTargetStrokeIndices,
    sourceStrokeIndices: source.pointStrokeIndices,
    targetStrokeIndices: target.pointStrokeIndices,
    unmatchedSourceIndices: activeMatches.unmatchedSourceIndices,
    unmatchedTargetIndices: activeMatches.unmatchedTargetIndices,
    sourcePoints,
    targetPoints,
    transformedPoints,
    sourceStrokes: source.strokes,
    targetStrokes: target.strokes,
    referenceLength: sampling.referenceLength,
    sampleCount: sampling.count,
    sourceStrokeSampleCounts: source.strokeSampleCounts,
    targetStrokeSampleCounts: target.strokeSampleCounts,
    transform,
    options: settings,
  };
}
