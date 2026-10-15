import SVGPathCommander from "svg-path-commander";

export interface WritingStrokePoint {
  x: number;
  y: number;
}

export interface WritingStrokeGraderOptions {
  maxMeanDeviation: number;
  maxEndpointDeviation: number;
  sampleCount: number;
}

export interface WritingStrokeGrade {
  accepted: boolean;
  failure: `incomplete` | `direction` | `shape` | null;
  meanDeviation: number;
  startDeviation: number;
  endDeviation: number;
}

export const writingStrokeGraderDefaults: WritingStrokeGraderOptions = {
  maxMeanDeviation: 110,
  maxEndpointDeviation: 260,
  sampleCount: 24,
};

function pathFromPoints(points: readonly WritingStrokePoint[]): string {
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(` `);
}

function samplePath(path: string, sampleCount: number): WritingStrokePoint[] {
  const length = SVGPathCommander.getTotalLength(path);
  if (length <= 0) {
    return [];
  }

  return Array.from({ length: sampleCount }, (_, index) =>
    SVGPathCommander.getPointAtLength(
      path,
      (length * index) / (sampleCount - 1),
    ),
  );
}

function pointDistanceToPath(path: string, point: WritingStrokePoint): number {
  const closestPoint = SVGPathCommander.getClosestPoint(path, point);
  return Math.hypot(closestPoint.x - point.x, closestPoint.y - point.y);
}

export function gradeWritingStroke(
  points: readonly WritingStrokePoint[],
  expectedPath: string,
  options: Partial<WritingStrokeGraderOptions> = {},
): WritingStrokeGrade {
  const settings = { ...writingStrokeGraderDefaults, ...options };
  const incompleteGrade: WritingStrokeGrade = {
    accepted: false,
    failure: `incomplete`,
    meanDeviation: 0,
    startDeviation: 0,
    endDeviation: 0,
  };

  if (
    points.length < 2 ||
    points.some(
      (point) => !Number.isFinite(point.x) || !Number.isFinite(point.y),
    ) ||
    !Number.isInteger(settings.sampleCount) ||
    settings.sampleCount < 2
  ) {
    return incompleteGrade;
  }

  const drawnPath = pathFromPoints(points);
  const expectedSamples = samplePath(expectedPath, settings.sampleCount);
  const drawnSamples = samplePath(drawnPath, settings.sampleCount);
  if (expectedSamples.length === 0 || drawnSamples.length === 0) {
    return incompleteGrade;
  }

  const expectedStart = expectedSamples[0];
  const drawnStart = drawnSamples[0];
  const expectedEnd = expectedSamples.at(-1);
  const drawnEnd = drawnSamples.at(-1);
  if (
    expectedStart == null ||
    drawnStart == null ||
    expectedEnd == null ||
    drawnEnd == null
  ) {
    return incompleteGrade;
  }

  const startDeviation = Math.hypot(
    expectedStart.x - drawnStart.x,
    expectedStart.y - drawnStart.y,
  );
  const endDeviation = Math.hypot(
    expectedEnd.x - drawnEnd.x,
    expectedEnd.y - drawnEnd.y,
  );
  const expectedDirectionX = expectedEnd.x - expectedStart.x;
  const expectedDirectionY = expectedEnd.y - expectedStart.y;
  const drawnDirectionX = drawnEnd.x - drawnStart.x;
  const drawnDirectionY = drawnEnd.y - drawnStart.y;
  const directionDot =
    expectedDirectionX * drawnDirectionX + expectedDirectionY * drawnDirectionY;
  const allDeviations = [
    ...expectedSamples.map((point) => pointDistanceToPath(drawnPath, point)),
    ...drawnSamples.map((point) => pointDistanceToPath(expectedPath, point)),
  ];
  const meanDeviation =
    allDeviations.reduce((sum, deviation) => sum + deviation, 0) /
    allDeviations.length;

  if (
    directionDot <= 0 ||
    startDeviation > settings.maxEndpointDeviation ||
    endDeviation > settings.maxEndpointDeviation
  ) {
    return {
      accepted: false,
      failure: `direction`,
      meanDeviation,
      startDeviation,
      endDeviation,
    };
  }

  const accepted = meanDeviation <= settings.maxMeanDeviation;
  return {
    accepted,
    failure: accepted ? null : `shape`,
    meanDeviation,
    startDeviation,
    endDeviation,
  };
}
