import SVGPathCommander from "svg-path-commander";
import { formatAtom, parseStrokeSpec } from "@/util/strokeSpec";

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
  const points = samplePathPointsBetweenLengths(
    targetPath,
    startLength,
    endLength,
  );

  return buildPathFromPoints(points, false);
}

function samplePathPointsBetweenLengths(
  targetPath: string,
  startLength: number,
  endLength: number,
): Array<{ x: number; y: number }> {
  const totalLength = SVGPathCommander.getTotalLength(targetPath);
  const clampedStart = Math.max(0, Math.min(totalLength, startLength));
  const clampedEnd = Math.max(0, Math.min(totalLength, endLength));
  const start = Math.min(clampedStart, clampedEnd);
  const end = Math.max(clampedStart, clampedEnd);

  if (end - start <= 0) {
    const point = SVGPathCommander.getPointAtLength(targetPath, start);
    return [{ x: point.x, y: point.y }];
  }

  const sampleCount = Math.max(2, Math.ceil((end - start) / sampleStep));
  const points: Array<{ x: number; y: number }> = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const length = start + ((end - start) * index) / sampleCount;
    const point = SVGPathCommander.getPointAtLength(targetPath, length);
    points.push(point);
  }

  return points;
}

function buildPathFromPoints(
  points: readonly { x: number; y: number }[],
  closePath: boolean,
): string {
  const path = points
    .map((point, index) =>
      index === 0
        ? `M ${formatNumber(point.x)} ${formatNumber(point.y)}`
        : `L ${formatNumber(point.x)} ${formatNumber(point.y)}`,
    )
    .join(` `);

  return closePath ? `${path} Z` : path;
}

function reversePoints(
  points: readonly { x: number; y: number }[],
): Array<{ x: number; y: number }> {
  return [...points].reverse();
}

function joinPointLists(
  first: readonly { x: number; y: number }[],
  second: readonly { x: number; y: number }[],
): Array<{ x: number; y: number }> {
  if (first.length === 0) {
    return [...second];
  }
  if (second.length === 0) {
    return [...first];
  }

  const result = [...first];
  const [lastFirst] = result.slice(-1);
  const [firstSecond] = second;

  const startIndex =
    lastFirst != null &&
    firstSecond != null &&
    distanceSquared(lastFirst.x, lastFirst.y, firstSecond.x, firstSecond.y) <=
      0.01
      ? 1
      : 0;

  result.push(...second.slice(startIndex));
  return result;
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

function getClosedArea(points: readonly { x: number; y: number }[]): number {
  if (points.length < 3) {
    return Number.POSITIVE_INFINITY;
  }

  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const nextPoint = points[(index + 1) % points.length];
    if (point == null || nextPoint == null) {
      continue;
    }

    area += point.x * nextPoint.y - nextPoint.x * point.y;
  }

  return Math.abs(area / 2);
}

function buildClosedPathFromPoints(
  points: readonly { x: number; y: number }[],
): string | null {
  if (points.length < 3) {
    return null;
  }

  return buildPathFromPoints(points, true);
}

