// pyly-not-src-test
import { evaluateHanziCharacterWritingAcceptance } from "#data/questions/hanziCharacterWriting.ts";
import type { HanziCharacter } from "#data/model.ts";
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
  const contrastiveCandidates = [{ hanzi: `入` as HanziCharacter, geometry }];
  const acceptance = evaluateHanziCharacterWritingAcceptance(
    geometry,
    contrastiveCandidates,
  );
  const diagnostic = createShapeContextGraderDiagnostic({
    fixtureId: `一-diagnostic-test`,
    targetCharacter: `一`,
    encodedDrawnStrokes: `100,150;900,150`,
    drawnStrokes,
    referencePaths,
    expectedAcceptance: true,
    acceptanceThreshold: 0.72,
    gradingDurationMs: 1,
    geometry,
    acceptance,
    contrastiveCandidates,
  });
  const serialized = JSON.stringify(diagnostic);
  const svg = renderShapeContextGraderDiagnosticSvg({
    fixtureId: diagnostic.fixtureId,
    targetCharacter: diagnostic.targetCharacter,
    drawnStrokes,
    referencePaths,
    geometry,
    acceptance,
    contrastiveCandidates,
    expectedAcceptance: true,
    acceptanceThreshold: 0.72,
  });
  const proportionalGeometry = {
    ...geometry,
    shapeCost: 6,
    weightedScoreContributions: {
      initialMatchingError: 4,
      residualMatchingError: 2,
      missingReferenceStrokePenalty: 0,
      extraHandwritingStrokePenalty: 0,
      emptyGeometryPenalty: 0,
    },
  };
  const proportionalAcceptance = evaluateHanziCharacterWritingAcceptance(
    proportionalGeometry,
    [],
  );
  const proportionalSvg = renderShapeContextGraderDiagnosticSvg({
    fixtureId: diagnostic.fixtureId,
    targetCharacter: diagnostic.targetCharacter,
    drawnStrokes,
    referencePaths,
    geometry: proportionalGeometry,
    acceptance: proportionalAcceptance,
    contrastiveCandidates: [],
    expectedAcceptance: true,
    acceptanceThreshold: 0.72,
  });
  const rectWidth = (dataAttribute: string): number => {
    const match = proportionalSvg.match(
      new RegExp(`<rect ${dataAttribute}[^>]*width="([^"]+)"`, `u`),
    );
    if (match?.[1] == null) {
      throw new Error(`Missing SVG rect for ${dataAttribute}`);
    }
    return Number(match[1]);
  };
  const initialMatchingWidth = rectWidth(
    `data-score-contribution="initialMatchingError"`,
  );
  const residualMatchingWidth = rectWidth(
    `data-score-contribution="residualMatchingError"`,
  );
  const contributionTrackWidth = rectWidth(`data-score-contribution-track=""`);

  expect(diagnostic.schemaVersion).toBe(19);
  expect(serialized).toContain(`"expectedAcceptance":true`);
  expect(serialized).toContain(`"acceptance":`);
  expect(serialized).toContain(`"strokeCompleteness":`);
  expect(diagnostic.actualAcceptance).toBe(false);
  expect(diagnostic.acceptance.contrastiveCheck).toMatchObject({
    ran: true,
    passed: false,
    metric: `shapeSimilarity`,
    comparisonOperator: `>`,
    requiredMargin: 0,
    rejectingCandidateCharacter: `入`,
  });
  expect(diagnostic.acceptance.strokeCompleteness).toMatchObject({
    passed: true,
    referenceStrokeCount: 1,
    matchedReferenceStrokeCount: 1,
    unmatchedReferenceStrokeCount: 0,
    unmatchedReferenceStrokeIndices: [],
  });
  expect(diagnostic.contrastiveCandidates[0]).toMatchObject({
    character: `入`,
    comparison: { evaluated: true, observedMargin: 0, passed: false },
  });
  expect(svg).toContain(`Contrastive acceptance check`);
  expect(svg).toContain(`Stroke-completeness check`);
  expect(svg).toContain(
    `data-stroke-completeness-reason="candidateShapeSimilarityNotLower"`,
  );
  expect(svg).not.toContain(`Legacy-similarity`);
  expect(svg).not.toContain(`Geometry coverage`);
  expect(svg).toContain(`data-contrastive-row="candidate"`);
  expect(svg).toContain(`FAIL (0.0000)`);
  expect(serialized).toContain(`"weightedScoreContributions"`);
  expect(serialized).not.toContain(`"transform":{}`);
  const diagnosticGeometry = diagnostic.algorithm.geometry;
  expect(diagnosticGeometry.sourceStrokes.flat()).toEqual(
    geometry.sourcePoints.map(({ x, y }) => [x, y]),
  );
  expect(diagnosticGeometry.sourceStrokes.map(({ length }) => length)).toEqual(
    geometry.sourceStrokes.map(({ length }) => length),
  );
  expect(diagnosticGeometry.targetStrokes.flat()).toEqual(
    geometry.targetPoints.map(({ x, y }) => [x, y]),
  );
  expect(diagnosticGeometry.targetStrokes.map(({ length }) => length)).toEqual(
    geometry.targetStrokes.map(({ length }) => length),
  );
  expect(diagnosticGeometry.transformedPoints).toEqual(
    geometry.transformedPoints.map(({ x, y }) => [x, y]),
  );
  expect(
    diagnosticGeometry.correspondences.map(({ targetPoint }) => targetPoint),
  ).toEqual(
    geometry.correspondences.map(({ targetPoint }) => [
      targetPoint.x,
      targetPoint.y,
    ]),
  );
  expect(diagnosticGeometry.transform.controlPoints).toEqual(
    geometry.transform.controlPoints.map(({ x, y }) => [x, y]),
  );
  expect(diagnosticGeometry.correspondences).toEqual(
    geometry.correspondences.map(
      ({
        sourceIndex,
        targetIndex,
        targetPoint,
        descriptorCost,
        initialDistance,
        residualDistance,
      }) => ({
        sourceIndex,
        targetIndex,
        targetPoint: [targetPoint.x, targetPoint.y],
        descriptorCost,
        initialDistance,
        residualDistance,
      }),
    ),
  );
  expect(diagnosticGeometry.strokePairCosts).toEqual(geometry.strokePairCosts);
  expect(diagnosticGeometry.strokeAssignments).toEqual(
    geometry.strokeAssignments,
  );
  expect(diagnosticGeometry.dtwAlignments).toEqual(geometry.dtwAlignments);
  expect(diagnosticGeometry.unmatchedSourceStrokeIndices).toEqual(
    geometry.unmatchedSourceStrokeIndices,
  );
  expect(diagnosticGeometry.unmatchedTargetStrokeIndices).toEqual(
    geometry.unmatchedTargetStrokeIndices,
  );
  expect(serialized).not.toContain(`"sourcePoints"`);
  expect(serialized).not.toContain(`"targetPoints"`);
  expect(serialized).not.toContain(`"sourceStrokeIndices"`);
  expect(serialized).not.toContain(`"targetStrokeIndices"`);
  expect(diagnosticGeometry.correspondences[0]).not.toHaveProperty(`cost`);
  expect(diagnosticGeometry).not.toHaveProperty(`similarity`);
  expect(diagnosticGeometry.transform).not.toHaveProperty(`bendingEnergy`);
  expect(diagnosticGeometry.transform).not.toHaveProperty(`affineDistortion`);
  expect(diagnosticGeometry.transform).not.toHaveProperty(`rotationDegrees`);
  expect(diagnostic.score.shapeCost).toBe(geometry.shapeCost);
  expect(diagnostic.score.shapeSimilarity).toBe(geometry.shapeSimilarity);
  expect(diagnostic.score.deformationAlpha).toBe(geometry.deformationAlpha);
  expect(diagnosticGeometry.weightedScoreContributions).toEqual(
    geometry.weightedScoreContributions,
  );
  for (const {
    sourceIndex,
    targetIndex,
  } of diagnosticGeometry.correspondences) {
    expect(diagnosticGeometry.transformedPoints[sourceIndex]).toBeDefined();
    expect(diagnosticGeometry.targetStrokes.flat()[targetIndex]).toBeDefined();
  }
  for (const index of diagnosticGeometry.unmatchedSourceIndices) {
    expect(diagnosticGeometry.transformedPoints[index]).toBeDefined();
  }
  for (const index of diagnosticGeometry.unmatchedTargetIndices) {
    expect(diagnosticGeometry.targetStrokes.flat()[index]).toBeDefined();
  }
  expect(geometry.transform.bendingEnergy).toBe(geometry.bendingEnergy);
  expect(geometry.transform.affineDistortion).toBe(geometry.affineDistortion);
  expect(geometry.transform.rotationDegrees).toBe(geometry.rotationDegrees);
  const contributions = geometry.weightedScoreContributions;
  expect(geometry.shapeCost).toBeCloseTo(
    contributions.initialMatchingError +
      contributions.residualMatchingError +
      contributions.missingReferenceStrokePenalty +
      contributions.extraHandwritingStrokePenalty +
      contributions.emptyGeometryPenalty,
    12,
  );

  const emptyGeometry = gradeCharacterShape([], referencePaths);
  const emptyContributions = emptyGeometry.weightedScoreContributions;
  expect(emptyGeometry.shapeCost).toBeCloseTo(
    emptyContributions.initialMatchingError +
      emptyContributions.residualMatchingError +
      emptyContributions.missingReferenceStrokePenalty +
      emptyContributions.extraHandwritingStrokePenalty +
      emptyContributions.emptyGeometryPenalty,
    12,
  );
  expect(emptyContributions.emptyGeometryPenalty).toBeGreaterThan(0);
  expect(svg).toContain(`Raw handwriting`);
  expect(svg).toContain(`Reference geometry`);
  expect(svg).toContain(`Normalized source before TPS`);
  expect(svg).toContain(`TPS registration`);
  expect(svg).toContain(`Weighted score contributions (share of total cost)`);
  expect(svg).toContain(`Initial matching error`);
  expect(svg).toContain(`Empty geometry penalty`);
  expect(svg).toContain(`DTW alignment cost heatmaps`);
  expect(svg).toContain(`data-dtw-cost-cell=""`);
  expect(svg).toContain(`data-dtw-proportional-diagonal="forward"`);
  expect(svg).toContain(`data-dtw-path-segment="diagonal"`);
  expect(svg).toContain(`<linearGradient id="dtw-cost-gradient-0">`);
  expect(svg).toContain(`M 100 150 L 900 150`);
  expect(svg).toMatch(/width="1024" height="\d+" viewBox="0 0 1024 \d+"/u);
  expect(svg).toContain(`<rect x="0.5" y="0.5" width="511" height="511"`);
  expect(svg).toContain(`<rect x="512.5" y="0.5" width="511" height="511"`);
  expect(svg).toContain(`<rect x="0.5" y="576.5" width="1023" height="1023"`);
  expect(svg).toContain(`<text x="512" y="1624" text-anchor="middle">`);
  expect(initialMatchingWidth / residualMatchingWidth).toBeCloseTo(2, 3);
  expect(initialMatchingWidth + residualMatchingWidth).toBeCloseTo(
    contributionTrackWidth,
    2,
  );

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

