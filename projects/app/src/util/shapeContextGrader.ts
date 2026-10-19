import SVGPathCommander from "svg-path-commander";

export interface WritingStrokePoint {
  x: number;
  y: number;
}

export interface ShapeContextOptions {
  sampleCount: number | null;
  sampleSpacing: number;
  radialBins: number;
  angularBins: number;
  iterations: number;
  tpsRegularization: number;
  unmatchedCost: number;
  maxRotationDegrees: number;
  rotationSteps: number;
}

export interface ShapeContextCorrespondence {
  sourceIndex: number;
  targetIndex: number;
  descriptorCost: number;
  initialDistance: number;
  residualDistance: number;
}

export interface ShapeContextGeometryCoverage {
  referenceToHandwriting: number;
  handwritingToReference: number;
  referenceLongestUncoveredRun: number;
  handwritingLongestUncoveredRun: number;
}

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
  similarity: number;
  combinedCost: number;
  initialMatchingError: number;
  residualMatchingError: number;
  bendingEnergy: number;
  affineDistortion: number;
  rotationDegrees: number;
  rotationPenalty: number;
  unmatchedPointPenalty: number;
  initialGeometryCoverage: ShapeContextGeometryCoverage;
  residualGeometryCoverage: ShapeContextGeometryCoverage;
  geometryCoveragePenalty: number;
  geometryCoverageTolerance: number;
  correspondences: ShapeContextCorrespondence[];
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
  iterations: 3,
  tpsRegularization: 0.08,
  unmatchedCost: 0.55,
  maxRotationDegrees: 12,
  rotationSteps: 1,
};

const radialMinimum = 0.125;
const radialMaximum = 2.5;
const geometryCoverageTolerance = 0.06;

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
  pairs: Array<{ sourceIndex: number; targetIndex: number; cost: number }>;
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
  return SVGPathCommander.getTotalLength(path);
}

