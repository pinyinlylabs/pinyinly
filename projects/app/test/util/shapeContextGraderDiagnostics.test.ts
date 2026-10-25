// pyly-not-src-test
import { gradeCharacterShape } from "#util/shapeContextGrader.ts";
import {
  createShapeContextGraderDiagnostic,
  renderShapeContextGraderDiagnosticSvg,
} from "#test/util/shapeContextGraderDiagnostics.ts";
import { expect, test } from "vitest";

function svgPathBounds(
  svg: string,
  pathPattern: RegExp,
): { minX: number; minY: number; maxX: number; maxY: number } {
  const coordinates = [...svg.matchAll(pathPattern)].flatMap((match) =>
    [...(match[1] ?? ``).matchAll(/-?\d+(?:\.\d+)?/gu)].map((number) =>
      Number(number[0]),
    ),
  );
  const xCoordinates = coordinates.filter((_, index) => index % 2 === 0);
  const yCoordinates = coordinates.filter((_, index) => index % 2 === 1);
  return {
    minX: Math.min(...xCoordinates),
    minY: Math.min(...yCoordinates),
    maxX: Math.max(...xCoordinates),
    maxY: Math.max(...yCoordinates),
  };
}

test(`serializes grader diagnostics and keeps raw geometry visible in SVG`, () => {
  const drawnStrokes = [
    [
      { x: 100, y: 150 },
      { x: 900, y: 150 },
    ],
  ];
  const referencePaths = [`M 100 150 L 900 150`];
  const geometry = gradeCharacterShape(drawnStrokes, referencePaths);
  const diagnostic = createShapeContextGraderDiagnostic({
    fixtureId: `一-diagnostic-test`,
    targetCharacter: `一`,
    encodedDrawnStrokes: `100,150;900,150`,
    drawnStrokes,
    referencePaths,
    expectedAcceptance: true,
    actualAcceptance: true,
    acceptanceThreshold: 0.72,
    gradingDurationMs: 1,
    geometry,
    contrastiveCandidates: [],
  });
  const serialized = JSON.stringify(diagnostic);
  const svg = renderShapeContextGraderDiagnosticSvg({
    fixtureId: diagnostic.fixtureId,
    targetCharacter: diagnostic.targetCharacter,
    drawnStrokes,
    referencePaths,
    geometry,
    expectedAcceptance: true,
    actualAcceptance: true,
    acceptanceThreshold: 0.72,
  });

  expect(serialized).toContain(`"schemaVersion":1`);
  expect(serialized).toContain(`"expectedAcceptance":true`);
  expect(serialized).toContain(`"weightedScoreContributions"`);
  expect(serialized).not.toContain(`"transform":{}`);
  expect(geometry.combinedCost).toBe(
    geometry.initialMatchingError * 0.25 +
      geometry.residualMatchingError * 0.35 +
      geometry.bendingEnergy * 0.04 +
      geometry.affineDistortion * 0.15 +
      geometry.rotationPenalty * 0.4 +
      geometry.unmatchedPointPenalty * 0.5 +
      geometry.geometryCoveragePenalty,
  );
  const contributions = geometry.weightedScoreContributions;
  expect(
    contributions.initialMatchingError +
      contributions.residualMatchingError +
      contributions.bendingEnergy +
      contributions.affineDistortion +
      contributions.rotationPenalty +
      contributions.unmatchedPointPenalty +
      contributions.geometryCoveragePenalty +
      contributions.emptyGeometryPenalty,
  ).toBeCloseTo(geometry.combinedCost, 12);

  const emptyGeometry = gradeCharacterShape([], referencePaths);
  const emptyContributions = emptyGeometry.weightedScoreContributions;
  expect(
    emptyContributions.initialMatchingError +
      emptyContributions.residualMatchingError +
      emptyContributions.bendingEnergy +
      emptyContributions.affineDistortion +
      emptyContributions.rotationPenalty +
      emptyContributions.unmatchedPointPenalty +
      emptyContributions.geometryCoveragePenalty +
      emptyContributions.emptyGeometryPenalty,
  ).toBeCloseTo(emptyGeometry.combinedCost, 12);
  expect(emptyContributions.emptyGeometryPenalty).toBeGreaterThan(0);
  expect(svg).toContain(`Raw handwriting`);
  expect(svg).toContain(`Reference geometry`);
  expect(svg).toContain(`Normalized source before TPS`);
  expect(svg).toContain(`TPS registration`);
  expect(svg).toContain(`M 100 150 L 900 150`);

  const normalizedSourceBounds = svgPathBounds(
    svg,
    /<path d="([^"]+)" fill="none" stroke="#159fe8" stroke-width="3" stroke-dasharray/gu,
  );
  const normalizedGridBounds = svgPathBounds(
    svg,
    /<path d="([^"]+)" fill="none" stroke="#94a3b8" stroke-width="1"/gu,
  );
  expect(Math.max(...geometry.sourcePoints.map(({ x }) => x))).toBeGreaterThan(
    1,
  );
  expect(normalizedGridBounds.minX).toBeLessThan(normalizedSourceBounds.minX);
  expect(normalizedGridBounds.maxX).toBeGreaterThan(
    normalizedSourceBounds.maxX,
  );
  expect(normalizedGridBounds.minY).toBeLessThan(normalizedSourceBounds.minY);
  expect(normalizedGridBounds.maxY).toBeGreaterThan(
    normalizedSourceBounds.maxY,
  );
});