function sampleClosedPathPointsForward(
  targetPath: string,
  startLength: number,
  endLength: number,
): Array<{ x: number; y: number }> {
  const totalLength = SVGPathCommander.getTotalLength(targetPath);
  if (totalLength <= 0) {
    const point = SVGPathCommander.getPointAtLength(targetPath, 0);
    return [{ x: point.x, y: point.y }];
  }

  const normalize = (value: number): number => {
    const modulo = value % totalLength;
    return modulo < 0 ? modulo + totalLength : modulo;
  };

  const start = normalize(startLength);
  const end = normalize(endLength);
  const epsilon = 0.001;

  if (Math.abs(start - end) <= epsilon) {
    return samplePathPointsBetweenLengths(targetPath, start, start);
  }

  if (start < end) {
    return samplePathPointsBetweenLengths(targetPath, start, end);
  }

  const first = samplePathPointsBetweenLengths(targetPath, start, totalLength);
  const second = samplePathPointsBetweenLengths(targetPath, 0, end);
  return joinPointLists(first, second);
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
  const seamPoints = samplePathPointsBetweenLengths(
    cutterPath,
    seam.edgeBefore.boundaryLength,
    seam.edgeAfter.boundaryLength,
  );

  const outlineForward = sampleClosedPathPointsForward(
    targetPath,
    seam.edgeBefore.length,
    seam.edgeAfter.length,
  );
  const outlineBackward = sampleClosedPathPointsForward(
    targetPath,
    seam.edgeAfter.length,
    seam.edgeBefore.length,
  );

  const candidateA = joinPointLists(outlineForward, reversePoints(seamPoints));
  const candidateB = joinPointLists(outlineBackward, seamPoints);

  const candidates = [candidateA, candidateB]
    .map((points) => ({
      points,
      path: buildClosedPathFromPoints(points),
      area: getClosedArea(points),
    }))
    .filter(
      (
        candidate,
      ): candidate is {
        points: { x: number; y: number }[];
        path: string;
        area: number;
      } => candidate.path != null,
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

  const primaryOutline = samplePathPointsBetweenLengths(
    targetPath,
    fromPrimary.length,
    toPrimary.length,
  );
  const toLocalSeam = samplePathPointsBetweenLengths(
    toCutterPath,
    toSeam.edgeBefore.boundaryLength,
    toSeam.edgeAfter.boundaryLength,
  );
  const oppositeOutline = samplePathPointsBetweenLengths(
    targetPath,
    toOpposite.length,
    fromOpposite.length,
  );
  const fromLocalSeam = samplePathPointsBetweenLengths(
    fromCutterPath,
    fromSeam.edgeBefore.boundaryLength,
    fromSeam.edgeAfter.boundaryLength,
  );

  const orientedToLocalSeam =
    side === `before` ? toLocalSeam : reversePoints(toLocalSeam);
  const orientedFromLocalSeam =
    side === `before` ? reversePoints(fromLocalSeam) : fromLocalSeam;

  let closedPoints = joinPointLists(primaryOutline, orientedToLocalSeam);
  closedPoints = joinPointLists(closedPoints, oppositeOutline);
  closedPoints = joinPointLists(closedPoints, orientedFromLocalSeam);

  const path = buildClosedPathFromPoints(closedPoints);
  if (path == null) {
    return null;
  }

  return {
    path,
    area: getClosedArea(closedPoints),
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

  for (const item of spec.items) {
    for (const atom of item.atoms) {
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

      const cutterStrokeId = atom.from?.stroke ?? atom.to?.stroke;
      if (cutterStrokeId == null) {
        continue;
      }

      const singleCutterPath = resolveCutterPath(cutterStrokeId);
      if (singleCutterPath == null) {
        continue;
      }

      const targetMedianPath = medianPathsById?.[atom.stroke] ?? targetPath;

      const hasSingleBound =
        (atom.from == null && atom.to != null) ||
        (atom.from != null && atom.to == null);
      if (hasSingleBound) {
        const occurrences = getMedianSeamOccurrences(
          targetPath,
          targetMedianPath,
          singleCutterPath,
        );
        if (occurrences.length === 0) {
          continue;
        }

        const seamOccurrence =
          atom.from?.occurrence ?? atom.to?.occurrence ?? 0;
        const seam = occurrences[seamOccurrence];
        if (seam == null) {
          continue;
        }

        const keep = atom.from == null ? `start` : `end`;
        const path = buildClosedPathFromSingleMedianSeam({
          targetPath,
          targetMedianPath,
          cutterPath: singleCutterPath,
          seam,
          keep,
        });

        if (path != null) {
          return path;
        }

        continue;
      }

      const fromOccurrence = atom.from?.occurrence ?? 0;
      const toOccurrence = atom.to?.occurrence ?? 0;

      const fromCutterStrokeId = atom.from?.stroke ?? cutterStrokeId;
      const toCutterStrokeId = atom.to?.stroke ?? cutterStrokeId;

      const fromCutterPath = resolveCutterPath(fromCutterStrokeId);
      const toCutterPath = resolveCutterPath(toCutterStrokeId);
      if (fromCutterPath == null || toCutterPath == null) {
        continue;
      }

      const fromOccurrences = getMedianSeamOccurrences(
        targetPath,
        targetMedianPath,
        fromCutterPath,
      );
      const toOccurrences = getMedianSeamOccurrences(
        targetPath,
        targetMedianPath,
        toCutterPath,
      );

      if (
        fromOccurrence < 0 ||
        toOccurrence < 0 ||
        fromOccurrence >= fromOccurrences.length ||
        toOccurrence >= toOccurrences.length
      ) {
        continue;
      }

      const fromSeam = fromOccurrences[fromOccurrence];
      const toSeam = toOccurrences[toOccurrence];
      if (fromSeam == null || toSeam == null) {
        continue;
      }

      const beforeCandidate = buildClosedPathFromMedianSeams(
        targetPath,
        fromCutterPath,
        toCutterPath,
        fromSeam,
        toSeam,
        `before`,
      );
      const afterCandidate = buildClosedPathFromMedianSeams(
        targetPath,
        fromCutterPath,
        toCutterPath,
        fromSeam,
        toSeam,
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

export function buildSvgSegmentPaths(
  strokePaths: readonly string[],
  medianPaths: readonly string[] | undefined,
  strokeSpecTexts: readonly string[],
): Record<string, string> | undefined {
  const segments: Record<string, string> = {};

  for (const strokeSpecText of strokeSpecTexts) {
    if (strokeSpecText.trim().length === 0) {
      continue;
    }

    const spec = parseStrokeSpec(strokeSpecText);
    for (const item of spec.items) {
      for (const atom of item.atoms) {
        if (atom.kind !== `slice`) {
          continue;
        }
        const atomText = formatAtom(atom);
        const path = buildClosedSvgSegmentPathFromStrokeSpec({
          strokePathsById: Object.fromEntries(
            strokePaths.map((path, index) => [index, path]),
          ),
          medianPathsById: Object.fromEntries(
            (medianPaths ?? []).map((path, index) => [index, path]),
          ),
          strokeSpecText: atomText,
        });
        if (path != null) {
          segments[atomText] = path;
        }
      }
    }
  }

  return Object.keys(segments).length > 0 ? segments : undefined;
}
