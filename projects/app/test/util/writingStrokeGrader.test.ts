import {
  gradeWritingStroke,
  writingStrokeGraderDefaults,
} from "#util/writingStrokeGrader.js";
import { describe, expect, test } from "vitest";

describe(`gradeWritingStroke`, () => {
  const expectedPath = `M 100 100 L 500 100`;

  test(`accepts a close stroke drawn in the expected direction`, () => {
    const grade = gradeWritingStroke(
      [
        { x: 100, y: 100 },
        { x: 280, y: 104 },
        { x: 500, y: 100 },
      ],
      expectedPath,
    );

    expect(grade.accepted).toBe(true);
    expect(grade.failure).toBeNull();
  });

  test(`rejects a stroke drawn in the opposite direction`, () => {
    const grade = gradeWritingStroke(
      [
        { x: 500, y: 100 },
        { x: 300, y: 100 },
        { x: 100, y: 100 },
      ],
      expectedPath,
    );

    expect(grade.accepted).toBe(false);
    expect(grade.failure).toBe(`direction`);
  });

  test(`rejects a stroke that is too far from the median`, () => {
    const grade = gradeWritingStroke(
      [
        { x: 100, y: 300 },
        { x: 300, y: 300 },
        { x: 500, y: 300 },
      ],
      expectedPath,
    );

    expect(grade.accepted).toBe(false);
    expect(grade.failure).toBe(`shape`);
  });

  test(`allows tuning the mean-deviation threshold`, () => {
    const points = [
      { x: 100, y: 230 },
      { x: 300, y: 230 },
      { x: 500, y: 230 },
    ];

    expect(gradeWritingStroke(points, expectedPath).accepted).toBe(false);
    expect(
      gradeWritingStroke(points, expectedPath, {
        maxMeanDeviation: writingStrokeGraderDefaults.maxMeanDeviation + 30,
      }).accepted,
    ).toBe(true);
  });

  test(`rejects incomplete input`, () => {
    expect(
      gradeWritingStroke([{ x: 100, y: 100 }], expectedPath),
    ).toMatchObject({
      accepted: false,
      failure: `incomplete`,
    });
  });
});
