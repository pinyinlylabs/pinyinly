import SVGPathCommander from "svg-path-commander";
import { formatAtom, parseStrokeSpec } from "@/util/strokeSpec";
import { invariant } from "@pinyinly/lib/invariant";
import { z } from "zod";
import type { StrokeSpecSliceBound } from "@/util/strokeSpec";
import type { StrokeSpecString } from "@/data/model";

export interface SvgPathIntersection {
  x: number;
  y: number;
  length: number;
  boundaryLength: number;
  t1: number;
  t2: number;
}

export interface BuildSvgSegmentPathFromBoundariesArgs {
  targetPath: string;
  fromBoundaryPath: string;
  fromOccurrence: number;
  toBoundaryPath: string;
  toOccurrence: number;
}

export interface BuildClosedSvgSegmentPathFromMedianOccurrencesArgs {
  targetPath: string;
  targetMedianPath: string;
  cutterPath: string;
  fromOccurrence: number;
  toOccurrence: number;
}

export interface BuildClosedSvgSegmentPathFromStrokeSpecArgs {
  strokePathsById: Readonly<Record<number, string>>;
  medianPathsById?: Readonly<Record<number, string>>;
  strokeSpecText: string;
}

const sampleStep = 2;
const intersectionDedupDistance = 0.5;
const curveLengthSubdivisions = 20;

interface PathPoint {
  x: number;
  y: number;
}

interface CubicCurveSegment {
  commandIndex: number;
  start: PathPoint;
  control1: PathPoint;
  control2: PathPoint;
  end: PathPoint;
}

const pointSchema = z.tuple([z.number(), z.number()]).readonly();
export type StrokeMedianPoint = z.infer<typeof pointSchema>;

function distanceSquared(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy;
}