function samplePath(path: string, count: number): WritingStrokePoint[] {
  const length = pathLength(path);
  if (!(length > 0)) {
    return [];
  }
  if (count === 1) {
    return [SVGPathCommander.getPointAtLength(path, length / 2)];
  }
  return Array.from({ length: count }, (_, index) =>
    SVGPathCommander.getPointAtLength(path, (length * index) / (count - 1)),
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
        256,
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

function matchPoints(
  sourceContexts: readonly (readonly number[])[],
  targetContexts: readonly (readonly number[])[],
  sourcePoints: readonly WritingStrokePoint[],
  targetPoints: readonly WritingStrokePoint[],
  unmatchedCost: number,
  spatialWeight: number,
  sourceStrokeIndices?: readonly number[],
  targetStrokeIndices?: readonly number[],
  sourceStrokeTargets?: readonly (number | null)[],
): MatchResult {
  const sourceCount = sourceContexts.length;
  const targetCount = targetContexts.length;
  if (sourceCount === 0 || targetCount === 0) {
    return {
      pairs: [],
      unmatchedSourceIndices: sourcePoints.map((_, index) => index),
      unmatchedTargetIndices: targetPoints.map((_, index) => index),
      totalCost: (sourceCount + targetCount) * unmatchedCost,
    };
  }

  const sourceIsSmaller = sourceCount <= targetCount;
  const rowCount = Math.min(sourceCount, targetCount);
  const realColumnCount = Math.max(sourceCount, targetCount);
  const costs = Array.from({ length: rowCount }, (_, row) =>
    Array.from({ length: realColumnCount + rowCount }, (_, column) => {
      if (column >= realColumnCount) {
        return 0;
      }
      const sourceIndex = sourceIsSmaller ? row : column;
      const targetIndex = sourceIsSmaller ? column : row;
      const descriptorCost = chiSquaredDistance(
        sourceContexts[sourceIndex] ?? [],
        targetContexts[targetIndex] ?? [],
      );
      const sourcePoint = sourcePoints[sourceIndex];
      const targetPoint = targetPoints[targetIndex];
      const sourceStrokeIndex = sourceStrokeIndices?.[sourceIndex];
      const targetStrokeIndex = targetStrokeIndices?.[targetIndex];
      if (
        sourceStrokeTargets != null &&
        (sourceStrokeIndex == null ||
          targetStrokeIndex == null ||
          sourceStrokeTargets[sourceStrokeIndex] !== targetStrokeIndex)
      ) {
        return Infinity;
      }
      return sourcePoint == null || targetPoint == null
        ? Infinity
        : descriptorCost +
            spatialWeight * distance(sourcePoint, targetPoint) -
            2 * unmatchedCost;
    }),
  );
  const assignment = hungarian(costs);
  const pairs: MatchResult[`pairs`] = [];
  const unmatchedSourceIndices: number[] = [];
  const unmatchedTargetIndices: number[] = [];
  const matchedSources = new Set<number>();
  const matchedTargets = new Set<number>();
  let totalCost = 0;
  for (let row = 0; row < rowCount; row++) {
    const column = assignment[row] ?? -1;
    if (column < 0 || column >= realColumnCount) {
      continue;
    }

    const sourceIndex = sourceIsSmaller ? row : column;
    const targetIndex = sourceIsSmaller ? column : row;
    const sourcePoint = sourcePoints[sourceIndex];
    const targetPoint = targetPoints[targetIndex];
    if (sourcePoint == null || targetPoint == null) {
      continue;
    }
    const cost = (costs[row]?.[column] ?? 0) + 2 * unmatchedCost;
    pairs.push({ sourceIndex, targetIndex, cost });
    matchedSources.add(sourceIndex);
    matchedTargets.add(targetIndex);
    totalCost += cost;
  }
  for (let index = 0; index < sourceCount; index++) {
    if (!matchedSources.has(index)) {
      unmatchedSourceIndices.push(index);
      totalCost += unmatchedCost;
    }
  }
  for (let index = 0; index < targetCount; index++) {
    if (!matchedTargets.has(index)) {
      unmatchedTargetIndices.push(index);
      totalCost += unmatchedCost;
    }
  }
  return { pairs, unmatchedSourceIndices, unmatchedTargetIndices, totalCost };
}

function assignSourceStrokes(
  matches: MatchResult,
  sourceStrokeIndices: readonly number[],
  targetStrokeIndices: readonly number[],
): Array<number | null> {
  const sourceStrokeCount =
    sourceStrokeIndices.length === 0 ? 0 : Math.max(...sourceStrokeIndices) + 1;
  const targetStrokeCount =
    targetStrokeIndices.length === 0 ? 0 : Math.max(...targetStrokeIndices) + 1;
  const counts = Array.from({ length: sourceStrokeCount }, () =>
    Array.from({ length: targetStrokeCount }, () => 0),
  );
  for (const match of matches.pairs) {
    const sourceStrokeIndex = sourceStrokeIndices[match.sourceIndex];
    const targetStrokeIndex = targetStrokeIndices[match.targetIndex];
    if (sourceStrokeIndex != null && targetStrokeIndex != null) {
      const row = counts[sourceStrokeIndex];
      if (row != null) {
        row[targetStrokeIndex] = (row[targetStrokeIndex] ?? 0) + 1;
      }
    }
  }
  return counts.map((row) => {
    let assignedStroke: number | null = null;
    let mostMatches = 0;
    for (const [strokeIndex, count] of row.entries()) {
      if (count > mostMatches) {
        assignedStroke = strokeIndex;
        mostMatches = count;
      }
    }
    return assignedStroke;
  });
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
  target: readonly WritingStrokePoint[],
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
    const targetPoint = target[match.targetIndex];
    if (sourcePoint == null || targetPoint == null) {
      continue;
    }
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

  const [a, b, c] = affineX;
  const [d, e, f] = affineY;
  const trace = b * b + c * c + e * e + f * f;
  const determinant = (b * f - c * e) ** 2;
  const discriminant = Math.sqrt(Math.max(0, trace * trace - 4 * determinant));
  const largestSingularValue = Math.sqrt(
    Math.max(0, (trace + discriminant) / 2),
  );
  const smallestSingularValue = Math.sqrt(
    Math.max(0, (trace - discriminant) / 2),
  );
  const affineDistortion =
    smallestSingularValue <= 1e-9
      ? 2
      : Math.max(0, largestSingularValue / smallestSingularValue - 1) +
        (b * f - c * e < 0 ? 2 : 0);
  const cosine = Math.cos(rotationRadians);
  const sine = Math.sin(rotationRadians);
  const combinedA = b * cosine + c * sine;
  const combinedB = -b * sine + c * cosine;
  const combinedC = e * cosine + f * sine;
  const combinedD = -e * sine + f * cosine;
  const rotationDegrees =
    (Math.atan2(combinedC - combinedB, combinedA + combinedD) * 180) / Math.PI;

  return {
    controlPoints: controls.map((control) => control.source),
    xWeights,
    yWeights,
    affineX: [a, b, c],
    affineY: [d, e, f],
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

function preservesGridOrientation(
  transform: ThinPlateSplineTransform,
): boolean {
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
  target: readonly WritingStrokePoint[],
  matches: readonly MatchResult[`pairs`][number][],
  rotationRadians: number,
  regularization: number,
): ThinPlateSplineTransform {
  for (let attempt = 0; attempt < 16; attempt++) {
    const transform = fitThinPlateSpline(
      source,
      target,
      matches,
      rotationRadians,
      regularization,
    );
    if (preservesGridOrientation(transform)) {
      return transform;
    }
    regularization *= 2;
  }
  return makeIdentityTransform(rotationRadians, regularization);
}

function averageMatchDistance(
  source: readonly WritingStrokePoint[],
  target: readonly WritingStrokePoint[],
  matches: readonly MatchResult[`pairs`][number][],
): number {
  if (matches.length === 0) {
    return 2;
  }
  let distanceTotal = 0;
  let validMatches = 0;
  for (const match of matches) {
    const sourcePoint = source[match.sourceIndex];
    const targetPoint = target[match.targetIndex];
    if (sourcePoint != null && targetPoint != null) {
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

function resampleStrokesForCoverage(
  strokes: readonly (readonly WritingStrokePoint[])[],
): WritingStrokePoint[][] {
  const lengths = strokes.map(polylineLength);
  const totalLength = lengths.reduce((total, length) => total + length, 0);
  const activeStrokeCount = lengths.filter((length) => length > 0).length;
  const sampleCount = Math.min(
    256,
    Math.max(activeStrokeCount * 2, Math.ceil(totalLength / 0.05)),
  );
  const counts = allocateSampleCounts(lengths, sampleCount);
  return strokes.flatMap((stroke, index) => {
    const count = counts[index] ?? 0;
    return count < 1 ? [] : [samplePolyline(stroke, count)];
  });
}

function distanceToStrokes(
  point: WritingStrokePoint,
  strokes: readonly (readonly WritingStrokePoint[])[],
): number {
  let nearestDistance = Infinity;
  for (const stroke of strokes) {
    for (let index = 1; index < stroke.length; index++) {
      const start = stroke[index - 1];
      const end = stroke[index];
      if (start == null || end == null) {
        continue;
      }
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const lengthSquared = dx * dx + dy * dy;
      const projection =
        lengthSquared === 0
          ? 0
          : Math.max(
              0,
              Math.min(
                1,
                ((point.x - start.x) * dx + (point.y - start.y) * dy) /
                  lengthSquared,
              ),
            );
      nearestDistance = Math.min(
        nearestDistance,
        Math.hypot(
          point.x - (start.x + projection * dx),
          point.y - (start.y + projection * dy),
        ),
      );
    }
  }
  return nearestDistance;
}

function uncoveredGeometry(
  source: readonly (readonly WritingStrokePoint[])[],
  target: readonly (readonly WritingStrokePoint[])[],
): { fraction: number; longestRun: number } {
  const sampledStrokes = resampleStrokesForCoverage(source);
  const sourcePoints = sampledStrokes.flat();
  const sourceLength = source.reduce(
    (total, stroke) => total + polylineLength(stroke),
    0,
  );
  if (sourcePoints.length === 0) {
    return { fraction: 0, longestRun: 0 };
  }
  if (!target.some((stroke) => polylineLength(stroke) > 0)) {
    const longestStrokeLength = Math.max(...source.map(polylineLength));
    return {
      fraction: 1,
      longestRun: sourceLength > 0 ? longestStrokeLength / sourceLength : 0,
    };
  }
  const uncoveredByStroke = sampledStrokes.map((stroke) =>
    stroke.map(
      (point) => distanceToStrokes(point, target) > geometryCoverageTolerance,
    ),
  );
  const uncoveredCount = uncoveredByStroke.reduce(
    (total, stroke) => total + stroke.filter(Boolean).length,
    0,
  );
  let longestRunLength = 0;
  for (const [strokeIndex, stroke] of sampledStrokes.entries()) {
    const strokeLength = polylineLength(stroke);
    const uncoveredFlags = uncoveredByStroke[strokeIndex] ?? [];
    let runCount = 0;
    let longestStrokeRun = 0;
    for (const isUncovered of uncoveredFlags) {
      if (isUncovered) {
        runCount++;
        longestStrokeRun = Math.max(longestStrokeRun, runCount);
      } else {
        runCount = 0;
      }
    }
    longestRunLength = Math.max(
      longestRunLength,
      longestStrokeRun *
        (stroke.length > 1 ? strokeLength / (stroke.length - 1) : 0),
    );
  }
  return {
    fraction: uncoveredCount / sourcePoints.length,
    longestRun: sourceLength > 0 ? longestRunLength / sourceLength : 0,
  };
}

function geometryCoverage(
  source: readonly (readonly WritingStrokePoint[])[],
  target: readonly (readonly WritingStrokePoint[])[],
): ShapeContextGeometryCoverage {
  const referenceCoverage = uncoveredGeometry(target, source);
  const handwritingCoverage = uncoveredGeometry(source, target);
  return {
    referenceToHandwriting: referenceCoverage.fraction,
    handwritingToReference: handwritingCoverage.fraction,
    referenceLongestUncoveredRun: referenceCoverage.longestRun,
    handwritingLongestUncoveredRun: handwritingCoverage.longestRun,
  };
}

function geometryCoverageCost(coverage: ShapeContextGeometryCoverage): number {
  return (
    (coverage.referenceToHandwriting + coverage.handwritingToReference) / 2 +
    coverage.referenceLongestUncoveredRun +
    coverage.handwritingLongestUncoveredRun
  );
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
  const source = sampleStrokes(drawnStrokes, sampling.count);
  const target = samplePaths(referencePaths, sampling.count);
  const sourcePoints = source.points;
  const targetPoints = target.points;
  const emptyMatch = matchPoints(
    [],
    [],
    sourcePoints,
    targetPoints,
    settings.unmatchedCost,
    0,
  );
  if (sourcePoints.length === 0 || targetPoints.length === 0) {
    const initialGeometryCoverage = geometryCoverage(
      source.strokes,
      target.strokes,
    );
    const transform = makeIdentityTransform(0, settings.tpsRegularization);
    const unmatchedPointPenalty =
      sourcePoints.length + targetPoints.length === 0
        ? 1
        : (sourcePoints.length + targetPoints.length) /
          Math.max(1, sourcePoints.length + targetPoints.length);
    const geometryCoveragePenalty = geometryCoverageCost(
      initialGeometryCoverage,
    );
    const combinedCost = 2 + unmatchedPointPenalty + geometryCoveragePenalty;
    return {
      similarity: Math.exp(-combinedCost),
      combinedCost,
      initialMatchingError: 2,
      residualMatchingError: 2,
      bendingEnergy: 0,
      affineDistortion: 0,
      rotationDegrees: 0,
      rotationPenalty: 0,
      unmatchedPointPenalty,
      initialGeometryCoverage,
      residualGeometryCoverage: initialGeometryCoverage,
      geometryCoveragePenalty,
      geometryCoverageTolerance,
      correspondences: [],
      sourceStrokeIndices: source.pointStrokeIndices,
      targetStrokeIndices: target.pointStrokeIndices,
      unmatchedSourceIndices: emptyMatch.unmatchedSourceIndices,
      unmatchedTargetIndices: emptyMatch.unmatchedTargetIndices,
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
  let matches: MatchResult | null = null;
  let bestCost = Infinity;
  const targetShapeContexts = shapeContexts(
    targetPoints,
    settings.radialBins,
    settings.angularBins,
  );
  const sourceSteps = settings.rotationSteps;
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
    const candidateMatches = matchPoints(
      shapeContexts(rotatedPoints, settings.radialBins, settings.angularBins),
      targetShapeContexts,
      rotatedPoints,
      targetPoints,
      settings.unmatchedCost,
      0.04,
    );
    if (candidateMatches.totalCost < bestCost) {
      bestCost = candidateMatches.totalCost;
      rotationRadians = candidateRotation;
      matches = candidateMatches;
    }
  }
  const rotatedSourcePoints = sourcePoints.map((point) =>
    rotate(point, rotationRadians),
  );
  const sourceStrokeTargets = assignSourceStrokes(
    matches ?? emptyMatch,
    source.pointStrokeIndices,
    target.pointStrokeIndices,
  );
  let activeMatches = matchPoints(
    shapeContexts(
      rotatedSourcePoints,
      settings.radialBins,
      settings.angularBins,
    ),
    targetShapeContexts,
    rotatedSourcePoints,
    targetPoints,
    settings.unmatchedCost,
    0.04,
    source.pointStrokeIndices,
    target.pointStrokeIndices,
    sourceStrokeTargets,
  );
  const initialMatchingError = averageMatchDistance(
    rotatedSourcePoints,
    targetPoints,
    activeMatches.pairs,
  );
  let transformedPoints = sourcePoints.map((point) =>
    rotate(point, rotationRadians),
  );
  let transform = makeIdentityTransform(
    rotationRadians,
    settings.tpsRegularization,
  );

  for (let iteration = 0; iteration < settings.iterations; iteration++) {
    transform = fitThinPlateSplineWithoutFoldovers(
      sourcePoints,
      targetPoints,
      activeMatches.pairs,
      rotationRadians,
      settings.tpsRegularization,
    );
    transformedPoints = transformPoints(sourcePoints, transform);
    activeMatches = matchPoints(
      shapeContexts(
        transformedPoints,
        settings.radialBins,
        settings.angularBins,
      ),
      targetShapeContexts,
      transformedPoints,
      targetPoints,
      settings.unmatchedCost,
      0.12,
      source.pointStrokeIndices,
      target.pointStrokeIndices,
      sourceStrokeTargets,
    );
  }
  transform = fitThinPlateSplineWithoutFoldovers(
    sourcePoints,
    targetPoints,
    activeMatches.pairs,
    rotationRadians,
    settings.tpsRegularization,
  );
  transformedPoints = transformPoints(sourcePoints, transform);

  const residualMatchingError = averageMatchDistance(
    transformedPoints,
    targetPoints,
    activeMatches.pairs,
  );
  const rotatedSourceStrokes = source.strokes.map((stroke) =>
    stroke.map((point) => rotate(point, rotationRadians)),
  );
  const initialAlignedGeometryCoverage = geometryCoverage(
    rotatedSourceStrokes,
    target.strokes,
  );
  const residualGeometryCoverage = geometryCoverage(
    source.strokes.map((stroke) =>
      stroke.map((point) => transform.transform(point)),
    ),
    target.strokes,
  );
  const geometryCoveragePenalty = Math.min(
    geometryCoverageCost(initialAlignedGeometryCoverage),
    geometryCoverageCost(residualGeometryCoverage),
  );
  const unmatchedPointPenalty =
    (activeMatches.unmatchedSourceIndices.length +
      activeMatches.unmatchedTargetIndices.length) /
    (sourcePoints.length + targetPoints.length);
  const bendingEnergy = transform.bendingEnergy;
  const affineDistortion = transform.affineDistortion;
  const rotationDegrees = transform.rotationDegrees;
  const rotationPenalty = Math.max(
    0,
    (Math.abs(rotationDegrees) - settings.maxRotationDegrees) / 30,
  );
  const combinedCost =
    initialMatchingError * 0.25 +
    residualMatchingError * 0.35 +
    bendingEnergy * 0.04 +
    affineDistortion * 0.15 +
    rotationPenalty * 0.4 +
    unmatchedPointPenalty * 0.5 +
    geometryCoveragePenalty;
  const correspondences = activeMatches.pairs.flatMap((match) => {
    const sourcePoint = sourcePoints[match.sourceIndex];
    const targetPoint = targetPoints[match.targetIndex];
    const transformedPoint = transformedPoints[match.sourceIndex];
    if (
      sourcePoint == null ||
      targetPoint == null ||
      transformedPoint == null
    ) {
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
    similarity: Math.exp(-combinedCost),
    combinedCost,
    initialMatchingError,
    residualMatchingError,
    bendingEnergy,
    affineDistortion,
    rotationDegrees,
    rotationPenalty,
    unmatchedPointPenalty,
    initialGeometryCoverage: initialAlignedGeometryCoverage,
    residualGeometryCoverage,
    geometryCoveragePenalty,
    geometryCoverageTolerance,
    correspondences,
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