test(`reports each hard stroke-completeness rejection reason`, () => {
  const referencePaths = [`M 0 0 L 100 0`, `M 0 40 L 100 40`];
  const completeGeometry = gradeCharacterShape(
    [
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      [
        { x: 0, y: 40 },
        { x: 100, y: 40 },
      ],
    ],
    referencePaths,
  );
  const lowSimilarityGeometry = {
    ...completeGeometry,
    shapeSimilarity: 0.1,
  };
  const lowSimilarityAcceptance = evaluateHanziCharacterWritingAcceptance(
    lowSimilarityGeometry,
    [],
  );
  expect(lowSimilarityAcceptance.rejectionCondition).toBe(
    `primaryShapeThresholdFailed`,
  );

  const contrastiveAcceptance = evaluateHanziCharacterWritingAcceptance(
    completeGeometry,
    [{ hanzi: `二` as HanziCharacter, geometry: completeGeometry }],
  );
  expect(contrastiveAcceptance.rejectionCondition).toBe(
    `candidateShapeSimilarityNotLower`,
  );

  const incompleteGeometry = gradeCharacterShape(
    [
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
    ],
    referencePaths,
  );
  const incompleteAcceptance = evaluateHanziCharacterWritingAcceptance(
    incompleteGeometry,
    [],
  );
  expect(incompleteAcceptance).toMatchObject({
    strokeCompleteness: {
      passed: false,
      referenceStrokeCount: 2,
      matchedReferenceStrokeCount: 1,
      unmatchedReferenceStrokeCount: 1,
      unmatchedReferenceStrokeIndices: [0],
    },
    rejectionCondition: `missingReferenceStroke`,
    finalAccepted: false,
  });
});