function formatNumber(value: number): string {
  const rounded = Number(value.toFixed(2));
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function lerpPoint(start: PathPoint, end: PathPoint, t: number): PathPoint {
  return {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
}

function evaluateCubicSegmentAt(
  segment: CubicCurveSegment,
  t: number,
): PathPoint {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;

  return {
    x:
      segment.start.x * mt2 * mt +
      3 * segment.control1.x * mt2 * t +
      3 * segment.control2.x * mt * t2 +
      segment.end.x * t2 * t,
    y:
      segment.start.y * mt2 * mt +
      3 * segment.control1.y * mt2 * t +
      3 * segment.control2.y * mt * t2 +
      segment.end.y * t2 * t,
  };
}

function splitCubicSegmentAt(
  segment: CubicCurveSegment,
  t: number,
): { left: CubicCurveSegment; right: CubicCurveSegment } {
  const p01 = lerpPoint(segment.start, segment.control1, t);
  const p12 = lerpPoint(segment.control1, segment.control2, t);
  const p23 = lerpPoint(segment.control2, segment.end, t);
  const p012 = lerpPoint(p01, p12, t);
  const p123 = lerpPoint(p12, p23, t);
  const p0123 = lerpPoint(p012, p123, t);

  return {
    left: {
      commandIndex: segment.commandIndex,
      start: segment.start,
      control1: p01,
      control2: p012,
      end: p0123,
    },
    right: {
      commandIndex: segment.commandIndex,
      start: p0123,
      control1: p123,
      control2: p23,
      end: segment.end,
    },
  };
}

function sliceCubicSegment(
  segment: CubicCurveSegment,
  startT: number,
  endT: number,
): CubicCurveSegment {
  const clampedStart = Math.max(0, Math.min(1, startT));
  const clampedEnd = Math.max(0, Math.min(1, endT));

  if (clampedStart <= 0 && clampedEnd >= 1) {
    return segment;
  }

  if (Math.abs(clampedEnd - clampedStart) <= Number.EPSILON) {
    const point = evaluateCubicSegmentAt(segment, clampedStart);
    return {
      commandIndex: segment.commandIndex,
      start: point,
      control1: point,
      control2: point,
      end: point,
    };
  }

  const [segmentStart, segmentEnd] =
    clampedStart <= clampedEnd
      ? [clampedStart, clampedEnd]
      : [clampedEnd, clampedStart];

  const startSplit = splitCubicSegmentAt(segment, segmentStart);
  const normalizedEnd = (segmentEnd - segmentStart) / (1 - segmentStart);
  const endSplit = splitCubicSegmentAt(startSplit.right, normalizedEnd);

  return endSplit.left;
}

function estimateCubicSegmentLength(
  segment: CubicCurveSegment,
  endT: number,
): number {
  const clampedEnd = Math.max(0, Math.min(1, endT));
  if (clampedEnd <= 0) {
    return 0;
  }

  let length = 0;
  let previousPoint = evaluateCubicSegmentAt(segment, 0);

  for (
    let sampleIndex = 1;
    sampleIndex <= curveLengthSubdivisions;
    sampleIndex += 1
  ) {
    const t = (clampedEnd * sampleIndex) / curveLengthSubdivisions;
    const point = evaluateCubicSegmentAt(segment, t);
    length += Math.sqrt(
      distanceSquared(previousPoint.x, previousPoint.y, point.x, point.y),
    );
    previousPoint = point;
  }

  return length;
}

function findCubicParameterForArcLength(
  segment: CubicCurveSegment,
  targetLength: number,
  segmentLength: number,
): number {
  if (targetLength <= 0) {
    return 0;
  }

  if (targetLength >= segmentLength) {
    return 1;
  }

  let low = 0;
  let high = 1;

  for (let iteration = 0; iteration < 20; iteration += 1) {
    const mid = (low + high) / 2;
    const lengthAtMid = estimateCubicSegmentLength(segment, mid);

    if (lengthAtMid < targetLength) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function getCurveSegments(path: string): {
  curvePath: string;
  segments: CubicCurveSegment[];
} {
  const curveArray = SVGPathCommander.pathToCurve(path);
  const curvePath = SVGPathCommander.pathToString(curveArray);
  const segments: CubicCurveSegment[] = [];

  let previousPoint: PathPoint | null = null;

  for (let index = 0; index < curveArray.length; index += 1) {
    const segment = curveArray[index];
    if (segment == null) {
      continue;
    }

    if (segment[0] === `M`) {
      previousPoint = { x: segment[1], y: segment[2] };
      continue;
    }

    if (previousPoint == null) {
      continue;
    }

    segments.push({
      commandIndex: index,
      start: previousPoint,
      control1: { x: segment[1], y: segment[2] },
      control2: { x: segment[3], y: segment[4] },
      end: { x: segment[5], y: segment[6] },
    });

    previousPoint = { x: segment[5], y: segment[6] };
  }

  return { curvePath, segments };
}

function buildPathFromCubicSegments(
  segments: readonly CubicCurveSegment[],
): string | null {
  const [firstSegment] = segments;
  if (firstSegment == null) {
    return null;
  }

  const commands = [
    `M ${formatNumber(firstSegment.start.x)} ${formatNumber(firstSegment.start.y)}`,
  ];

  for (const segment of segments) {
    commands.push(
      `C ${formatNumber(segment.control1.x)} ${formatNumber(segment.control1.y)} ${formatNumber(segment.control2.x)} ${formatNumber(segment.control2.y)} ${formatNumber(segment.end.x)} ${formatNumber(segment.end.y)}`,
    );
  }

  return commands.join(` `);
}

function buildClosedPathFromCubicSegments(
  segments: readonly CubicCurveSegment[],
): string | null {
  const openPath = buildPathFromCubicSegments(segments);
  if (openPath == null) {
    return null;
  }

  return `${openPath} Z`;
}

function reverseCubicSegments(
  segments: readonly CubicCurveSegment[],
): CubicCurveSegment[] {
  const reversed: CubicCurveSegment[] = [];

  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const segment = segments[index];
    if (segment == null) {
      continue;
    }

    reversed.push({
      commandIndex: segment.commandIndex,
      start: segment.end,
      control1: segment.control2,
      control2: segment.control1,
      end: segment.start,
    });
  }

  return reversed;
}

function createLineAsCubic(
  start: PathPoint,
  end: PathPoint,
): CubicCurveSegment {
  return {
    commandIndex: -1,
    start,
    control1: start,
    control2: end,
    end,
  };
}

function joinCubicSegmentLists(
  first: readonly CubicCurveSegment[],
  second: readonly CubicCurveSegment[],
): CubicCurveSegment[] {
  if (first.length === 0) {
    return [...second];
  }
  if (second.length === 0) {
    return [...first];
  }

  const result = [...first];
  const lastFirst = result.at(-1);
  const firstSecond = second[0];

  if (lastFirst == null || firstSecond == null) {
    return result;
  }

  if (
    distanceSquared(
      lastFirst.end.x,
      lastFirst.end.y,
      firstSecond.start.x,
      firstSecond.start.y,
    ) > 0.01
  ) {
    result.push(createLineAsCubic(lastFirst.end, firstSecond.start));
  }

  result.push(...second);
  return result;
}

function samplePathToPolygonPoints(path: string): PathPoint[] {
  const totalLength = SVGPathCommander.getTotalLength(path);
  if (totalLength <= 0) {
    const point = SVGPathCommander.getPointAtLength(path, 0);
    return [{ x: point.x, y: point.y }];
  }

  const sampleCount = Math.max(12, Math.ceil(totalLength / sampleStep));
  const points: PathPoint[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const length = (totalLength * index) / sampleCount;
    const point = SVGPathCommander.getPointAtLength(path, length);
    points.push({ x: point.x, y: point.y });
  }

  return points;
}

function getClosedPathArea(path: string): number {
  return Math.abs(
    SVGPathCommander.getPathArea(SVGPathCommander.pathToCurve(path)),
  );
}

function buildCurveSegmentsBetweenLengths(
  targetPath: string,
  startLength: number,
  endLength: number,
): CubicCurveSegment[] | null {
  const { curvePath, segments } = getCurveSegments(targetPath);
  const totalLength = SVGPathCommander.getTotalLength(curvePath);
  const clampedStart = Math.max(0, Math.min(totalLength, startLength));
  const clampedEnd = Math.max(0, Math.min(totalLength, endLength));
  const start = Math.min(clampedStart, clampedEnd);
  const end = Math.max(clampedStart, clampedEnd);

  if (segments.length === 0) {
    return null;
  }

  if (end - start <= 0) {
    const point = SVGPathCommander.getPointAtLength(curvePath, start);
    return [
      {
        commandIndex: -1,
        start: { x: point.x, y: point.y },
        control1: { x: point.x, y: point.y },
        control2: { x: point.x, y: point.y },
        end: { x: point.x, y: point.y },
      },
    ];
  }

  const startProperties = SVGPathCommander.getPropertiesAtLength(
    curvePath,
    start,
  );
  const endProperties = SVGPathCommander.getPropertiesAtLength(curvePath, end);

  const startSegment = segments.find(
    (segment) => segment.commandIndex === startProperties.index,
  );
  const endSegment = segments.find(
    (segment) => segment.commandIndex === endProperties.index,
  );

  if (startSegment == null || endSegment == null) {
    return null;
  }

  const startLocalLength = Math.max(
    0,
    Math.min(startProperties.length, start - startProperties.lengthAtSegment),
  );
  const endLocalLength = Math.max(
    0,
    Math.min(endProperties.length, end - endProperties.lengthAtSegment),
  );

  const startT = findCubicParameterForArcLength(
    startSegment,
    startLocalLength,
    startProperties.length,
  );
  const endT = findCubicParameterForArcLength(
    endSegment,
    endLocalLength,
    endProperties.length,
  );

  const startSegmentArrayIndex = segments.indexOf(startSegment);
  const endSegmentArrayIndex = segments.indexOf(endSegment);
  if (startSegmentArrayIndex < 0 || endSegmentArrayIndex < 0) {
    return null;
  }

  const resultSegments: CubicCurveSegment[] = [];

  if (startSegmentArrayIndex === endSegmentArrayIndex) {
    resultSegments.push(sliceCubicSegment(startSegment, startT, endT));
    return resultSegments;
  }

  resultSegments.push(sliceCubicSegment(startSegment, startT, 1));

  for (
    let segmentIndex = startSegmentArrayIndex + 1;
    segmentIndex < endSegmentArrayIndex;
    segmentIndex += 1
  ) {
    const segment = segments[segmentIndex];
    if (segment == null) {
      continue;
    }
    resultSegments.push(segment);
  }

  resultSegments.push(sliceCubicSegment(endSegment, 0, endT));
  return resultSegments;
}

function buildCurvePathBetweenLengths(
  targetPath: string,
  startLength: number,
  endLength: number,
): string | null {
  const segments = buildCurveSegmentsBetweenLengths(
    targetPath,
    startLength,
    endLength,
  );
  if (segments == null) {
    return null;
  }

  return buildPathFromCubicSegments(segments);
}

function getIntersectionPoints(
  pathA: string,
  pathB: string,
): SvgPathIntersection[] {
  const intersections = SVGPathCommander.pathsIntersection(
    pathA,
    pathB,
    false,
  ) as Array<Omit<SvgPathIntersection, `length`>>;

  const intersectionsWithLengths = intersections.map((intersection) => ({
    ...intersection,
    length: projectPointToPathLength(pathA, intersection.x, intersection.y),
    boundaryLength: projectPointToPathLength(
      pathB,
      intersection.x,
      intersection.y,
    ),
  }));

  intersectionsWithLengths.sort((left, right) => left.length - right.length);

  const dedupedIntersections: SvgPathIntersection[] = [];
  for (const intersection of intersectionsWithLengths) {
    const duplicate = dedupedIntersections.some(
      (existingIntersection) =>
        distanceSquared(
          existingIntersection.x,
          existingIntersection.y,
          intersection.x,
          intersection.y,
        ) <=
        intersectionDedupDistance * intersectionDedupDistance,
    );

    if (!duplicate) {
      dedupedIntersections.push(intersection);
    }
  }

  return dedupedIntersections;
}

function projectPointToPathLength(
  targetPath: string,
  targetX: number,
  targetY: number,
): number {
  const totalLength = SVGPathCommander.getTotalLength(targetPath);
  if (totalLength <= 0) {
    return 0;
  }

  let span = Math.max(
    sampleStep,
    totalLength / Math.max(2, Math.ceil(totalLength / sampleStep)),
  );
  let bestLength = 0;
  let bestDistanceSquared = Number.POSITIVE_INFINITY;

  for (let length = 0; length <= totalLength; length += span) {
    const point = SVGPathCommander.getPointAtLength(targetPath, length);
    const pointDistanceSquared = distanceSquared(
      point.x,
      point.y,
      targetX,
      targetY,
    );

    if (pointDistanceSquared < bestDistanceSquared) {
      bestDistanceSquared = pointDistanceSquared;
      bestLength = length;
    }
  }

  for (let iteration = 0; iteration < 6; iteration += 1) {
    const start = Math.max(0, bestLength - span);
    const end = Math.min(totalLength, bestLength + span);

    for (let sampleIndex = 0; sampleIndex <= 8; sampleIndex += 1) {
      const length = start + ((end - start) * sampleIndex) / 8;
      const point = SVGPathCommander.getPointAtLength(targetPath, length);
      const pointDistanceSquared = distanceSquared(
        point.x,
        point.y,
        targetX,
        targetY,
      );

      if (pointDistanceSquared < bestDistanceSquared) {
        bestDistanceSquared = pointDistanceSquared;
        bestLength = length;
      }
    }

    span /= 4;
  }

  return bestLength;
}

export function getSvgPathIntersections(
  targetPath: string,
  boundaryPath: string,
): SvgPathIntersection[] {
  return getIntersectionPoints(targetPath, boundaryPath);
}

export function buildSvgSegmentPathFromLengths(
  targetPath: string,
  startLength: number,
  endLength: number,
): string {
  const curvePath = buildCurvePathBetweenLengths(
    targetPath,
    startLength,
    endLength,
  );
  invariant(curvePath != null, `Failed to build curve path between lengths`);
  return curvePath;
}

function sortByBoundaryLength(
  intersections: readonly SvgPathIntersection[],
): SvgPathIntersection[] {
  return [...intersections].sort(
    (left, right) => left.boundaryLength - right.boundaryLength,
  );
}

function getMedianSeamOccurrences(
  targetPath: string,
  targetMedianPath: string,
  cutterPath: string,
): Array<{
  median: SvgPathIntersection;
  edgeBefore: SvgPathIntersection;
  edgeAfter: SvgPathIntersection;
}> {
  const outlineIntersections = sortByBoundaryLength(
    getIntersectionPoints(targetPath, cutterPath),
  );
  const medianIntersections = sortByBoundaryLength(
    getIntersectionPoints(targetMedianPath, cutterPath),
  );

  const seams: Array<{
    median: SvgPathIntersection;
    edgeBefore: SvgPathIntersection;
    edgeAfter: SvgPathIntersection;
  }> = [];

  for (const medianIntersection of medianIntersections) {
    let beforeIndex = -1;

    for (let index = 0; index < outlineIntersections.length; index += 1) {
      const outlineIntersection = outlineIntersections[index];
      if (outlineIntersection == null) {
        continue;
      }

      if (
        outlineIntersection.boundaryLength <= medianIntersection.boundaryLength
      ) {
        beforeIndex = index;
      }

      if (
        outlineIntersection.boundaryLength > medianIntersection.boundaryLength
      ) {
        break;
      }
    }

    const edgeBefore =
      beforeIndex >= 0 ? outlineIntersections[beforeIndex] : undefined;
    const edgeAfter =
      beforeIndex >= 0
        ? outlineIntersections[beforeIndex + 1]
        : outlineIntersections[0];

    if (edgeBefore == null || edgeAfter == null) {
      continue;
    }

    seams.push({
      median: medianIntersection,
      edgeBefore,
      edgeAfter,
    });
  }

  return seams;
}

interface MedianSeamPair {
  edgeBefore: SvgPathIntersection;
  edgeAfter: SvgPathIntersection;
}

interface ResolvedSliceBoundSeam {
  cutterPath: string;
  seam: MedianSeamPair;
}

function estimatePathTangentAtLength(
  path: string,
  length: number,
): PathPoint | null {
  const totalLength = SVGPathCommander.getTotalLength(path);
  if (totalLength <= 0) {
    return null;
  }

  const baseDelta = Math.max(sampleStep, totalLength / 200);
  for (const scale of [1, 2, 4, 8] as const) {
    const delta = baseDelta * scale;
    const start = Math.max(0, length - delta);
    const end = Math.min(totalLength, length + delta);

    if (end - start <= Number.EPSILON) {
      continue;
    }

    const startPoint = SVGPathCommander.getPointAtLength(path, start);
    const endPoint = SVGPathCommander.getPointAtLength(path, end);
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const magnitude = Math.hypot(dx, dy);

    if (magnitude > Number.EPSILON) {
      return {
        x: dx / magnitude,
        y: dy / magnitude,
      };
    }
  }

  return null;
}

function buildNormalCutterPathAtMedianPercent({
  targetPath,
  targetMedianPath,
  percent,
}: {
  targetPath: string;
  targetMedianPath: string;
  percent: number;
}): { cutterPath: string; anchorPoint: PathPoint } | null {
  const targetMedianLength = SVGPathCommander.getTotalLength(targetMedianPath);
  if (targetMedianLength <= 0) {
    return null;
  }

  const clampedPercent = Math.max(0, Math.min(100, percent));
  const medianLength = (targetMedianLength * clampedPercent) / 100;
  const anchor = SVGPathCommander.getPointAtLength(
    targetMedianPath,
    medianLength,
  );
  const tangent = estimatePathTangentAtLength(targetMedianPath, medianLength);
  if (tangent == null) {
    return null;
  }

  const normal = {
    x: -tangent.y,
    y: tangent.x,
  };

  const bbox = SVGPathCommander.getPathBBox(targetPath);
  const width = Math.max(0, bbox.x2 - bbox.x);
  const height = Math.max(0, bbox.y2 - bbox.y);
  const halfLength = Math.max(Math.hypot(width, height) * 2, 200);

  const start = {
    x: anchor.x - normal.x * halfLength,
    y: anchor.y - normal.y * halfLength,
  };
  const end = {
    x: anchor.x + normal.x * halfLength,
    y: anchor.y + normal.y * halfLength,
  };

  const cutterPath =
    `M ${formatNumber(start.x)} ${formatNumber(start.y)} ` +
    `L ${formatNumber(end.x)} ${formatNumber(end.y)}`;

  return {
    cutterPath,
    anchorPoint: {
      x: anchor.x,
      y: anchor.y,
    },
  };
}

function pickSeamPairAroundAnchorOnCutter({
  intersections,
  anchorBoundaryLength,
}: {
  intersections: readonly SvgPathIntersection[];
  anchorBoundaryLength: number;
}): MedianSeamPair | null {
  if (intersections.length < 2) {
    return null;
  }

  let afterIndex = intersections.findIndex(
    (intersection) => intersection.boundaryLength > anchorBoundaryLength,
  );
  if (afterIndex < 0) {
    afterIndex = intersections.length;
  }

  const edgeBefore = intersections[afterIndex - 1];
  const edgeAfter = intersections[afterIndex];
  if (edgeBefore != null && edgeAfter != null) {
    return {
      edgeBefore,
      edgeAfter,
    };
  }

  const closestTwo = [...intersections]
    .sort(
      (left, right) =>
        Math.abs(left.boundaryLength - anchorBoundaryLength) -
        Math.abs(right.boundaryLength - anchorBoundaryLength),
    )
    .slice(0, 2)
    .sort((left, right) => left.boundaryLength - right.boundaryLength);

  const fallbackBefore = closestTwo[0];
  const fallbackAfter = closestTwo[1];
  if (fallbackBefore == null || fallbackAfter == null) {
    return null;
  }

  return {
    edgeBefore: fallbackBefore,
    edgeAfter: fallbackAfter,
  };
}

function resolvePercentBoundSeam({
  targetPath,
  targetMedianPath,
  percent,
}: {
  targetPath: string;
  targetMedianPath: string;
  percent: number;
}): ResolvedSliceBoundSeam | null {
  const normalCut = buildNormalCutterPathAtMedianPercent({
    targetPath,
    targetMedianPath,
    percent,
  });
  if (normalCut == null) {
    return null;
  }

  const intersections = sortByBoundaryLength(
    getIntersectionPoints(targetPath, normalCut.cutterPath),
  );
  const anchorBoundaryLength = projectPointToPathLength(
    normalCut.cutterPath,
    normalCut.anchorPoint.x,
    normalCut.anchorPoint.y,
  );
  const seam = pickSeamPairAroundAnchorOnCutter({
    intersections,
    anchorBoundaryLength,
  });

  if (seam == null) {
    return null;
  }

  return {
    cutterPath: normalCut.cutterPath,
    seam,
  };
}

function sampleClosedPathSegmentsForward(
  targetPath: string,
  startLength: number,
  endLength: number,
): CubicCurveSegment[] | null {
  const totalLength = SVGPathCommander.getTotalLength(targetPath);
  if (totalLength <= 0) {
    return buildCurveSegmentsBetweenLengths(targetPath, 0, 0);
  }

  const normalize = (value: number): number => {
    const modulo = value % totalLength;
    return modulo < 0 ? modulo + totalLength : modulo;
  };

  const start = normalize(startLength);
  const end = normalize(endLength);
  const epsilon = 0.001;

  if (Math.abs(start - end) <= epsilon) {
    return buildCurveSegmentsBetweenLengths(targetPath, start, start);
  }

  if (start < end) {
    return buildCurveSegmentsBetweenLengths(targetPath, start, end);
  }

  const first = buildCurveSegmentsBetweenLengths(
    targetPath,
    start,
    totalLength,
  );
  const second = buildCurveSegmentsBetweenLengths(targetPath, 0, end);
  if (first == null && second == null) {
    return null;
  }

  return joinCubicSegmentLists(first ?? [], second ?? []);
}

function isPointInsidePolygon(
  points: readonly { x: number; y: number }[],
  point: { x: number; y: number },
): boolean {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const pi = points[i];
    const pj = points[j];
    if (pi == null || pj == null) {
      continue;
    }

    const intersects =
      pi.y > point.y !== pj.y > point.y &&
      point.x <
        ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y || Number.EPSILON) +
          pi.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function buildClosedPathFromSingleMedianSeam({
  targetPath,
  targetMedianPath,
  cutterPath,
  seam,
  keep,
}: {
  targetPath: string;
  targetMedianPath: string;
  cutterPath: string;
  seam: {
    edgeBefore: SvgPathIntersection;
    edgeAfter: SvgPathIntersection;
  };
  keep: `start` | `end`;
}): string | null {
  const seamSegments = buildCurveSegmentsBetweenLengths(
    cutterPath,
    seam.edgeBefore.boundaryLength,
    seam.edgeAfter.boundaryLength,
  );

  const outlineForward = sampleClosedPathSegmentsForward(
    targetPath,
    seam.edgeBefore.length,
    seam.edgeAfter.length,
  );
  const outlineBackward = sampleClosedPathSegmentsForward(
    targetPath,
    seam.edgeAfter.length,
    seam.edgeBefore.length,
  );

  if (
    seamSegments == null ||
    outlineForward == null ||
    outlineBackward == null
  ) {
    return null;
  }

  const candidateASegments = joinCubicSegmentLists(
    outlineForward,
    reverseCubicSegments(seamSegments),
  );
  const candidateBSegments = joinCubicSegmentLists(
    outlineBackward,
    seamSegments,
  );

  const candidates = [candidateASegments, candidateBSegments]
    .map((segments) => {
      const path = buildClosedPathFromCubicSegments(segments);
      if (path == null) {
        return null;
      }

      return {
        path,
        area: getClosedPathArea(path),
        points: samplePathToPolygonPoints(path),
      };
    })
    .filter(
      (
        candidate,
      ): candidate is {
        points: { x: number; y: number }[];
        path: string;
        area: number;
      } => candidate != null,
    );

  if (candidates.length === 0) {
    return null;
  }

  const targetMedianLength = SVGPathCommander.getTotalLength(targetMedianPath);
  const anchorLength = keep === `start` ? 0 : targetMedianLength;
  const anchorPoint = SVGPathCommander.getPointAtLength(
    targetMedianPath,
    anchorLength,
  );

  const containing = candidates.filter((candidate) =>
    isPointInsidePolygon(candidate.points, anchorPoint),
  );

  const ranked = (containing.length > 0 ? containing : candidates).sort(
    (left, right) => left.area - right.area,
  );

  return ranked[0]?.path ?? null;
}

function buildClosedPathFromMedianSeams(
  targetPath: string,
  fromCutterPath: string,
  toCutterPath: string,
  fromSeam: {
    edgeBefore: SvgPathIntersection;
    edgeAfter: SvgPathIntersection;
  },
  toSeam: {
    edgeBefore: SvgPathIntersection;
    edgeAfter: SvgPathIntersection;
  },
  side: `before` | `after`,
): { path: string; area: number } | null {
  const oppositeSide = side === `before` ? `after` : `before`;
  const fromPrimary =
    side === `before` ? fromSeam.edgeBefore : fromSeam.edgeAfter;
  const toPrimary = side === `before` ? toSeam.edgeBefore : toSeam.edgeAfter;
  const fromOpposite =
    oppositeSide === `before` ? fromSeam.edgeBefore : fromSeam.edgeAfter;
  const toOpposite =
    oppositeSide === `before` ? toSeam.edgeBefore : toSeam.edgeAfter;

  const primaryOutline = buildCurveSegmentsBetweenLengths(
    targetPath,
    fromPrimary.length,
    toPrimary.length,
  );
  const toLocalSeam = buildCurveSegmentsBetweenLengths(
    toCutterPath,
    toSeam.edgeBefore.boundaryLength,
    toSeam.edgeAfter.boundaryLength,
  );
  const oppositeOutline = buildCurveSegmentsBetweenLengths(
    targetPath,
    toOpposite.length,
    fromOpposite.length,
  );
  const fromLocalSeam = buildCurveSegmentsBetweenLengths(
    fromCutterPath,
    fromSeam.edgeBefore.boundaryLength,
    fromSeam.edgeAfter.boundaryLength,
  );

  if (
    primaryOutline == null ||
    toLocalSeam == null ||
    oppositeOutline == null ||
    fromLocalSeam == null
  ) {
    return null;
  }

  const orientedToLocalSeam =
    side === `before` ? toLocalSeam : reverseCubicSegments(toLocalSeam);
  const orientedFromLocalSeam =
    side === `before` ? reverseCubicSegments(fromLocalSeam) : fromLocalSeam;

  let closedSegments = joinCubicSegmentLists(
    primaryOutline,
    orientedToLocalSeam,
  );
  closedSegments = joinCubicSegmentLists(closedSegments, oppositeOutline);
  closedSegments = joinCubicSegmentLists(closedSegments, orientedFromLocalSeam);

  const path = buildClosedPathFromCubicSegments(closedSegments);
  if (path == null) {
    return null;
  }

  return {
    path,
    area: getClosedPathArea(path),
  };
}

export function buildClosedSvgSegmentPathFromStrokeSpec({
  strokePathsById,
  medianPathsById,
  strokeSpecText,
}: BuildClosedSvgSegmentPathFromStrokeSpecArgs): string | null {
  const spec = parseStrokeSpec(strokeSpecText);

  function resolveCutterPath(strokeId: number): string | null {
    return medianPathsById?.[strokeId] ?? strokePathsById[strokeId] ?? null;
  }

  function resolveBoundSeam(args: {
    targetPath: string;
    targetMedianPath: string;
    bound: StrokeSpecSliceBound;
  }): ResolvedSliceBoundSeam | null {
    if (args.bound.kind === `percent`) {
      return resolvePercentBoundSeam({
        targetPath: args.targetPath,
        targetMedianPath: args.targetMedianPath,
        percent: args.bound.percent,
      });
    }

    const cutterPath = resolveCutterPath(args.bound.stroke);
    if (cutterPath == null) {
      return null;
    }

    const occurrences = getMedianSeamOccurrences(
      args.targetPath,
      args.targetMedianPath,
      cutterPath,
    );
    const seam = occurrences[args.bound.occurrence];
    if (seam == null) {
      return null;
    }

    return {
      cutterPath,
      seam: {
        edgeBefore: seam.edgeBefore,
        edgeAfter: seam.edgeAfter,
      },
    };
  }

  for (const item of spec) {
    for (const atom of item) {
      if (atom.kind === `range`) {
        if (atom.start !== atom.end) {
          continue;
        }

        const wholeTargetPath = strokePathsById[atom.start];
        if (wholeTargetPath != null) {
          return wholeTargetPath;
        }

        continue;
      }

      const targetPath = strokePathsById[atom.stroke];
      if (targetPath == null) {
        continue;
      }

      const targetMedianPath = medianPathsById?.[atom.stroke] ?? targetPath;

      const hasSingleBound =
        (atom.from == null && atom.to != null) ||
        (atom.from != null && atom.to == null);
      if (hasSingleBound) {
        const bound = atom.from ?? atom.to;
        if (bound == null) {
          continue;
        }

        const resolved = resolveBoundSeam({
          targetPath,
          targetMedianPath,
          bound,
        });
        if (resolved == null) {
          continue;
        }

        const keep = atom.from == null ? `start` : `end`;
        const path = buildClosedPathFromSingleMedianSeam({
          targetPath,
          targetMedianPath,
          cutterPath: resolved.cutterPath,
          seam: resolved.seam,
          keep,
        });

        if (path != null) {
          return path;
        }

        continue;
      }

      const fromBound = atom.from;
      const toBound = atom.to;
      if (fromBound == null || toBound == null) {
        continue;
      }

      const fromResolved = resolveBoundSeam({
        targetPath,
        targetMedianPath,
        bound: fromBound,
      });
      const toResolved = resolveBoundSeam({
        targetPath,
        targetMedianPath,
        bound: toBound,
      });
      if (fromResolved == null || toResolved == null) {
        continue;
      }

      const beforeCandidate = buildClosedPathFromMedianSeams(
        targetPath,
        fromResolved.cutterPath,
        toResolved.cutterPath,
        fromResolved.seam,
        toResolved.seam,
        `before`,
      );
      const afterCandidate = buildClosedPathFromMedianSeams(
        targetPath,
        fromResolved.cutterPath,
        toResolved.cutterPath,
        fromResolved.seam,
        toResolved.seam,
        `after`,
      );

      const path =
        beforeCandidate == null
          ? (afterCandidate?.path ?? null)
          : afterCandidate == null
            ? beforeCandidate.path
            : beforeCandidate.area <= afterCandidate.area
              ? beforeCandidate.path
              : afterCandidate.path;

      if (path != null) {
        return path;
      }
    }
  }

  return null;
}

export function buildStrokeSpecSegmentPaths(
  strokePaths: readonly string[],
  medianPaths: readonly string[] | undefined,
  strokeSpecTexts: readonly StrokeSpecString[],
): Record<string, string> {
  const segments: Record<string, string> = {};

  const strokePathsById = Object.fromEntries(
    strokePaths.map((path, index) => [index, path]),
  );
  const medianPathsById = Object.fromEntries(
    (medianPaths ?? []).map((path, index) => [index, path]),
  );

  for (const strokeSpecText of strokeSpecTexts) {
    if (strokeSpecText.trim().length === 0) {
      continue;
    }

    const spec = parseStrokeSpec(strokeSpecText);
    for (const item of spec) {
      for (const atom of item) {
        if (atom.kind !== `slice`) {
          continue;
        }
        const atomText = formatAtom(atom);
        const path = buildClosedSvgSegmentPathFromStrokeSpec({
          strokePathsById,
          medianPathsById,
          strokeSpecText: atomText,
        });
        invariant(path != null, `Failed to build path for atom: ${atomText}`);
        segments[atomText] = path;
      }
    }
  }

  return segments;
}
