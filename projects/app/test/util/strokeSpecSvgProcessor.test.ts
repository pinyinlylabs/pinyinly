import type { StrokeSpecString } from "#data/model.js";
import {
  buildClosedSvgSegmentPathFromStrokeSpec,
  buildSvgSegmentPathFromLengths,
  buildStrokeSpecSegmentPaths,
  getSvgPathIntersections,
} from "#util/strokeSpecSvgProcessor.js";
import { describe, expect, test } from "vitest";

describe(`buildStrokeSpecSegmentPaths`, () => {
  test(`builds segment maps from stroke spec text`, () => {
    const segments = buildStrokeSpecSegmentPaths(
      [`M 0 0 L 10 0`, `M 2 -5 L 2 5`, `M 8 -5 L 8 5`],
      undefined,
      [`0[1:2]` as StrokeSpecString],
    );

    expect(segments).toMatchInlineSnapshot(`{}`);
  });

  test(`lists intersections for a target and cutter path`, () => {
    const intersections = getSvgPathIntersections(
      `M 0 0 L 10 0`,
      `M 2 -5 L 5 5 L 8 -5`,
    );

    expect(intersections).toMatchInlineSnapshot(`
      [
        {
          "boundaryLength": 5.22021484375,
          "length": 3.5,
          "t1": 0.35000001043081325,
          "t2": 0.5000000149011611,
          "x": 3.500000000000001,
          "y": -0,
        },
        {
          "boundaryLength": 15.66064453125,
          "length": 6.5,
          "t1": 0.6500000104308129,
          "t2": 0.5000000149011616,
          "x": 6.5000000000000036,
          "y": -0,
        },
      ]
    `);
  });

  test(`buildSvgSegmentPathFromLengths preserves curve commands on curved paths`, () => {
    const segment = buildSvgSegmentPathFromLengths(
      `M 0 0 C 0 100 100 100 100 0`,
      40,
      160,
    );

    expect(segment).toMatchInlineSnapshot(
      `"M 6.45 39.26 C 24.53 86.95 75.57 86.91 93.59 39.14"`,
    );
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

    expect(segment).toMatchInlineSnapshot(
      `"M 0 3 C 0 5.33 0 7.67 0 10 C 1.33 10 2.67 10 4 10 C 4 9 4 8 4 7 C 2.67 7 1.33 7 0 7 C 0 8 0 9 0 10 C 1.33 10 2.67 10 4 10 C 4 7.67 4 5.33 4 3 C 2.67 3 1.33 3 0 3 Z"`,
    );
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

    expect(fromStart).toMatchInlineSnapshot(
      `"M 4 3 C 4 2 4 1 4 0 C 2.67 0 1.33 0 0 0 C 0 0 0 3 0 3 C 1.33 3 2.67 3 4 3 Z"`,
    );

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

    expect(toEnd).toMatchInlineSnapshot(
      `"M 0 3 C 0 5.33 0 7.67 0 10 C 1.33 10 2.67 10 4 10 C 4 7.67 4 5.33 4 3 C 2.67 3 1.33 3 0 3 Z"`,
    );
  });

  test(`supports percent open bounds on median path`, () => {
    const fromStart = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[:5%]`,
    });
    expect(fromStart).toMatchInlineSnapshot(
      `"M 4 0.5 C 4 0.33 4 0.17 4 0 C 2.67 0 1.33 0 0 0 C 0 0 0 0.5 0 0.5 C 1.33 0.5 2.67 0.5 4 0.5 Z"`,
    );

    const toEnd = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[5%:]`,
    });

    expect(toEnd).toMatchInlineSnapshot(
      `"M 0 0.5 C 0 3.67 0 6.83 0 10 C 1.33 10 2.67 10 4 10 C 4 6.83 4 3.67 4 0.5 C 2.67 0.5 1.33 0.5 0 0.5 Z"`,
    );
  });

  test(`supports percent-to-percent and mixed stroke/percent bounds`, () => {
    const percentSegment = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[5%:95%]`,
    });
    expect(percentSegment).toMatchInlineSnapshot(
      `"M 4 9.5 C 4 6.5 4 3.5 4 0.5 C 4 0.5 4 9.5 4 9.5 C 2.67 9.5 1.33 9.5 0 9.5 C 0 9.5 0 0.5 0 0.5 C 0 3.5 0 6.5 0 9.5 C 0 9.5 0 0.5 0 0.5 C 1.33 0.5 2.67 0.5 4 0.5 Z"`,
    );

    const mixedSegmentA = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[5%:1]`,
    });
    expect(mixedSegmentA).toMatchInlineSnapshot(
      `"M 0 3 C 0 5.33 0 7.67 0 10 C 1.33 10 2.67 10 4 10 C 4 6.83 4 3.67 4 0.5 C 4 0.5 0 3 0 3 C 1.33 3 2.67 3 4 3 C 4 3 0 0.5 0 0.5 C 0 3.67 0 6.83 0 10 C 1.33 10 2.67 10 4 10 C 4 7.67 4 5.33 4 3 C 4 3 0 0.5 0 0.5 C 1.33 0.5 2.67 0.5 4 0.5 Z"`,
    );

    const mixedSegmentB = buildClosedSvgSegmentPathFromStrokeSpec({
      strokePathsById: {
        0: `M 0 0 L 0 10 L 4 10 L 4 0 Z`,
        1: `M -2 3 L 6 3`,
      },
      medianPathsById: {
        0: `M 2 0 L 2 10`,
      },
      strokeSpecText: `0[1:95%]`,
    });
    expect(mixedSegmentB).toMatchInlineSnapshot(
      `"M 0 3 C 0 5.33 0 7.67 0 10 C 1.33 10 2.67 10 4 10 C 4 9.83 4 9.67 4 9.5 C 2.67 9.5 1.33 9.5 0 9.5 C 0 9.67 0 9.83 0 10 C 1.33 10 2.67 10 4 10 C 4 7.67 4 5.33 4 3 C 2.67 3 1.33 3 0 3 Z"`,
    );
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
    expect(segment).toMatchInlineSnapshot(
      `"M 0 3 C 0 5 0 7 0 9 C 2 9 4 9 6 9 C 6 7 6 5 6 3 C 4 3 2 3 0 3 Z"`,
    );
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

    expect(segment).toMatchInlineSnapshot(
      `"M 0 3 C 0 5 0 7 0 9 C 2 9 4 9 6 9 C 6 7 6 5 6 3 C 4 3 2 3 0 3 Z"`,
    );
  });
});
