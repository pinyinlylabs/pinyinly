import { readFile } from "@pinyinly/lib/fs";
import { z } from "zod";
import { gradeCharacterShape } from "#util/shapeContextGrader.ts";
import type { WritingStrokePoint } from "#util/writingStrokeGrader.ts";
import { describe, expect, test } from "vitest";

const characterDataSchema = z.object({
  svg: z.object({ medians: z.array(z.string()) }),
});

const characterPaths = Object.fromEntries(
  await Promise.all(
    [`土`, `士`, `未`, `末`, `己`, `已`, `人`, `入`].map(async (character) => {
      const url = new URL(
        `../../src/client/wiki/${character}/character.json`,
        import.meta.url,
      );
      const parsed = characterDataSchema.parse(
        JSON.parse(await readFile(url, `utf8`)),
      );
      return [character, parsed.svg.medians] as const;
    }),
  ),
);

function makeStrokePoints(
  strokes: readonly (readonly WritingStrokePoint[])[],
  transform: (point: WritingStrokePoint) => WritingStrokePoint = (point) =>
    point,
): WritingStrokePoint[][] {
  return strokes.map((stroke) => stroke.map(transform));
}

function pointsForPaths(paths: readonly string[]): WritingStrokePoint[][] {
  return paths.map((path) => {
    const numbers = [...path.matchAll(/[-+]?\d*\.?\d+/gu)].map(Number);
    const points: WritingStrokePoint[] = [];
    for (let index = 0; index + 1 < numbers.length; index += 2) {
      points.push({ x: numbers[index] ?? 0, y: numbers[index + 1] ?? 0 });
    }
    return points;
  });
}

