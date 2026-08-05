import SVGPathCommander from "svg-path-commander";
import type { DeepReadonly } from "ts-essentials";

export function countIntersections(path1Str: string, path2Str: string): number {
  const path1 = new SVGPathCommander(path1Str);
  const path2 = new SVGPathCommander(path2Str);

  // Fast bounding-box check.
  const bbox1 = path1.bbox;
  const bbox2 = path2.bbox;
  if (
    !SVGPathCommander.boundingBoxIntersect(
      [bbox1.x, bbox1.y, bbox1.x2, bbox1.y2],
      [bbox2.x, bbox2.y, bbox2.x2, bbox2.y2],
    )
  ) {
    return 0;
  }

  const intersections = SVGPathCommander.pathsIntersection(
    path1.segments,
    path2.segments,
    false,
  ) as Array<{ x: number; y: number }>;

  const seenIntersections = new Set(
    intersections.map((hit) => `${hit.x.toFixed(4)}:${hit.y.toFixed(4)}`),
  );

  return seenIntersections.size;
}

export const pointInSvgPath = (path: string, x: number, y: number): boolean => {
  const bbox = SVGPathCommander.getPathBBox(path);
  const path2 = `M ${x} ${y} H ${bbox.x2 + 10}`;

  return countIntersections(path, path2) % 2 === 1;
};

export const getPointsAndIntersectingPaths = (
  paths: DeepReadonly<{ id: string; data: string }[]>,
  points: DeepReadonly<{ id: string; x: number; y: number }[]>,
) => {
  return points.map(({ id: pointId, x, y }) => {
    const intersectingPathIds = paths
      .filter(({ data }) => pointInSvgPath(data, x, y))
      .map(({ id }) => id);

    return { pointId, x, y, intersectingPathIds };
  });
};
