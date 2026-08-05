import { describe, expect, test } from "vitest";
import {
  parseSvgPaths,
  transformArphicSpaceSvgPath,
  transformFigmaSvgPathsToArphicTtfSpace,
} from "#util/svgFont.ts";

describe(`parseSvgPaths`, () => {
  test(`should parse root SVG paths and preserve attributes`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <path d="M100 100 L 200 200" stroke-dasharray="4 2" fill="none" />
        <path d="M100 100 H 200 V 200 H 100 Z" stroke="#000" />
      </svg>
    `;

    const parsedPaths = parseSvgPaths(svg);
    expect(parsedPaths.svgAttrs).toMatchObject({
      width: `1024`,
      height: `1024`,
      viewBox: `0 0 1024 1024`,
    });
    expect(parsedPaths).toEqual([
      {
        d: `M100 100 L 200 200`,
        fill: `none`,
        "stroke-dasharray": `4 2`,
      },
      {
        d: `M100 100 H 200 V 200 H 100 Z`,
        stroke: `#000`,
      },
    ]);
  });

  test(`should parse <g> wrapped SVG paths correctly`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <g>
          <path d="M100 100 H 200 V 200 H 100 Z" />
          <path d="M100 100 L 200 200" />
        </g>
      </svg>
    `;

    const parsedPaths = parseSvgPaths(svg);
    expect(parsedPaths.svgAttrs).toMatchObject({
      width: `1024`,
      height: `1024`,
    });
    expect(parsedPaths).toMatchInlineSnapshot(`
      [
        {
          "d": "M100 100 H 200 V 200 H 100 Z",
        },
        {
          "d": "M100 100 L 200 200",
        },
      ]
    `);
  });
});

describe(`transformFigmaSvgPathsToArphicTtfSpace`, () => {
  test(`should transform valid Figma SVG paths to Arphic TTF space correctly`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <g>
          <path d="M104 104 L 104 196" stroke-dasharray="4 2" />
          <path d="M100 100 H 200 V 200 H 100 Z" />
        </g>
      </svg>
    `;

    const parsedPaths = parseSvgPaths(svg);
    const transformedPaths =
      transformFigmaSvgPathsToArphicTtfSpace(parsedPaths);
    expect(parsedPaths.svgAttrs).toMatchObject({
      width: `1024`,
      height: `1024`,
    });
    expect(transformedPaths).toMatchInlineSnapshot(`
      {
        "medians": [
          "M104 796V704",
        ],
        "strokes": [
          "M100 800H200V700H100Z",
        ],
      }
    `);
  });

  test(`should match medians to strokes by containment even when the SVG order is scrambled`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <g>
          <path d="M104 104 L 104 296" stroke-dasharray="4 2" />
          <path d="M504 104 L 504 296" stroke-dasharray="4 2" />
          <path d="M100 100 H 300 V 300 H 100 Z" />
          <path d="M500 100 H 700 V 300 H 500 Z" />
        </g>
      </svg>
    `;

    const parsedPaths = parseSvgPaths(svg);
    const transformedPaths =
      transformFigmaSvgPathsToArphicTtfSpace(parsedPaths);

    expect(transformedPaths).toMatchInlineSnapshot(`
      {
        "medians": [
          "M504 796V604",
          "M104 796V604",
        ],
        "strokes": [
          "M500 800H700V600H500Z",
          "M100 800H300V600H100Z",
        ],
      }
    `);
  });

  test(`should reject swapped stroke and median paths`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <g>
          <path d="M100 100 H 200 V 200 H 100 Z" />
          <path d="M100 100 L 200 200" />
        </g>
      </svg>
    `;

    expect(() =>
      transformFigmaSvgPathsToArphicTtfSpace(parseSvgPaths(svg)),
    ).toThrow(
      /Expected stroke path 2 \(1-indexed, d=M100 100 H 200 V 200\.\.\.\) to contain exactly one median path, but found 0/u,
    );
  });

  test(`should reject medians that are not fully contained inside the stroke`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <g>
          <path d="M104 104 C 300 104 300 300 104 196" stroke-dasharray="4 2" />
          <path d="M100 100 H 200 V 200 H 100 Z" />
        </g>
      </svg>
    `;

    expect(() =>
      transformFigmaSvgPathsToArphicTtfSpace(parseSvgPaths(svg)),
    ).toThrow(
      /Expected stroke path 1 \(1-indexed, d=M100 100 H 200 V 200\.\.\.\) to contain exactly one median path, but found 0/u,
    );
  });

  test(`should reject medians that are too far from the stroke boundary`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <g>
          <path d="M120 120 L 180 180" stroke-dasharray="4 2" />
          <path d="M100 100 H 200 V 200 H 100 Z" />
        </g>
      </svg>
    `;

    expect(() =>
      transformFigmaSvgPathsToArphicTtfSpace(parseSvgPaths(svg)),
    ).toThrow(
      /Expected median path 1 \(1-indexed, d=M120 120 L 180 180\) start point to be within 8 units of the stroke boundary/u,
    );
  });

  test(`should reject SVGs that are not 1024x1024`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <g>
          <path d="M100 100 L 200 200" stroke-dasharray="4 2" />
          <path d="M100 100 H 200 V 200 H 100 Z" />
        </g>
      </svg>
    `;

    expect(() =>
      transformFigmaSvgPathsToArphicTtfSpace(parseSvgPaths(svg)),
    ).toThrow(/Expected SVG size to be 1024x1024, but found 100x100/u);
  });

  test(`should reject stroke paths that have a stroke-dasharray attribute`, () => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
        <g>
          <path d="M100 100 L 200 200" />
          <path d="M100 100 H 200 V 200 H 100 Z" stroke-dasharray="4 2" />
        </g>
      </svg>
    `;

    expect(() =>
      transformFigmaSvgPathsToArphicTtfSpace(parseSvgPaths(svg)),
    ).toThrow(
      /Expected median path 1 \(1-indexed, d=M100 100 H 200 V 200\.\.\.\) to be open/u,
    );
  });
});

describe(`transformArphicSpaceSvgPath`, () => {
  test(`should transform TTF path to SVG path correctly`, () => {
    const ttfPath = `M0 0 L100 0 L100 100 L0 100 Z`;

    const transformedPath = transformArphicSpaceSvgPath(ttfPath);
    expect(transformedPath).toMatchInlineSnapshot(`"M0 900H100V800H0Z"`);
  });
});
