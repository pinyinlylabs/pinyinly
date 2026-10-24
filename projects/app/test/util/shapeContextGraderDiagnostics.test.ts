// pyly-not-src-test
import { gradeCharacterShape } from "#util/shapeContextGrader.ts";
import {
  createShapeContextGraderDiagnostic,
  renderShapeContextGraderDiagnosticSvg,
} from "#test/util/shapeContextGraderDiagnostics.ts";
import { expect, test } from "vitest";

test(`serializes grader diagnostics and keeps raw geometry visible in SVG`, () => {
  const drawnStrokes = [
    [
      { x: 100, y: 150 },
      { x: 900, y: 800 },
    ],
  ];
  const referencePaths = [`M 100 150 L 900 800`];
  const geometry = gradeCharacterShape(drawnStrokes, referencePaths);
  const diagnostic = createShapeContextGraderDiagnostic({
    fixtureId: `一-diagnostic-test`,
    targetCharacter: `一`,
    encodedDrawnStrokes: `100,150;900,800`,
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
  expect(svg).toContain(`Raw handwriting`);
  expect(svg).toContain(`Reference geometry`);
  expect(svg).toContain(`Normalized source before TPS`);
  expect(svg).toContain(`TPS registration`);
  expect(svg).toContain(`M 100 150 L 900 800`);
});
