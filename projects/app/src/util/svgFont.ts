import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import SVGPathCommander from "svg-path-commander";
import { invariant } from "@pinyinly/lib/invariant";
import { pointInSvgPath } from "@/util/svgPointInPath";

export interface PathAttrs {
  d: string;
  "stroke-dasharray"?: string;
  [attrName: string]: string | undefined;
}

export interface SvgAttrs {
  width?: string;
  height?: string;
  [attrName: string]: string | undefined;
}

export interface ParsedSvgPaths extends Array<PathAttrs> {
  svgAttrs: SvgAttrs;
}

const svgSize = 1024;
const medianBoundaryTolerance = 50;

/**
 * Parses an SVG string and extracts the path attributes from all `<path>`
 * elements.
 */
export function parseSvgPaths(svgSrc: string): ParsedSvgPaths {
  const xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: `@_`,
    preserveOrder: true,
  });

  const attrsSchema = z.record(z.string(), z.string());
  const pathDSchema = z.string().regex(/^M/gu);

  const gSchema = z.object({
    ":@": attrsSchema.optional(),
    g: z.array(z.lazy(() => pathSchema)),
  });

  const pathSchema = z.object({
    ":@": attrsSchema.optional(),
    path: z.array(z.never()),
  });

  const svgSchema = z.object({
    ":@": attrsSchema.optional(),
    svg: z.array(z.union([z.lazy(() => pathSchema), z.lazy(() => gSchema)])),
  });

  const parsed = z.tuple([svgSchema]).parse(xmlParser.parse(svgSrc), {
    reportInput: true,
  });

  function normalizeAttrs(
    attrs: Record<string, string> | undefined,
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [attrName, attrValue] of Object.entries(attrs ?? {})) {
      normalized[attrName.startsWith(`@_`) ? attrName.slice(2) : attrName] =
        attrValue;
    }

    return normalized;
  }

  const pathAttrs: PathAttrs[] = [];
  const svgAttrs = normalizeAttrs(parsed[0][`:@`]) as SvgAttrs;

  function walk(
    el:
      | z.infer<typeof svgSchema>
      | z.infer<typeof pathSchema>
      | z.infer<typeof gSchema>,
  ): void {
    if (`svg` in el) {
      for (const child of el.svg) {
        walk(child);
      }
    } else if (`g` in el) {
      for (const child of el.g) {
        walk(child);
      }
    } else if (`path` in el) {
      invariant(
        el.path.length === 0,
        `Expected zero children for <path> element, but found ${el.path.length}`,
      );

      const attrs = normalizeAttrs(el[`:@`]) as PathAttrs;
      pathAttrs.push({
        ...attrs,
        d: pathDSchema.parse(attrs.d, { reportInput: true }),
      });
    } else {
      throw new Error(`Unexpected element: ${JSON.stringify(el)}`);
    }
  }

  walk(parsed[0]);

  const result = pathAttrs as ParsedSvgPaths;
  Object.defineProperty(result, `svgAttrs`, {
    value: svgAttrs,
    enumerable: false,
  });
  return result;
}

export function transformFigmaSvgPathsToArphicTtfSpace(paths: ParsedSvgPaths): {
  strokes: string[];
  medians: string[];
} {
  const svgAttrs = paths.svgAttrs;

  const svgWidth = parseSvgDimension(svgAttrs.width);
  const svgHeight = parseSvgDimension(svgAttrs.height);
  invariant(
    svgWidth === svgSize && svgHeight === svgSize,
    `Expected SVG size to be ${svgSize}x${svgSize}, but found ${formatSvgDimension(svgWidth)}x${formatSvgDimension(svgHeight)}`,
  );

  invariant(
    paths.length % 2 === 0,
    `Expected an even number of paths, but found ${paths.length}`,
  );

  // Figma exports the first/top-most layer last, because in SVGs the last
  // element is drawn on top of the previous elements. In TTFs, the first stroke
  // is drawn first, so we need to reverse the order of the paths.
  const reversedPaths = [...paths].reverse();

  const strokePaths: Array<{ path: PathAttrs; pathIndex: number }> = [];
  const medianPaths: Array<{ path: PathAttrs; pathIndex: number }> = [];

  for (const [pathIndex, path] of reversedPaths.entries()) {
    if (path[`stroke-dasharray`] != null) {
      invariant(
        !isPathClosed(path.d),
        `Expected ${formatPathLabel(`median`, path, pathIndex)} to be open`,
      );
      medianPaths.push({ path, pathIndex });
      continue;
    }

    if (isPathClosed(path.d)) {
      strokePaths.push({ path, pathIndex });
      continue;
    }

    medianPaths.push({ path, pathIndex });
  }

  invariant(
    strokePaths.length === medianPaths.length,
    `Expected the number of strokes and medians to match, but found ${strokePaths.length} strokes and ${medianPaths.length} medians`,
  );

  const matchedMedians = new Set<number>();
  const strokes: string[] = [];
  const medians: string[] = [];

  for (const [strokeIndex, strokeEntry] of strokePaths.entries()) {
    const matchedMedianEntries = medianPaths.filter(
      (medianEntry) =>
        !matchedMedians.has(medianEntry.pathIndex) &&
        isPathContainedInPath(medianEntry.path.d, strokeEntry.path.d),
    );

    invariant(
      matchedMedianEntries.length === 1,
      `Expected ${formatPathLabel(`stroke`, strokeEntry.path, strokeEntry.pathIndex)} to contain exactly one median path, but found ${matchedMedianEntries.length}`,
    );

    const medianEntry = matchedMedianEntries[0];
    invariant(
      medianEntry != null,
      `Expected median path to be present for ${formatPathLabel(`stroke`, strokeEntry.path, strokeEntry.pathIndex)}`,
    );

    matchedMedians.add(medianEntry.pathIndex);
    validateFigmaStrokeMedianPair(
      strokeEntry.path,
      medianEntry.path,
      strokeIndex,
    );

    strokes.push(transformArphicSpaceSvgPath(strokeEntry.path.d));
    medians.push(transformArphicSpaceSvgPath(medianEntry.path.d));
  }

  invariant(
    strokes.length === medians.length,
    `Strokes and medians must have the same length`,
  );
  return {
    strokes,
    medians,
  };
}

