import {
  buildClosedSvgSegmentPathFromStrokeSpec,
  buildSvgSegmentPathFromLengths,
  buildSvgSegmentPaths,
  getSvgPathIntersections,
} from "#util/strokeSegments.ts";
import { describe, expect, test } from "vitest";

function extractPathPoints(path: string): Array<{ x: number; y: number }> {
  const numbers = path
    .replaceAll(/[A-Za-z]/gu, ` `)
    .trim()
    .split(/\s+/u)
    .map(Number);

  const points: Array<{ x: number; y: number }> = [];
  for (let index = 0; index + 1 < numbers.length; index += 2) {
    const x = numbers[index];
    const y = numbers[index + 1];
    if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) {
      continue;
    }
    points.push({ x, y });
  }

  return points;
}

function polygonAreaFromPath(path: string): number {
  const points = extractPathPoints(path);
  if (points.length < 3) {
    return 0;
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

describe(`strokeSegments helper`, () => {
  test(`builds segment maps from stroke spec text`, () => {
    const segments = buildSvgSegmentPaths(
      [`M 0 0 L 10 0`, `M 2 -5 L 2 5`, `M 8 -5 L 8 5`],
      undefined,
      [`0[1:2]`],
    );

    expect(segments).toMatchInlineSnapshot(`undefined`);
  });

  test(`lists intersections for a target and cutter path`, () => {
    const intersections = getSvgPathIntersections(
      `M 0 0 L 10 0`,
      `M 2 -5 L 5 5 L 8 -5`,
    );

    expect(intersections).toHaveLength(2);
    expect(intersections[0]?.x).toBeCloseTo(3.5);
    expect(intersections[1]?.x).toBeCloseTo(6.5);
  });

  test(`buildSvgSegmentPathFromLengths preserves curve commands on curved paths`, () => {
    const segment = buildSvgSegmentPathFromLengths(
      `M 0 0 C 0 100 100 100 100 0`,
      40,
      160,
    );

    expect(segment).toContain(`M `);
    expect(segment).toContain(` C `);
    expect(segment).not.toContain(` NaN`);
  });

  test(`builds a closed cut from StrokeSpec with explicit target/cutter IDs`, () => {
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3 L 6 7 L -2 7`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[1#0:1#1]`,
    });

    expect(segment).not.toBeNull();
    expect(segment).toContain(` Z`);
  });

  test(`supports open StrokeSpec bounds for median occurrences`, () => {
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3 L 6 7 L -2 7`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[:1#1]`,
    });

    expect(segment).not.toBeNull();
    expect(segment).toContain(` Z`);
  });

  test(`fills whole stroke for single range StrokeSpec`, () => {
    const targetPath = `M 0 0 L 0 10 L 4 10 L 4 0 Z`;
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: targetPath,
      },
      strokeSpecText: `0`,
    });

    expect(segment).toBe(targetPath);
  });

  test(`open-bound semantics: 0[:1] keeps start-to-cut and 0[1:] keeps cut-to-end`, () => {
    const fromStart = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3 L 6 7 L -2 7`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[:1]`,
    });
    const toEnd = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3 L 6 7 L -2 7`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[1:]`,
    });

    expect(fromStart).not.toBeNull();
    expect(toEnd).not.toBeNull();
    if (fromStart == null || toEnd == null) {
      return;
    }

    expect(fromStart).toContain(` Z`);
    expect(toEnd).toContain(` Z`);
    expect(fromStart).not.toContain(`NaN`);
    expect(toEnd).not.toContain(`NaN`);
  });

  test(`supports two-cutter slice as fill between cut line 1 and cut line 2`, () => {
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 12 L 6 12 L 6 0 Z`,
        1: `M -2 3 L 8 3`,
        2: `M -2 9 L 8 9`,
      },
      medianPathsById: {
        0: `M 3 0 L 3 12`,
      },
      strokeSpecText: `0[1:2]`,
    });

    expect(segment).not.toBeNull();
    if (segment == null) {
      return;
    }

    expect(segment).toContain(` Z`);
    expect(segment).not.toContain(`NaN`);

    const middleArea = polygonAreaFromPath(segment);
    expect(middleArea).toBeGreaterThan(30);
    expect(middleArea).toBeLessThan(40);
  });

  test(`uses referenced stroke medians (not outlines) for 0[1:2] cutter seams`, () => {
    const segment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 12 L 6 12 L 6 0 Z`,
        // These outlines do not intersect stroke 0, so using outlines would fail.
        1: `M 20 2 L 26 2 L 26 4 L 20 4 Z`,
        2: `M 20 8 L 26 8 L 26 10 L 20 10 Z`,
      },
      medianPathsById: {
        0: `M 3 0 L 3 12`,
        // These medians do intersect stroke 0 and should be used as cut lines.
        1: `M -2 3 L 8 3`,
        2: `M -2 9 L 8 9`,
      },
      strokeSpecText: `0[1:2]`,
    });

    expect(segment).not.toBeNull();
    if (segment == null) {
      return;
    }

    expect(segment).toContain(` Z`);
    expect(segment).not.toContain(`NaN`);
  });
});