describe(`gradeCharacterShape`, () => {
  const reference = [
    `M 100 100 L 500 100`,
    `M 300 100 L 300 500`,
    `M 100 300 L 500 300`,
  ];
  const strokes = pointsForPaths(reference);

  test(`matches identical shapes independent of stroke order and direction`, () => {
    const reversed = [...strokes]
      .reverse()
      .map((stroke) => [...stroke].reverse());
    const result = gradeCharacterShape(reversed, reference);

    expect(result.similarity).toBeGreaterThan(0.9);
    expect(result.unmatchedPointPenalty).toBe(0);
    expect(result.correspondences.length).toBe(result.sourcePoints.length);
  });

  test(`is invariant to translation and uniform scale`, () => {
    const transformed = makeStrokePoints(strokes, ({ x, y }) => ({
      x: x * 3 + 1200,
      y: y * 3 - 800,
    }));

    const baseline = gradeCharacterShape(strokes, reference);
    const changed = gradeCharacterShape(transformed, reference);
    expect(Math.abs(changed.similarity - baseline.similarity)).toBeLessThan(
      0.03,
    );
  });

  test(`allows small rotations`, () => {
    const radians = (8 * Math.PI) / 180;
    const rotated = makeStrokePoints(strokes, ({ x, y }) => ({
      x: Math.cos(radians) * x - Math.sin(radians) * y,
      y: Math.sin(radians) * x + Math.cos(radians) * y,
    }));

    expect(gradeCharacterShape(rotated, reference).similarity).toBeGreaterThan(
      0.75,
    );
  });

  test(`penalizes rotations outside the allowed range`, () => {
    const radians = Math.PI / 2;
    const rotated = makeStrokePoints(strokes, ({ x, y }) => ({
      x: Math.cos(radians) * x - Math.sin(radians) * y,
      y: Math.sin(radians) * x + Math.cos(radians) * y,
    }));
    const smallRotation = makeStrokePoints(strokes, ({ x, y }) => ({
      x: Math.cos(Math.PI / 24) * x - Math.sin(Math.PI / 24) * y,
      y: Math.sin(Math.PI / 24) * x + Math.cos(Math.PI / 24) * y,
    }));

    const result = gradeCharacterShape(rotated, reference);
    expect(result.similarity).toBeLessThan(
      gradeCharacterShape(smallRotation, reference).similarity - 0.1,
    );
  });

  test(`penalizes moderate shape distortion, missing geometry, and extra geometry`, () => {
    const distorted = makeStrokePoints(strokes, ({ x, y }) => ({
      x: x + (y > 250 ? 90 : 0),
      y,
    }));
    const missing = strokes.slice(0, 2);
    const extra = [
      ...strokes,
      [
        { x: 800, y: 100 },
        { x: 800, y: 500 },
      ],
    ];
    const exact = gradeCharacterShape(strokes, reference);

    expect(
      gradeCharacterShape(distorted, reference).combinedCost,
    ).toBeGreaterThan(exact.combinedCost);
    expect(
      gradeCharacterShape(missing, reference).combinedCost,
    ).toBeGreaterThan(exact.combinedCost);
    expect(gradeCharacterShape(extra, reference).combinedCost).toBeGreaterThan(
      exact.combinedCost,
    );
  });

  test(`assigns a higher cost to a completely different geometry`, () => {
    const differentCharacter = [
      `M 100 100 L 500 500`,
      `M 500 100 L 100 500`,
      `M 300 100 L 300 500`,
    ];
    const exactCost = gradeCharacterShape(strokes, reference).combinedCost;
    const differentCost = gradeCharacterShape(
      pointsForPaths(differentCharacter),
      reference,
    ).combinedCost;

    expect(differentCost).toBeGreaterThan(exactCost + 0.1);
  });

  test(`marks high-cost pairs unmatched instead of forcing correspondences`, () => {
    const result = gradeCharacterShape(
      [
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
      ],
      [`M 0 0 L 0 100`],
      { unmatchedCost: 0.01 },
    );

    expect(result.correspondences.length).toBe(0);
    expect(result.unmatchedSourceIndices.length).toBeGreaterThan(0);
    expect(result.unmatchedTargetIndices.length).toBeGreaterThan(0);
  });

  test(`distinguishes visually similar reference characters`, () => {
    for (const [character, similarCharacter] of [
      [`土`, `士`],
      [`未`, `末`],
      [`己`, `已`],
      [`人`, `入`],
    ] as const) {
      const expected = characterPaths[character] ?? [];
      const similar = characterPaths[similarCharacter] ?? [];
      const sameCost = gradeCharacterShape(
        pointsForPaths(expected),
        expected,
      ).combinedCost;
      const differentCost = gradeCharacterShape(
        pointsForPaths(expected),
        similar,
      ).combinedCost;

      expect(
        differentCost,
        `${character} compared with ${similarCharacter}`,
      ).toBeGreaterThan(sameCost);
    }
  });

  test(`returns finite results for empty, duplicate, and short strokes`, () => {
    const cases = [
      gradeCharacterShape([], reference),
      gradeCharacterShape([[]], reference),
      gradeCharacterShape(
        [
          [
            { x: 1, y: 1 },
            { x: 1, y: 1 },
          ],
        ],
        reference,
      ),
      gradeCharacterShape([[{ x: 1, y: 1 }]], reference),
      gradeCharacterShape(strokes, []),
    ];

    for (const result of cases) {
      expect(Number.isFinite(result.similarity)).toBe(true);
      expect(Number.isFinite(result.combinedCost)).toBe(true);
      expect(result.transform.transform({ x: 0, y: 0 })).toMatchObject({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    }
  });

  test(`retains characters with many short strokes within the sample budget`, () => {
    const manyStrokes = Array.from({ length: 40 }, (_, index) => [
      { x: 0, y: index * 10 },
      { x: 100, y: index * 10 },
    ]);
    const manyPaths = manyStrokes.map(
      ([start, end]) => `M ${start?.x} ${start?.y} L ${end?.x} ${end?.y}`,
    );
    const result = gradeCharacterShape(manyStrokes, manyPaths);

    expect(result.sourcePoints.length).toBe(64);
    expect(result.sourceStrokes.length).toBe(40);
  });
});