function parseSvgDimension(value: string | undefined): number | null {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatSvgDimension(value: number | null): string {
  return value == null ? `missing` : String(value);
}

function isPathClosed(path: string): boolean {
  return SVGPathCommander.isClosedPath(SVGPathCommander.parsePathString(path));
}

function getPointDistanceToPath(
  path: string,
  point: { x: number; y: number },
): number {
  const pathPoint = SVGPathCommander.getClosestPoint(path, point);
  return Math.hypot(pathPoint.x - point.x, pathPoint.y - point.y);
}

function isPathContainedInPath(
  targetPath: string,
  boundaryPath: string,
): boolean {
  {
    const intersections = SVGPathCommander.pathsIntersection(
      targetPath,
      boundaryPath,
      true,
    ) as number;
    if (intersections !== 0) {
      return false;
    }
    const targetPoint = SVGPathCommander.getPointAtLength(targetPath, 0);
    return pointInSvgPath(boundaryPath, targetPoint.x, targetPoint.y);
  }
}

function validateFigmaStrokeMedianPair(
  stroke: PathAttrs,
  median: PathAttrs,
  pairIndex: number,
): void {
  const strokeLabel = formatPathLabel(`stroke`, stroke, pairIndex);
  const medianLabel = formatPathLabel(`median`, median, pairIndex);

  invariant(
    stroke[`stroke-dasharray`] == null,
    `Expected ${strokeLabel} to not have a stroke-dasharray attribute`,
  );

  invariant(isPathClosed(stroke.d), `Expected ${strokeLabel} to be closed`);

  invariant(!isPathClosed(median.d), `Expected ${medianLabel} to be open`);

  invariant(
    isPathContainedInPath(median.d, stroke.d),
    `Expected ${medianLabel} to be contained within ${strokeLabel}`,
  );

  const medianStart = SVGPathCommander.getPointAtLength(median.d, 0);
  const medianEnd = SVGPathCommander.getPointAtLength(
    median.d,
    SVGPathCommander.getTotalLength(median.d),
  );
  const medianStartDistance = getPointDistanceToPath(stroke.d, medianStart);
  const medianEndDistance = getPointDistanceToPath(stroke.d, medianEnd);

  invariant(
    medianStartDistance <= medianBoundaryTolerance,
    `Expected ${medianLabel} start point to be within ${medianBoundaryTolerance} units of the stroke boundary, but found ${medianStartDistance.toFixed(2)}`,
  );

  invariant(
    medianEndDistance <= medianBoundaryTolerance,
    `Expected ${medianLabel} end point to be within ${medianBoundaryTolerance} units of the stroke boundary, but found ${medianEndDistance.toFixed(2)}`,
  );
}

function formatPathLabel(
  role: `stroke` | `median`,
  path: PathAttrs,
  pairIndex: number,
): string {
  return `${role} path ${pairIndex + 1} (1-indexed, d=${formatPathPreview(path.d)})`;
}

function formatPathPreview(d: string): string {
  const preview = d.slice(0, 20);
  return d.length > 20 ? `${preview}...` : preview;
}

/**
 * Converts a TTF glyph path to an SVG path with the y-axis inverted and
 * translated to match SVG coordinate space.
 *
 * TTF coordinate space has the origin at the bottom-left, while SVG has the
 * origin at the top-left. This function translates the path up by 900 units and
 * scales the y-axis by -1 to invert it.
 *
 * This is its own invertible transformation, so it can be used to convert back
 * and forth between TTF and SVG coordinate spaces.
 */
export function transformArphicSpaceSvgPath(d: string): string {
  return new SVGPathCommander(d)
    .transform({
      origin: [0, 0],
      translate: [0, 900],
      scale: [1, -1],
    })
    .toString();
}
