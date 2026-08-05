import { describe, expect, test } from "vitest";
import {
  getPointsAndIntersectingPaths,
  pointInSvgPath,
} from "#util/svgPointInPath.ts";

describe(`pointInSvgPath tests`, () => {
  test.for([
    [`M80 80A 45 45, 0, 0, 0, 125 125L 125 80 Z`, 100, 100],
    [`M230 80A 45 45, 0, 1, 0, 275 125L 275 80 Z`, 220, 100],
    [`M80 230A 45 45, 0, 0, 1, 125 275L 125 230 Z`, 115, 235],
    [`M230 230A 45 45, 0, 1, 1, 275 275L 275 230 Z`, 300, 235],
  ] as const)(`($1,$2) is inside $0`, ([path, x, y]) => {
    expect(pointInSvgPath(path, x, y)).toBe(true);
  });

  test.for([
    [`M80 80A 45 45, 0, 0, 0, 125 125L 125 80 Z`, 200, 100],
    [`M230 80A 45 45, 0, 1, 0, 275 125L 275 80 Z`, 220, 50],
    [`M80 230A 45 45, 0, 0, 1, 125 275L 125 230 Z`, 115, 200],
    [`M230 230A 45 45, 0, 1, 1, 275 275L 275 230 Z`, 250, 235],
  ] as const)(`($1,$2) is output $0`, ([path, x, y]) => {
    expect(pointInSvgPath(path, x, y)).toBe(false);
  });
});

describe(`getPointsAndIntersectingPaths tests`, () => {
  test.for([
    {
      name: `point inside path`,
      input: [
        [
          {
            id: `path-0`,
            data: `M80 80A 45 45, 0, 0, 0, 125 125L 125 80 Z`,
          },
        ],
        [{ id: `point-0`, x: 100, y: 100 }],
      ],
      expected: [
        {
          intersectingPathIds: [`path-0`],
          pointId: `point-0`,
          x: 100,
          y: 100,
        },
      ],
    },
    {
      name: `point inside path`,
      input: [
        [
          {
            id: `path-0`,
            data: `M80 80A 45 45, 0, 0, 0, 125 125L 125 80 Z`,
          },
        ],
        [{ id: `point-0`, x: 100.1, y: 100.1 }],
      ],
      expected: [
        {
          intersectingPathIds: [`path-0`],
          pointId: `point-0`,
          x: 100.1,
          y: 100.1,
        },
      ],
    },
    {
      name: `point inside path`,
      input: [
        [
          {
            id: `path-0`,
            data: `M230 80A 45 45, 0, 1, 0, 275 125L 275 80 Z`,
          },
        ],
        [{ id: `point-0`, x: 220, y: 100 }],
      ],
      expected: [
        {
          intersectingPathIds: [`path-0`],
          pointId: `point-0`,
          x: 220,
          y: 100,
        },
      ],
    },
    {
      name: `point inside path`,
      input: [
        [
          {
            id: `path-0`,
            data: `M80 230A 45 45, 0, 0, 1, 125 275L 125 230 Z`,
          },
        ],
        [{ id: `point-0`, x: 115, y: 235 }],
      ],
      expected: [
        {
          intersectingPathIds: [`path-0`],
          pointId: `point-0`,
          x: 115,
          y: 235,
        },
      ],
    },
    {
      name: `point inside path`,
      input: [
        [
          {
            id: `path-0`,
            data: `M230 230A 45 45, 0, 1, 1, 275 275L 275 230 Z`,
          },
        ],
        [{ id: `point-0`, x: 300, y: 235 }],
      ],
      expected: [
        {
          intersectingPathIds: [`path-0`],
          pointId: `point-0`,
          x: 300,
          y: 235,
        },
      ],
    },
    {
      name: `point outside path`,
      input: [
        [{ id: `path-0`, data: `M80 80A 45 45, 0, 0, 0, 125 125L 125 80 Z` }],
        [{ id: `point-0`, x: 200, y: 100 }],
      ],
      expected: [
        { intersectingPathIds: [], pointId: `point-0`, x: 200, y: 100 },
      ],
    },
    {
      name: `point outside path`,
      input: [
        [
          {
            id: `path-0`,
            data: `M230 80A 45 45, 0, 1, 0, 275 125L 275 80 Z`,
          },
        ],
        [{ id: `point-0`, x: 220, y: 50 }],
      ],
      expected: [
        { intersectingPathIds: [], pointId: `point-0`, x: 220, y: 50 },
      ],
    },
    {
      name: `point outside path`,
      input: [
        [
          {
            id: `path-0`,
            data: `M80 230A 45 45, 0, 0, 1, 125 275L 125 230 Z`,
          },
        ],
        [{ id: `point-0`, x: 115, y: 200 }],
      ],
      expected: [
        { intersectingPathIds: [], pointId: `point-0`, x: 115, y: 200 },
      ],
    },
    {
      name: `point outside path`,
      input: [
        [
          {
            id: `path-0`,
            data: `M230 230A 45 45, 0, 1, 1, 275 275L 275 230 Z`,
          },
        ],
        [{ id: `point-0`, x: 250, y: 235 }],
      ],
      expected: [
        { intersectingPathIds: [], pointId: `point-0`, x: 250, y: 235 },
      ],
    },
  ] as const)(`$name`, ({ input, expected }) => {
    const [paths, points] = input;
    expect(getPointsAndIntersectingPaths(paths, points)).toEqual(expected);
  });
});
