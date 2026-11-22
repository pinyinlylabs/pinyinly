import { mkdir, readFile, writeFile } from "@pinyinly/lib/fs";
import path from "node:path";
import { z } from "zod";
import { hanziCharacterSchema } from "#data/model.ts";
import {
  evaluateHanziCharacterWritingAcceptance,
  gradeSimilarCharacters,
  hanziCharacterWritingSimilarityThreshold,
  isHanziCharacterWritingAccepted,
} from "#data/questions/hanziCharacterWriting.ts";
import type {
  HanziCharacterWritingAcceptanceDecision,
  SimilarCharacterReference,
} from "#data/questions/hanziCharacterWriting.ts";
import {
  calculateShapeContextSustainedTangentRegions,
  gradeCharacterShape,
  extractReferenceStrokeSegment,
  extractWritingStrokeSegment,
  measureStrokeDirection,
  limitWritingStrokes,
  maxWritingPointCount,
  maxWritingStrokeCount,
  shapeContextGraderDefaults,
} from "#util/shapeContextGrader.ts";
import type {
  WritingStrokePoint,
  WritingIssue,
  WritingIssueExpectation,
} from "#util/shapeContextGrader.ts";
import type { ShapeContextGraderExample } from "#util/shapeContextGraderExample.ts";
import {
  calculateShapeContextStrokeGeometryDiagnostics,
  calculateShapeContextTerminalHookDiagnostics,
  calculateShapeContextTrajectoryDiagnostics,
  createShapeContextGraderDiagnostic,
  diagnoseShapeContextStrokePresence,
  evaluateWritingIssueExpectations,
  renderShapeContextGraderDiagnosticSvg,
} from "#test/util/shapeContextGraderDiagnostics.ts";
import { writeTerminalHookFixtureCsv } from "#test/util/shapeContextGraderFixtureReporting.ts";
import {
  decodeShapeContextStrokes,
  encodeShapeContextStrokes,
  parseShapeContextGraderExampleFragment,
  parseShapeContextGraderExampleJson,
  shapeContextGraderExampleCharacter,
  serializeShapeContextGraderExample,
  shapeContextGraderExampleFragment,
} from "#util/shapeContextGraderExample.ts";
import { transformArphicSpaceSvgPath } from "#util/svgFont.ts";
import { chromium } from "playwright";
import SVGPathCommander from "svg-path-commander";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import type { TestContext } from "vitest";
import type { Browser } from "playwright";

const handwritingDiagnoseMode =
  process.env[`PYLY_HANDWRITING_DIAGNOSE`] === `1`;
type ShapeContextGraderTestExample = ShapeContextGraderExample & {
  fails?: boolean;
  expectedIssues?: WritingIssueExpectation[];
  unexpectedIssues?: WritingIssueExpectation[];
};

type HandwritingEvaluationRecord = {
  id: string;
  character: string;
  drawnStrokes: WritingStrokePoint[][];
  referencePaths: string[];
  geometry: ReturnType<typeof gradeCharacterShape>;
  expectedAcceptance: boolean;
  actualAcceptance: boolean;
  rejectionCondition: HanziCharacterWritingAcceptanceDecision[`rejectionCondition`];
  shapeCost: number;
  shapeSimilarity: number;
  deformationAlpha: number;
  initialMatchingError: number;
  residualMatchingError: number;
  sampleCount: number;
  durationMs: number;
  rotationDegrees: number;
  weightedScoreContributions: ReturnType<
    typeof gradeCharacterShape
  >[`weightedScoreContributions`];
  strokeAssignments: ReturnType<
    typeof gradeCharacterShape
  >[`strokeAssignments`];
  referenceStrokeCount: number;
  handwritingStrokeCount: number;
  matchedReferenceStrokeCount: number;
  unmatchedReferenceStrokeCount: number;
  unmatchedHandwritingStrokeCount: number;
  unmatchedReferenceStrokeIndices: number[];
  unmatchedHandwritingStrokeIndices: number[];
  unmatchedReferenceArcLengthFraction: number;
  unmatchedHandwritingArcLengthFraction: number;
  missingReferenceStrokeFraction: number;
  extraHandwritingStrokeFraction: number;
  acceptance: HanziCharacterWritingAcceptanceDecision;
  issues: WritingIssue[];
  issueExpectations: ReturnType<typeof evaluateWritingIssueExpectations>;
  contrastiveCandidates: Array<{
    character: string;
    shapeSimilarity: number;
    deformationAlpha: number;
    comparison: HanziCharacterWritingAcceptanceDecision[`contrastiveCheck`][`candidates`][number];
  }>;
  strokeGeometry: ReturnType<
    typeof calculateShapeContextStrokeGeometryDiagnostics
  >;
  trajectory: ReturnType<typeof calculateShapeContextTrajectoryDiagnostics>;
  originalStrokeGeometry: ReturnType<
    typeof calculateShapeContextStrokeGeometryDiagnostics
  >;
  originalTrajectory: ReturnType<
    typeof calculateShapeContextTrajectoryDiagnostics
  >;
  terminalHooks: ReturnType<
    typeof calculateShapeContextTerminalHookDiagnostics
  >;
  matchedStrokeCount: number;
  originalMatchedStrokeCount: number;
  issueAwareMatchedStrokeCount: number;
  excludedReversedStrokeCount: number;
};

const handwritingEvaluationRecords: HandwritingEvaluationRecord[] = [];
let diagnosticBrowser: Browser | undefined;
const handwritingReviewDirectory = path.resolve(
  process.cwd(),
  `.vitest/handwriting-review`,
);
const sustainedMismatchReportIds = new Set([
  `师-1792978725612`,
  `停-1793117596216`,
  `短-1792983292286`,
  `图-1792983175327`,
  `鱼-1792714248657`,
  `好-20261018150011`,
  `请-1793667896558`,
  `请-1792983162689`,
  `百-1792851609147`,
  `饿-1794480186144`,
  `我-1793338521366`,
  `发-1792657992672`,
]);

function artifactName(id: string): string {
  return encodeURIComponent(id).replaceAll(`%`, `_`);
}

function diagnosticPngPath(id: string): string {
  return path.join(
    handwritingReviewDirectory,
    `diagnostics`,
    `${artifactName(id)}.png`,
  );
}

function escapeManualReviewXml(value: string): string {
  return value
    .replaceAll(`&`, `&amp;`)
    .replaceAll(`<`, `&lt;`)
    .replaceAll(`>`, `&gt;`)
    .replaceAll(`"`, `&quot;`)
    .replaceAll(`'`, `&apos;`);
}

function manualReviewPolylinePath(
  points: readonly WritingStrokePoint[],
  mapPoint: (point: WritingStrokePoint) => WritingStrokePoint,
): string {
  return points
    .map((point, index) => {
      const mapped = mapPoint(point);
      return `${index === 0 ? `M` : `L`} ${mapped.x.toFixed(2)} ${mapped.y.toFixed(2)}`;
    })
    .join(` `);
}

function manualReviewBounds(
  strokes: readonly (readonly WritingStrokePoint[])[],
): { minX: number; minY: number; maxX: number; maxY: number } {
  const points = strokes.flat();
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100 };
  }
  let minX = points[0]!.x;
  let minY = points[0]!.y;
  let maxX = points[0]!.x;
  let maxY = points[0]!.y;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return { minX, minY, maxX, maxY };
}

async function generateTerminalHookManualReview(
  records: readonly HandwritingEvaluationRecord[],
): Promise<{
  reviewDirectory: string;
  distinctReferenceStrokeCount: number;
  observationCount: number;
  sheetCount: number;
  annotationPath: string;
  indexPath: string;
}> {
  const reviewDirectory = path.join(
    handwritingReviewDirectory,
    `terminal-hook-manual-review`,
  );
  await mkdir(reviewDirectory, { recursive: true });
  const observations = records.flatMap((record) =>
    record.terminalHooks.pairs
      .filter(
        (pair) =>
          pair.observation ===
            `reference-hook-present-handwriting-hook-missing` ||
          pair.observation ===
            `reference-hook-present-handwriting-hook-malformed`,
      )
      .map((pair) => ({ record, pair })),
  );
  const groups = new Map<
    string,
    Array<{
      record: HandwritingEvaluationRecord;
      pair: (typeof observations)[number][`pair`];
    }>
  >();
  for (const observation of observations) {
    const key = `${observation.record.character}|${observation.pair.referenceStrokeIndex}`;
    const group = groups.get(key) ?? [];
    group.push(observation);
    groups.set(key, group);
  }

  const annotationLabels = [
    `genuine-missing-hook`,
    `malformed-hook`,
    `acceptable-hook-variation`,
    `reference-artifact-not-a-meaningful-hook`,
    `uncertain`,
  ] as const;
  const annotationObservations = observations.map(({ record, pair }) => ({
    fixtureId: record.id,
    character: record.character,
    handwritingStrokeIndex: pair.handwritingStrokeIndex,
    referenceStrokeIndex: pair.referenceStrokeIndex,
    expectedAcceptance: record.expectedAcceptance,
    actualAcceptance: record.actualAcceptance,
    detector: {
      observation: pair.observation,
      referenceTurnDegrees: pair.reference.terminalTurnDegrees,
      referenceTerminalLengthFraction:
        pair.reference.terminalSegmentLengthFraction,
      referenceTerminalStartFraction:
        pair.reference.terminalSegmentStartFraction,
      referenceClassification: pair.reference.classification,
      handwritingTurnDegrees: pair.handwriting.terminalTurnDegrees,
      handwritingTerminalLengthFraction:
        pair.handwriting.terminalSegmentLengthFraction,
      handwritingTerminalStartFraction:
        pair.handwriting.terminalSegmentStartFraction,
      handwritingClassification: pair.handwriting.classification,
    },
    annotation: {
      label: null as (typeof annotationLabels)[number] | null,
      notes: ``,
    },
  }));

  const sheetNames: string[] = [];
  for (const [key, group] of [...groups.entries()].sort((left, right) =>
    left[0].localeCompare(right[0]),
  )) {
    const keyParts = key.split(`|`);
    const character = keyParts[0] ?? ``;
    const referenceIndex = Number(keyParts[1] ?? 0);
    const record = group[0]!.record;
    const referencePath = record.referencePaths[referenceIndex];
    const referencePoints =
      referencePath == null ? [] : (pointsForPaths([referencePath])[0] ?? []);
    const handwritingStrokes = group.map(
      ({ record: exampleRecord, pair }) =>
        exampleRecord.drawnStrokes[pair.handwritingStrokeIndex] ?? [],
    );
    const bounds = manualReviewBounds([referencePoints, ...handwritingStrokes]);
    const paddingX = Math.max(1, (bounds.maxX - bounds.minX) * 0.08);
    const paddingY = Math.max(1, (bounds.maxY - bounds.minY) * 0.08);
    const viewMinX = bounds.minX - paddingX;
    const viewMinY = bounds.minY - paddingY;
    const viewWidth = bounds.maxX - bounds.minX + paddingX * 2;
    const viewHeight = bounds.maxY - bounds.minY + paddingY * 2;
    const cardWidth = 380;
    const cardHeight = 250;
    const cardColumns = 2;
    const exampleRows = Math.max(1, Math.ceil(group.length / cardColumns));
    const sheetHeight = 150 + (exampleRows + 1) * cardHeight;
    const mapPoint =
      (cardX: number, cardY: number) =>
      (point: WritingStrokePoint): WritingStrokePoint => ({
        x: cardX + ((point.x - viewMinX) / viewWidth) * (cardWidth - 30) + 15,
        y: cardY + ((point.y - viewMinY) / viewHeight) * (cardHeight - 55) + 25,
      });
    const sheetName = `${artifactName(`${character}-R${referenceIndex + 1}`)}.svg`;
    sheetNames.push(sheetName);
    const referenceCardX = 20;
    const referenceCardY = 110;
    const referenceCard = [
      `<rect x="${referenceCardX}" y="${referenceCardY}" width="${cardWidth}" height="${cardHeight}" fill="#f8fafc" stroke="#94a3b8"/>`,
      `<text x="${referenceCardX + 15}" y="${referenceCardY + 18}" font-size="15" font-weight="600">Reference R${referenceIndex + 1}</text>`,
      `<path d="${manualReviewPolylinePath(referencePoints, mapPoint(referenceCardX, referenceCardY))}" fill="none" stroke="#334155" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,
    ].join(``);
    const exampleCards = group
      .map(({ record: exampleRecord, pair }, index) => {
        const column = index % cardColumns;
        const row = Math.floor(index / cardColumns);
        const cardX = 400 + column * cardWidth;
        const cardY = 110 + row * cardHeight;
        const handwritingPoints =
          exampleRecord.drawnStrokes[pair.handwritingStrokeIndex] ?? [];
        const terminalLengthIndex = Math.round(
          pair.handwriting.terminalSegmentStartFraction *
            Math.max(1, handwritingPoints.length - 1),
        );
        const terminalPoints = handwritingPoints.slice(
          Math.max(0, terminalLengthIndex),
        );
        const map = mapPoint(cardX, cardY);
        const terminalPath =
          terminalPoints.length === 0
            ? ``
            : `<path d="${manualReviewPolylinePath(terminalPoints, map)}" fill="none" stroke="#7c3aed" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>`;
        const detectorLabel =
          pair.observation === `reference-hook-present-handwriting-hook-missing`
            ? `detector: missing`
            : `detector: malformed`;
        return [
          `<rect x="${cardX}" y="${cardY}" width="${cardWidth}" height="${cardHeight}" fill="#fff" stroke="#94a3b8"/>`,
          `<text x="${cardX + 15}" y="${cardY + 18}" font-size="14" font-weight="600">${escapeManualReviewXml(exampleRecord.id)} · H${pair.handwritingStrokeIndex + 1}</text>`,
          `<path d="${manualReviewPolylinePath(handwritingPoints, map)}" fill="none" stroke="#159fe8" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>`,
          terminalPath,
          `<text x="${cardX + 15}" y="${cardY + cardHeight - 42}" font-size="11">${escapeManualReviewXml(detectorLabel)}</text>`,
          `<text x="${cardX + 15}" y="${cardY + cardHeight - 28}" font-size="11">Ref turn ${pair.reference.terminalTurnDegrees.toFixed(1)}° · Ref length ${(pair.reference.terminalSegmentLengthFraction * 100).toFixed(1)}%</text>`,
          `<text x="${cardX + 15}" y="${cardY + cardHeight - 14}" font-size="11">Hand turn ${pair.handwriting.terminalTurnDegrees.toFixed(1)}° · Hand length ${(pair.handwriting.terminalSegmentLengthFraction * 100).toFixed(1)}%</text>`,
        ].join(``);
      })
      .join(``);
    const sheet = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${sheetHeight}" viewBox="0 0 1200 ${sheetHeight}">`,
      `<rect width="1200" height="${sheetHeight}" fill="#fff"/>`,
      `<text x="20" y="38" font-size="24" font-weight="700">Terminal-hook manual review: ${escapeManualReviewXml(character)} · Reference R${referenceIndex + 1}</text>`,
      `<text x="20" y="62" font-size="12">Detector observations are visual context only. Leave manual annotation labels null until reviewed.</text>`,
      `<text x="20" y="82" font-size="12">${observations.length} observations · ${groups.size} distinct reference strokes · ${group.length} examples on this sheet</text>`,
      referenceCard,
      exampleCards,
      `</svg>`,
    ].join(``);
    await writeFile(path.join(reviewDirectory, sheetName), sheet);
  }

  const annotationPath = path.join(
    handwritingReviewDirectory,
    `terminal-hook-manual-review.json`,
  );
  await writeFile(
    annotationPath,
    JSON.stringify(
      {
        schemaVersion: 1,
        annotationLabels: annotationLabels,
        observations: annotationObservations,
      },
      null,
      2,
    ),
  );

  const indexPath = path.join(
    handwritingReviewDirectory,
    `terminal-hook-manual-review.html`,
  );
  const sheetLinks = sheetNames
    .map(
      (sheetName) =>
        `<li><a href="./terminal-hook-manual-review/${encodeURIComponent(sheetName)}">${escapeManualReviewXml(sheetName)}</a></li>`,
    )
    .join(``);
  await writeFile(
    indexPath,
    [
      `<!doctype html>`,
      `<html><head><meta charset="utf-8"><title>Terminal-hook manual review</title></head><body>`,
      `<h1>Terminal-hook manual review</h1>`,
      `<p>${observations.length} observations across ${groups.size} distinct character/reference-stroke groups.</p>`,
      `<p>Annotation labels: ${annotationLabels.join(`, `)}</p>`,
      `<p>Manual labels are stored separately in <code>terminal-hook-manual-review.json</code>. Detector classifications are not ground truth.</p>`,
      `<ul>${sheetLinks}</ul>`,
      `</body></html>`,
    ].join(``),
  );

  return {
    reviewDirectory,
    distinctReferenceStrokeCount: groups.size,
    observationCount: observations.length,
    sheetCount: sheetNames.length,
    annotationPath,
    indexPath,
  };
}

beforeAll(async () => {
  if (handwritingDiagnoseMode) {
    diagnosticBrowser = await chromium.launch();
  }
});

afterAll(async () => {
  if (!handwritingDiagnoseMode) {
    await diagnosticBrowser?.close();
    return;
  }

  if (diagnosticBrowser == null) {
    throw new Error(`Handwriting diagnostics browser was not initialized`);
  }

  try {
    const counts = {
      truePositives: handwritingEvaluationRecords.filter(
        ({ expectedAcceptance, actualAcceptance }) =>
          expectedAcceptance && actualAcceptance,
      ).length,
      trueNegatives: handwritingEvaluationRecords.filter(
        ({ expectedAcceptance, actualAcceptance }) =>
          !expectedAcceptance && !actualAcceptance,
      ).length,
      falsePositives: handwritingEvaluationRecords.filter(
        ({ expectedAcceptance, actualAcceptance }) =>
          !expectedAcceptance && actualAcceptance,
      ).length,
      falseNegatives: handwritingEvaluationRecords.filter(
        ({ expectedAcceptance, actualAcceptance }) =>
          expectedAcceptance && !actualAcceptance,
      ).length,
    };
    const csvEscape = (value: string | number | boolean): string =>
      `"${String(value).replaceAll(`"`, `""`)}"`;
    const csvHeader = [
      `fixture_id`,
      `character`,
      `expected_acceptance`,
      `actual_acceptance`,
      `shape_similarity`,
      `original_matched_strokes`,
      `issue_aware_matched_strokes`,
      `excluded_reversed_strokes`,
      `original_mean_stroke_error`,
      `issue_aware_mean_stroke_error`,
      `original_maximum_stroke_error`,
      `issue_aware_maximum_stroke_error`,
      `original_p90_stroke_error`,
      `issue_aware_p90_stroke_error`,
      `original_arc_weighted_mean_stroke_error`,
      `issue_aware_arc_weighted_mean_stroke_error`,
      `original_fraction_exceeding_0.1`,
      `issue_aware_fraction_exceeding_0.1`,
      `original_fraction_exceeding_0.15`,
      `issue_aware_fraction_exceeding_0.15`,
      `original_fraction_exceeding_0.2`,
      `issue_aware_fraction_exceeding_0.2`,
      `original_fraction_exceeding_0.25`,
      `issue_aware_fraction_exceeding_0.25`,
      `original_fraction_exceeding_0.3`,
      `issue_aware_fraction_exceeding_0.3`,
      `original_maximum_stroke_tangent_mismatch`,
      `issue_aware_maximum_stroke_tangent_mismatch`,
      `original_p90_stroke_tangent_mismatch`,
      `issue_aware_p90_stroke_tangent_mismatch`,
      `original_mean_stroke_tangent_mismatch`,
      `issue_aware_mean_stroke_tangent_mismatch`,
      `original_unmatched_handwriting_bends`,
      `issue_aware_unmatched_handwriting_bends`,
      `original_unmatched_reference_bends`,
      `issue_aware_unmatched_reference_bends`,
      `worst_point_distance_pair`,
      `worst_tangent_mismatch_pair`,
      `worst_mean_point_distance_pair`,
      `worst_p90_point_distance_pair`,
      `worst_mean_tangent_mismatch_pair`,
      `worst_p90_tangent_mismatch_pair`,
    ].join(`,`);
    const csvRows = handwritingEvaluationRecords.map((record) => {
      const worstPointStroke =
        record.originalStrokeGeometry.individualStrokes[0];
      const worstTangentStroke = record.originalTrajectory.individualStrokes[0];
      const worstPointPair =
        worstPointStroke == null
          ? ``
          : `H${worstPointStroke.handwritingStrokeIndex + 1}/R${worstPointStroke.referenceStrokeIndex + 1}:${worstPointStroke.maximumPointDistance.toFixed(4)}`;
      const worstTangentPair =
        worstTangentStroke == null
          ? ``
          : `H${worstTangentStroke.handwritingStrokeIndex + 1}/R${worstTangentStroke.referenceStrokeIndex + 1}:${worstTangentStroke.maximumTangentMismatchDegrees.toFixed(2)}deg`;
      const worstMeanPointStroke = [
        ...record.originalStrokeGeometry.individualStrokes,
      ].sort(
        (left, right) => right.meanPointDistance - left.meanPointDistance,
      )[0];
      const worstP90PointStroke = [
        ...record.originalStrokeGeometry.individualStrokes,
      ].sort(
        (left, right) => right.p90PointDistance - left.p90PointDistance,
      )[0];
      const worstMeanTangentStroke = [
        ...record.originalTrajectory.individualStrokes,
      ].sort(
        (left, right) =>
          right.meanTangentMismatchDegrees - left.meanTangentMismatchDegrees,
      )[0];
      const worstP90TangentStroke = [
        ...record.originalTrajectory.individualStrokes,
      ].sort(
        (left, right) =>
          right.p90TangentMismatchDegrees - left.p90TangentMismatchDegrees,
      )[0];
      const worstMeanPointPair =
        worstMeanPointStroke == null
          ? ``
          : `H${worstMeanPointStroke.handwritingStrokeIndex + 1}/R${worstMeanPointStroke.referenceStrokeIndex + 1}:${worstMeanPointStroke.meanPointDistance.toFixed(4)}`;
      const worstP90PointPair =
        worstP90PointStroke == null
          ? ``
          : `H${worstP90PointStroke.handwritingStrokeIndex + 1}/R${worstP90PointStroke.referenceStrokeIndex + 1}:${worstP90PointStroke.p90PointDistance.toFixed(4)}`;
      const worstMeanTangentPair =
        worstMeanTangentStroke == null
          ? ``
          : `H${worstMeanTangentStroke.handwritingStrokeIndex + 1}/R${worstMeanTangentStroke.referenceStrokeIndex + 1}:${worstMeanTangentStroke.meanTangentMismatchDegrees.toFixed(2)}deg`;
      const worstP90TangentPair =
        worstP90TangentStroke == null
          ? ``
          : `H${worstP90TangentStroke.handwritingStrokeIndex + 1}/R${worstP90TangentStroke.referenceStrokeIndex + 1}:${worstP90TangentStroke.p90TangentMismatchDegrees.toFixed(2)}deg`;
      return [
        record.id,
        record.character,
        record.expectedAcceptance,
        record.actualAcceptance,
        record.shapeSimilarity,
        record.originalMatchedStrokeCount,
        record.issueAwareMatchedStrokeCount,
        record.excludedReversedStrokeCount,
        record.originalStrokeGeometry.meanStrokeError,
        record.strokeGeometry.meanStrokeError,
        record.originalStrokeGeometry.maximumStrokeError,
        record.strokeGeometry.maximumStrokeError,
        record.originalStrokeGeometry.p90StrokeError,
        record.strokeGeometry.p90StrokeError,
        record.originalStrokeGeometry.arcLengthWeightedMeanStrokeError,
        record.strokeGeometry.arcLengthWeightedMeanStrokeError,
        record.originalStrokeGeometry.strokeFractionsExceedingThreshold[`0.1`],
        record.strokeGeometry.strokeFractionsExceedingThreshold[`0.1`],
        record.originalStrokeGeometry.strokeFractionsExceedingThreshold[`0.15`],
        record.strokeGeometry.strokeFractionsExceedingThreshold[`0.15`],
        record.originalStrokeGeometry.strokeFractionsExceedingThreshold[`0.2`],
        record.strokeGeometry.strokeFractionsExceedingThreshold[`0.2`],
        record.originalStrokeGeometry.strokeFractionsExceedingThreshold[`0.25`],
        record.strokeGeometry.strokeFractionsExceedingThreshold[`0.25`],
        record.originalStrokeGeometry.strokeFractionsExceedingThreshold[`0.3`],
        record.strokeGeometry.strokeFractionsExceedingThreshold[`0.3`],
        record.originalTrajectory.maximumStrokeTangentMismatchDegrees,
        record.trajectory.maximumStrokeTangentMismatchDegrees,
        record.originalTrajectory.p90StrokeTangentMismatchDegrees,
        record.trajectory.p90StrokeTangentMismatchDegrees,
        record.originalTrajectory.meanStrokeTangentMismatchDegrees,
        record.trajectory.meanStrokeTangentMismatchDegrees,
        record.originalTrajectory.unmatchedHandwritingBendCount,
        record.trajectory.unmatchedHandwritingBendCount,
        record.originalTrajectory.unmatchedReferenceBendCount,
        record.trajectory.unmatchedReferenceBendCount,
        worstPointPair,
        worstTangentPair,
        worstMeanPointPair,
        worstP90PointPair,
        worstMeanTangentPair,
        worstP90TangentPair,
      ]
        .map(csvEscape)
        .join(`,`);
    });
    await mkdir(handwritingReviewDirectory, { recursive: true });
    await writeFile(
      path.join(handwritingReviewDirectory, `evaluation.csv`),
      [csvHeader, ...csvRows].join(`\n`),
    );
    const sustainedFixtureHeader = [
      `fixture_id`,
      `character`,
      `expected_acceptance`,
      `actual_acceptance`,
      `shape_similarity`,
      ...([30, 45, 60, 75, 90] as const).flatMap((thresholdDegrees) =>
        ([0.05, 0.1, 0.15, 0.2] as const).flatMap((minimumLength) => {
          const key =
            minimumLength === 0.05
              ? `0.05`
              : minimumLength === 0.1
                ? `0.1`
                : minimumLength === 0.15
                  ? `0.15`
                  : `0.2`;
          const prefix = `sustained_${thresholdDegrees}_${key}`;
          return [
            `${prefix}_max_length`,
            `${prefix}_max_total_fraction`,
            `${prefix}_stroke_count`,
            `${prefix}_worst_pair`,
          ];
        }),
      ),
    ].join(`,`);
    const sustainedFixtureRows = handwritingEvaluationRecords.map((record) =>
      [
        record.id,
        record.character,
        record.expectedAcceptance,
        record.actualAcceptance,
        record.shapeSimilarity,
        ...([30, 45, 60, 75, 90] as const).flatMap((thresholdDegrees) =>
          ([0.05, 0.1, 0.15, 0.2] as const).flatMap((minimumLength) => {
            const minimumKey =
              minimumLength === 0.05
                ? `0.05`
                : minimumLength === 0.1
                  ? `0.1`
                  : minimumLength === 0.15
                    ? `0.15`
                    : `0.2`;
            const thresholdKey = String(thresholdDegrees) as
              | `30`
              | `45`
              | `60`
              | `75`
              | `90`;
            const metric =
              record.trajectory.sustainedMismatch[thresholdKey][minimumKey];
            const worstPair =
              metric.worstHandwritingStrokeIndex == null ||
              metric.worstReferenceStrokeIndex == null
                ? ``
                : `H${metric.worstHandwritingStrokeIndex + 1}/R${metric.worstReferenceStrokeIndex + 1}`;
            return [
              metric.maximumSustainedMismatchLengthFraction,
              metric.maximumTotalMismatchFraction,
              metric.strokeCountWithSustainedMismatch,
              worstPair,
            ];
          }),
        ),
      ]
        .map(csvEscape)
        .join(`,`),
    );
    await writeFile(
      path.join(handwritingReviewDirectory, `sustained-evaluation.csv`),
      [sustainedFixtureHeader, ...sustainedFixtureRows].join(`\n`),
    );
    const sustainedStrokeHeader = [
      `fixture_id`,
      `character`,
      `handwriting_stroke_index`,
      `reference_stroke_index`,
      `direction`,
      ...([30, 45, 60, 75, 90] as const).flatMap((thresholdDegrees) =>
        ([0.05, 0.1, 0.15, 0.2] as const).flatMap((minimumLength) => {
          const minimumKey =
            minimumLength === 0.05
              ? `0.05`
              : minimumLength === 0.1
                ? `0.1`
                : minimumLength === 0.15
                  ? `0.15`
                  : `0.2`;
          const prefix = `sustained_${thresholdDegrees}_${minimumKey}`;
          return [
            `${prefix}_longest`,
            `${prefix}_total`,
            `${prefix}_region_count`,
            `${prefix}_regions`,
          ];
        }),
      ),
    ].join(`,`);
    const sustainedStrokeRows = handwritingEvaluationRecords.flatMap((record) =>
      record.trajectory.individualStrokes.map((stroke) =>
        [
          record.id,
          record.character,
          stroke.handwritingStrokeIndex,
          stroke.referenceStrokeIndex,
          stroke.direction,
          ...([30, 45, 60, 75, 90] as const).flatMap((thresholdDegrees) =>
            ([0.05, 0.1, 0.15, 0.2] as const).flatMap((minimumLength) => {
              const thresholdKey = String(thresholdDegrees) as
                | `30`
                | `45`
                | `60`
                | `75`
                | `90`;
              const minimumKey =
                minimumLength === 0.05
                  ? `0.05`
                  : minimumLength === 0.1
                    ? `0.1`
                    : minimumLength === 0.15
                      ? `0.15`
                      : `0.2`;
              const threshold = stroke.sustainedMismatch[thresholdKey];
              const metric =
                threshold.sustainedRegionsByMinimumLength[minimumKey];
              const regions = metric.regions
                .map(
                  (region) =>
                    `${region.startFraction.toFixed(4)}-${region.endFraction.toFixed(4)}`,
                )
                .join(`|`);
              return [
                metric.longestRegionLengthFraction,
                metric.totalMismatchFraction,
                metric.regionCount,
                regions,
              ];
            }),
          ),
        ]
          .map(csvEscape)
          .join(`,`),
      ),
    );
    await writeFile(
      path.join(handwritingReviewDirectory, `sustained-strokes.csv`),
      [sustainedStrokeHeader, ...sustainedStrokeRows].join(`\n`),
    );
    await writeTerminalHookFixtureCsv({
      reviewDirectory: handwritingReviewDirectory,
      records: handwritingEvaluationRecords,
    });
    console.warn(`PYLY_HANDWRITING_EVALUATION_CSV ${csvHeader}`);
    for (const row of csvRows) {
      console.warn(`PYLY_HANDWRITING_EVALUATION_CSV_ROW ${row}`);
    }

    const positiveRecords = handwritingEvaluationRecords.filter(
      ({ expectedAcceptance }) => expectedAcceptance,
    );
    const negativeRecords = handwritingEvaluationRecords.filter(
      ({ expectedAcceptance }) => !expectedAcceptance,
    );
    const average = (
      records: readonly (typeof handwritingEvaluationRecords)[number][],
      metric: (record: (typeof handwritingEvaluationRecords)[number]) => number,
    ): number => {
      if (records.length === 0) {
        return 0;
      }
      let total = 0;
      for (const record of records) {
        total += metric(record);
      }
      return total / records.length;
    };
    const thresholdSummary = ([0.1, 0.15, 0.2, 0.25, 0.3] as const).map(
      (threshold) => ({
        threshold,
        falsePositivesRejected: negativeRecords.filter(
          (record) =>
            record.strokeGeometry.meanStrokeError > threshold &&
            record.actualAcceptance,
        ).length,
        positiveFixturesRejected: positiveRecords.filter(
          (record) => record.strokeGeometry.meanStrokeError > threshold,
        ).length,
      }),
    );
    const metricSummary = (
      records: readonly (typeof handwritingEvaluationRecords)[number][],
    ) => ({
      count: records.length,
      meanStrokeError: average(
        records,
        (record) => record.strokeGeometry.meanStrokeError,
      ),
      maximumStrokeError: average(
        records,
        (record) => record.strokeGeometry.maximumStrokeError,
      ),
      p90StrokeError: average(
        records,
        (record) => record.strokeGeometry.p90StrokeError,
      ),
      maximumIndividualPointDistance: average(
        records,
        (record) => record.strokeGeometry.maximumIndividualPointDistance,
      ),
      arcLengthWeightedMeanStrokeError: average(
        records,
        (record) => record.strokeGeometry.arcLengthWeightedMeanStrokeError,
      ),
      meanStrokeTangentMismatchDegrees: average(
        records,
        (record) => record.trajectory.meanStrokeTangentMismatchDegrees,
      ),
      p90StrokeTangentMismatchDegrees: average(
        records,
        (record) => record.trajectory.p90StrokeTangentMismatchDegrees,
      ),
      maximumStrokeTangentMismatchDegrees: average(
        records,
        (record) => record.trajectory.maximumStrokeTangentMismatchDegrees,
      ),
      unmatchedHandwritingBendCount: average(
        records,
        (record) => record.trajectory.unmatchedHandwritingBendCount,
      ),
      unmatchedReferenceBendCount: average(
        records,
        (record) => record.trajectory.unmatchedReferenceBendCount,
      ),
    });
    const falsePositiveIds = new Set([
      `师-1792978725612`,
      `停-1793117596216`,
      `短-1792983292286`,
      `图-1792983175327`,
    ]);
    const acceptedNegativeRecords = negativeRecords.filter(
      ({ actualAcceptance }) => actualAcceptance,
    );
    const metricSweep = (
      metric: string,
      getValue: (
        record: (typeof handwritingEvaluationRecords)[number],
      ) => number,
      direction: `higher-is-bad` | `lower-is-bad`,
    ) => {
      const values = [
        ...new Set([0, 1, ...handwritingEvaluationRecords.map(getValue)]),
      ].sort((left, right) =>
        direction === `higher-is-bad` ? left - right : right - left,
      );
      const constraints = [0, 1, 2, 5] as const;
      return Object.fromEntries(
        constraints.map((constraint) => {
          let best:
            | {
                threshold: number;
                falsePositivesRejected: number;
                legitimatePositivesRejected: number;
                falsePositiveIds: string[];
                legitimatePositiveIds: string[];
              }
            | undefined;
          for (const threshold of values) {
            const rejectedFalsePositives =
              direction === `higher-is-bad`
                ? acceptedNegativeRecords.filter(
                    (record) => getValue(record) > threshold,
                  )
                : acceptedNegativeRecords.filter(
                    (record) => getValue(record) < threshold,
                  );
            const rejectedPositives =
              direction === `higher-is-bad`
                ? positiveRecords.filter(
                    (record) => getValue(record) > threshold,
                  )
                : positiveRecords.filter(
                    (record) => getValue(record) < threshold,
                  );
            if (
              rejectedPositives.length <= constraint &&
              (best == null ||
                rejectedFalsePositives.length > best.falsePositivesRejected ||
                (rejectedFalsePositives.length ===
                  best.falsePositivesRejected &&
                  rejectedPositives.length < best.legitimatePositivesRejected))
            ) {
              best = {
                threshold,
                falsePositivesRejected: rejectedFalsePositives.length,
                legitimatePositivesRejected: rejectedPositives.length,
                falsePositiveIds: rejectedFalsePositives.map(({ id }) => id),
                legitimatePositiveIds: rejectedPositives.map(({ id }) => id),
              };
            }
          }
          return [
            `<=${constraint}`,
            {
              metric,
              ...best,
            },
          ];
        }),
      );
    };
    const thresholdSweeps = {
      shapeSimilarity: metricSweep(
        `shape_similarity`,
        (record) => record.shapeSimilarity,
        `lower-is-bad`,
      ),
      originalMeanPointDistance: metricSweep(
        `original_mean_point_distance`,
        (record) => record.originalStrokeGeometry.meanStrokeError,
        `higher-is-bad`,
      ),
      issueAwareMeanPointDistance: metricSweep(
        `issue_aware_mean_point_distance`,
        (record) => record.strokeGeometry.meanStrokeError,
        `higher-is-bad`,
      ),
      originalMaxPointDistance: metricSweep(
        `original_max_point_distance`,
        (record) => record.originalStrokeGeometry.maximumStrokeError,
        `higher-is-bad`,
      ),
      issueAwareMaxPointDistance: metricSweep(
        `issue_aware_max_point_distance`,
        (record) => record.strokeGeometry.maximumStrokeError,
        `higher-is-bad`,
      ),
      originalMaxTangentMismatch: metricSweep(
        `original_max_tangent_mismatch`,
        (record) =>
          record.originalTrajectory.maximumStrokeTangentMismatchDegrees,
        `higher-is-bad`,
      ),
      issueAwareMaxTangentMismatch: metricSweep(
        `issue_aware_max_tangent_mismatch`,
        (record) => record.trajectory.maximumStrokeTangentMismatchDegrees,
        `higher-is-bad`,
      ),
      originalUnmatchedHandwritingBends: metricSweep(
        `original_unmatched_handwriting_bends`,
        (record) => record.originalTrajectory.unmatchedHandwritingBendCount,
        `higher-is-bad`,
      ),
      issueAwareUnmatchedHandwritingBends: metricSweep(
        `issue_aware_unmatched_handwriting_bends`,
        (record) => record.trajectory.unmatchedHandwritingBendCount,
        `higher-is-bad`,
      ),
      originalUnmatchedReferenceBends: metricSweep(
        `original_unmatched_reference_bends`,
        (record) => record.originalTrajectory.unmatchedReferenceBendCount,
        `higher-is-bad`,
      ),
      issueAwareUnmatchedReferenceBends: metricSweep(
        `issue_aware_unmatched_reference_bends`,
        (record) => record.trajectory.unmatchedReferenceBendCount,
        `higher-is-bad`,
      ),
    };
    const sustainedSweep = Object.fromEntries(
      ([30, 45, 60, 75, 90] as const).flatMap((thresholdDegrees) =>
        ([0.05, 0.1, 0.15, 0.2] as const).map((minimumLength) => {
          const thresholdKey = String(thresholdDegrees) as
            | `30`
            | `45`
            | `60`
            | `75`
            | `90`;
          const minimumKey =
            minimumLength === 0.05
              ? `0.05`
              : minimumLength === 0.1
                ? `0.1`
                : minimumLength === 0.15
                  ? `0.15`
                  : `0.2`;
          const getLongest = (
            record: (typeof handwritingEvaluationRecords)[number],
          ) =>
            record.trajectory.sustainedMismatch[thresholdKey][minimumKey]
              .maximumSustainedMismatchLengthFraction;
          return [
            `${thresholdDegrees}deg_${minimumKey}`,
            metricSweep(
              `sustained_${thresholdDegrees}deg_min_${minimumKey}_max_length`,
              getLongest,
              `higher-is-bad`,
            ),
          ];
        }),
      ),
    );
    console.warn(
      `PYLY_HANDWRITING_STROKE_GEOMETRY_SUMMARY ${JSON.stringify({
        positive: metricSummary(positiveRecords),
        negative: metricSummary(negativeRecords),
        meanStrokeErrorThresholds: thresholdSummary,
        thresholdSweeps,
        sustainedSweep,
        falsePositives: handwritingEvaluationRecords
          .filter((record) => falsePositiveIds.has(record.id))
          .map((record) => ({
            id: record.id,
            character: record.character,
            shapeSimilarity: record.shapeSimilarity,
            actualAcceptance: record.actualAcceptance,
            ...record.strokeGeometry,
            trajectory: record.trajectory,
          })),
      })}`,
    );
    const durations = handwritingEvaluationRecords
      .map(({ durationMs }) => durationMs)
      .sort((a, b) => a - b);
    const issueCounts = Object.fromEntries(
      [
        `missing-stroke`,
        `extra-stroke`,
        `reversed-stroke`,
        `wrong-stroke-order`,
      ].map((kind) => [
        kind,
        Object.fromEntries(
          [`accepted`, `rejected`].map((expectedDecision) => [
            expectedDecision,
            handwritingEvaluationRecords
              .filter(
                ({ expectedAcceptance }) =>
                  expectedAcceptance === (expectedDecision === `accepted`),
              )
              .reduce(
                (count, record) =>
                  count +
                  record.issues.filter((issue) => issue.kind === kind).length,
                0,
              ),
          ]),
        ),
      ]),
    );
    const percentile = (fraction: number): number =>
      durations[Math.ceil(fraction * durations.length) - 1] ?? 0;

    console.warn(
      `PYLY_HANDWRITING_EVALUATION ${JSON.stringify({
        total: handwritingEvaluationRecords.length,
        ...counts,
        accuracy:
          (counts.truePositives + counts.trueNegatives) /
          Math.max(1, handwritingEvaluationRecords.length),
        errorRate:
          (counts.falsePositives + counts.falseNegatives) /
          Math.max(1, handwritingEvaluationRecords.length),
        runtimeMs: {
          mean:
            durations.reduce((sum, duration) => sum + duration, 0) /
            Math.max(1, durations.length),
          median: percentile(0.5),
          p95: percentile(0.95),
          max: durations.at(-1) ?? 0,
        },
        issueCounts,
      })}`,
    );
    for (const example of handwritingEvaluationRecords) {
      const {
        geometry: _geometry,
        drawnStrokes: _drawnStrokes,
        referencePaths: _referencePaths,
        ...serializableExample
      } = example;
      console.warn(
        `PYLY_HANDWRITING_EVALUATION_EXAMPLE ${JSON.stringify(serializableExample)}`,
      );
    }

    const reviewRecords = [
      ...new Map(
        handwritingEvaluationRecords
          .filter(({ id }) => !id.includes(`synthetic`))
          .map((record) => [record.id, record]),
      ).values(),
    ];
    const issueReview = reviewRecords.flatMap((record) =>
      record.issues.map((issue) => {
        const handwritingStrokeIndex = issue.handwriting?.strokeIndex ?? null;
        const referenceStrokeIndex = issue.reference?.strokeIndex ?? null;
        const assignment = record.geometry.strokeAssignments.find(
          ({ sourceStrokeIndex, targetStrokeIndex }) =>
            record.geometry.sourceStrokeOriginalIndices[sourceStrokeIndex] ===
              handwritingStrokeIndex &&
            record.geometry.targetStrokeOriginalIndices[targetStrokeIndex] ===
              referenceStrokeIndex,
        );
        const pairCost =
          assignment == null
            ? null
            : record.geometry.strokePairCosts[assignment.sourceStrokeIndex]?.[
                assignment.targetStrokeIndex
              ];
        const handwritingDirection =
          assignment == null
            ? null
            : measureStrokeDirection(
                record.geometry.sourceStrokes[assignment.sourceStrokeIndex] ??
                  [],
              );
        const referenceDirection =
          assignment == null
            ? null
            : measureStrokeDirection(
                record.geometry.targetStrokes[assignment.targetStrokeIndex] ??
                  [],
              );
        const detectorMeasurements =
          issue.kind === `reversed-stroke` && assignment != null
            ? {
                pairCost,
                direction: handwritingDirection,
                referenceDirection,
                endpointDirectionCosine:
                  (handwritingDirection?.directionX ?? 0) *
                    (referenceDirection?.directionX ?? 0) +
                  (handwritingDirection?.directionY ?? 0) *
                    (referenceDirection?.directionY ?? 0),
                directionalMargin:
                  (pairCost?.forwardDtwCost ?? 0) -
                  (pairCost?.reverseDtwCost ?? 0),
                thresholds: {
                  minimumEndpointDistance: 0.02,
                  minimumEndpointToLengthRatio: 0.08,
                  maximumEndpointDirectionCosine: -0.5,
                  maximumPairCost: 2 * record.geometry.options.unmatchedCost,
                  minimumDirectionalMargin: `max(0.02, reverseDtwCost * 0.1)`,
                },
              }
            : issue.kind === `missing-stroke`
              ? {
                  unmatchedCost: record.geometry.options.unmatchedCost,
                  alternativeAssignmentCosts:
                    referenceStrokeIndex == null
                      ? []
                      : record.geometry.strokePairCosts.flatMap(
                          (costs, sourceIndex) => {
                            const targetIndex =
                              record.geometry.targetStrokeOriginalIndices.indexOf(
                                referenceStrokeIndex,
                              );
                            const alternative = costs[targetIndex];
                            return alternative == null
                              ? []
                              : [
                                  {
                                    handwritingStrokeIndex:
                                      record.geometry
                                        .sourceStrokeOriginalIndices[
                                        sourceIndex
                                      ] ?? null,
                                    totalCost: alternative.totalCost,
                                  },
                                ];
                          },
                        ),
                }
              : {
                  unmatchedCost: record.geometry.options.unmatchedCost,
                  alternativeAssignmentCosts:
                    handwritingStrokeIndex == null
                      ? []
                      : (record.geometry.strokePairCosts[
                          record.geometry.sourceStrokeOriginalIndices.indexOf(
                            handwritingStrokeIndex,
                          )
                        ]?.map((cost, targetIndex) => ({
                          referenceStrokeIndex:
                            record.geometry.targetStrokeOriginalIndices[
                              targetIndex
                            ] ?? null,
                          totalCost: cost.totalCost,
                        })) ?? []),
                };
        return {
          fixtureId: record.id,
          character: record.character,
          expectedAcceptance: record.expectedAcceptance,
          actualAcceptance: record.actualAcceptance,
          issue,
          detectorMeasurements,
          diagnosticPngPath: diagnosticPngPath(record.id),
        };
      }),
    );

    await mkdir(handwritingReviewDirectory, { recursive: true });
    const reportPath = path.join(handwritingReviewDirectory, `review.json`);
    await writeFile(
      reportPath,
      JSON.stringify(
        {
          schemaVersion: 1,
          fixtureCount: reviewRecords.length,
          issueCount: issueReview.length,
          issues: issueReview,
        },
        null,
        2,
      ),
    );
    const terminalHookManualReview = await generateTerminalHookManualReview(
      handwritingEvaluationRecords,
    );
    console.warn(
      `PYLY_TERMINAL_HOOK_MANUAL_REVIEW ${JSON.stringify(
        terminalHookManualReview,
      )}`,
    );
    console.warn(
      `PYLY_HANDWRITING_REVIEW_ARTIFACTS ${JSON.stringify({
        reportPath,
        diagnosticPngPaths: [
          ...new Set(
            issueReview.map(({ diagnosticPngPath }) => diagnosticPngPath),
          ),
        ],
      })}`,
    );
  } finally {
    await diagnosticBrowser.close();
  }
});

async function renderSvgPng(
  browser: Browser,
  svg: string,
): Promise<Uint8Array> {
  const svgHeight = Number(svg.match(/<svg\b[^>]*\bheight="(\d+)"/u)?.[1]);
  const page = await browser.newPage({
    viewport: {
      width: 1024,
      height: Number.isFinite(svgHeight) ? svgHeight : 1900,
    },
    deviceScaleFactor: 2,
  });

  try {
    await page.setContent(
      `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:white}svg{display:block}</style></head><body>${svg}</body></html>`,
    );
    await page.evaluate(async () => document.fonts.ready);
    return await page.locator(`svg`).screenshot({
      type: `png`,
      animations: `disabled`,
      scale: `device`,
    });
  } finally {
    await page.close();
  }
}

async function annotateShapeContextGraderExample({
  context,
  example,
  character,
  drawnStrokes,
  referencePaths,
  geometry,
  similarCharacterGrades,
  acceptance,
  expectedAcceptance,
  gradingDurationMs,
}: {
  context: TestContext;
  example: ShapeContextGraderTestExample;
  character: string;
  drawnStrokes: WritingStrokePoint[][];
  referencePaths: string[];
  geometry: ReturnType<typeof gradeCharacterShape>;
  similarCharacterGrades: ReturnType<typeof gradeSimilarCharacters>;
  acceptance: HanziCharacterWritingAcceptanceDecision;
  expectedAcceptance: boolean;
  gradingDurationMs: number;
}): Promise<void> {
  if (!handwritingDiagnoseMode) {
    return;
  }

  const diagnostic = createShapeContextGraderDiagnostic({
    fixtureId: example.id,
    targetCharacter: character,
    encodedDrawnStrokes: example.drawnStrokes,
    drawnStrokes,
    referencePaths,
    expectedAcceptance,
    acceptanceThreshold: hanziCharacterWritingSimilarityThreshold,
    gradingDurationMs,
    geometry,
    acceptance,
    contrastiveCandidates: similarCharacterGrades,
    expectedIssues: example.expectedIssues,
    unexpectedIssues: example.unexpectedIssues,
  });
  const overviewSvg = renderShapeContextGraderDiagnosticSvg({
    fixtureId: example.id,
    targetCharacter: character,
    drawnStrokes,
    referencePaths,
    geometry,
    acceptance,
    contrastiveCandidates: similarCharacterGrades,
    expectedAcceptance,
    acceptanceThreshold: hanziCharacterWritingSimilarityThreshold,
    expectedIssues: example.expectedIssues,
    unexpectedIssues: example.unexpectedIssues,
  });
  if (diagnosticBrowser == null) {
    throw new Error(`Handwriting diagnostics browser was not initialized`);
  }

  const overviewPng = await renderSvgPng(diagnosticBrowser, overviewSvg);
  if (
    geometry.issues.length > 0 ||
    sustainedMismatchReportIds.has(example.id)
  ) {
    const pngPath = diagnosticPngPath(example.id);
    const svgPath = pngPath.replace(/\.png$/u, `.svg`);
    await mkdir(path.dirname(pngPath), { recursive: true });
    await writeFile(pngPath, overviewPng);
    await writeFile(svgPath, overviewSvg);
  }
  await context.annotate(`${example.id}: diagnostics.json`, {
    body: JSON.stringify(diagnostic),
    bodyEncoding: `utf-8`,
    contentType: `application/json`,
  });
  await context.annotate(`${example.id}: overview.svg`, {
    body: overviewSvg,
    bodyEncoding: `utf-8`,
    contentType: `image/svg+xml`,
  });
  await context.annotate(`${example.id}: overview.png`, {
    body: overviewPng,
    contentType: `image/png`,
  });
}

function recordHandwritingEvaluation({
  example,
  character,
  drawnStrokes,
  referencePaths,
  expectedAcceptance,
  actualAcceptance,
  acceptance,
  geometry,
  similarCharacterGrades,
  durationMs,
}: {
  example: ShapeContextGraderExample & {
    expectedIssues?: WritingIssueExpectation[];
    unexpectedIssues?: WritingIssueExpectation[];
  };
  character: string;
  drawnStrokes: WritingStrokePoint[][];
  referencePaths: string[];
  expectedAcceptance: boolean;
  actualAcceptance: boolean;
  acceptance: HanziCharacterWritingAcceptanceDecision;
  geometry: ReturnType<typeof gradeCharacterShape>;
  similarCharacterGrades: ReturnType<typeof gradeSimilarCharacters>;
  durationMs: number;
}): void {
  if (!handwritingDiagnoseMode) {
    return;
  }
  const strokePresence = diagnoseShapeContextStrokePresence(geometry);
  const strokeGeometry = calculateShapeContextStrokeGeometryDiagnostics(
    geometry,
    example.expectedIssues?.flatMap((expectation) =>
      expectation.kind === `reversed-stroke` && expectation.handwriting != null
        ? [expectation.handwriting.strokeIndex]
        : [],
    ) ?? [],
  );
  const originalStrokeGeometry =
    calculateShapeContextStrokeGeometryDiagnostics(geometry);
  const originalTrajectory =
    calculateShapeContextTrajectoryDiagnostics(geometry);
  const excludedReversedStrokeCount =
    example.expectedIssues?.filter(({ kind }) => kind === `reversed-stroke`)
      .length ?? 0;
  const trajectory = calculateShapeContextTrajectoryDiagnostics(
    geometry,
    example.expectedIssues?.flatMap((expectation) =>
      expectation.kind === `reversed-stroke` && expectation.handwriting != null
        ? [expectation.handwriting.strokeIndex]
        : [],
    ) ?? [],
  );
  const terminalHooks = calculateShapeContextTerminalHookDiagnostics(
    geometry,
    example.expectedIssues?.flatMap((expectation) =>
      expectation.kind === `reversed-stroke` && expectation.handwriting != null
        ? [expectation.handwriting.strokeIndex]
        : [],
    ) ?? [],
  );
  handwritingEvaluationRecords.push({
    id: example.id,
    character,
    drawnStrokes,
    referencePaths,
    geometry,
    expectedAcceptance,
    actualAcceptance,
    rejectionCondition: acceptance.rejectionCondition,
    shapeCost: geometry.shapeCost,
    shapeSimilarity: geometry.shapeSimilarity,
    deformationAlpha: geometry.deformationAlpha,
    initialMatchingError: geometry.initialMatchingError,
    residualMatchingError: geometry.residualMatchingError,
    sampleCount: geometry.sampleCount,
    durationMs,
    rotationDegrees: geometry.rotationDegrees,
    weightedScoreContributions: geometry.weightedScoreContributions,
    strokeAssignments: geometry.strokeAssignments,
    referenceStrokeCount: strokePresence.referenceStrokeCount,
    handwritingStrokeCount: strokePresence.handwritingStrokeCount,
    matchedReferenceStrokeCount:
      strokePresence.summary.matchedReferenceStrokeCount,
    unmatchedReferenceStrokeCount:
      strokePresence.summary.unmatchedReferenceStrokeCount,
    unmatchedHandwritingStrokeCount:
      strokePresence.summary.unmatchedHandwritingStrokeCount,
    unmatchedReferenceStrokeIndices: [...geometry.unmatchedTargetStrokeIndices],
    unmatchedHandwritingStrokeIndices: [
      ...geometry.unmatchedSourceStrokeIndices,
    ],
    unmatchedReferenceArcLengthFraction:
      strokePresence.summary.unmatchedReferenceArcLengthFraction,
    unmatchedHandwritingArcLengthFraction:
      strokePresence.summary.unmatchedHandwritingArcLengthFraction,
    missingReferenceStrokeFraction: geometry.missingReferenceStrokeFraction,
    extraHandwritingStrokeFraction: geometry.extraHandwritingStrokeFraction,
    acceptance,
    issues: geometry.issues,
    issueExpectations: evaluateWritingIssueExpectations(
      geometry.issues,
      example.expectedIssues,
      example.unexpectedIssues,
    ),
    contrastiveCandidates: similarCharacterGrades.map(
      ({ hanzi, geometry: candidateGeometry }, index) => {
        const comparison = acceptance.contrastiveCheck.candidates[index];
        if (comparison == null || comparison.character !== hanzi) {
          throw new Error(`Contrastive candidate diagnostics are out of sync`);
        }
        return {
          character: hanzi,
          shapeSimilarity: candidateGeometry.shapeSimilarity,
          deformationAlpha: candidateGeometry.deformationAlpha,
          comparison,
        };
      },
    ),
    strokeGeometry,
    originalStrokeGeometry,
    originalTrajectory,
    terminalHooks,
    matchedStrokeCount: strokeGeometry.matchedStrokeCount,
    originalMatchedStrokeCount: originalStrokeGeometry.matchedStrokeCount,
    issueAwareMatchedStrokeCount: strokeGeometry.matchedStrokeCount,
    excludedReversedStrokeCount,
    trajectory,
  });
}

function expectDebugGridDoesNotFold(
  geometry: ReturnType<typeof gradeCharacterShape>,
): void {
  const gridCoordinates = Array.from(
    { length: 7 },
    (_, index) => -1.5 + index * 0.5,
  );
  const lineSampleCoordinates = Array.from(
    { length: 17 },
    (_, index) => -1.5 + (index * 3) / 16,
  );
  const coordinates = [
    ...new Set([...gridCoordinates, ...lineSampleCoordinates]),
  ].sort((a, b) => a - b);
  const rows = coordinates.map((y) =>
    coordinates.map((x) => geometry.transform.transform({ x, y })),
  );

  for (let row = 0; row < coordinates.length - 1; row++) {
    for (let column = 0; column < coordinates.length - 1; column++) {
      const topLeft = rows[row]?.[column];
      const topRight = rows[row]?.[column + 1];
      const bottomLeft = rows[row + 1]?.[column];
      const bottomRight = rows[row + 1]?.[column + 1];
      if (
        topLeft == null ||
        topRight == null ||
        bottomLeft == null ||
        bottomRight == null
      ) {
        throw new Error(`Expected all debug grid points`);
      }
      expect(
        (topRight.x - topLeft.x) * (bottomRight.y - topLeft.y) -
          (topRight.y - topLeft.y) * (bottomRight.x - topLeft.x),
      ).toBeGreaterThan(0);
      expect(
        (bottomRight.x - topLeft.x) * (bottomLeft.y - topLeft.y) -
          (bottomRight.y - topLeft.y) * (bottomLeft.x - topLeft.x),
      ).toBeGreaterThan(0);
    }
  }
}

function expectTransformJacobianBounds(
  geometry: ReturnType<typeof gradeCharacterShape>,
): void {
  const gridCoordinates = Array.from(
    { length: 7 },
    (_, index) => -1.5 + index * 0.5,
  );
  const lineSampleCoordinates = Array.from(
    { length: 17 },
    (_, index) => -1.5 + (index * 3) / 16,
  );
  const coordinates = [
    ...new Set([...gridCoordinates, ...lineSampleCoordinates]),
  ].sort((a, b) => a - b);
  const step = 1e-4;
  for (const y of coordinates) {
    for (const x of coordinates) {
      const left = geometry.transform.transform({ x: x - step, y });
      const right = geometry.transform.transform({ x: x + step, y });
      const top = geometry.transform.transform({ x, y: y - step });
      const bottom = geometry.transform.transform({ x, y: y + step });
      const xx = (right.x - left.x) / (2 * step);
      const yx = (right.y - left.y) / (2 * step);
      const xy = (bottom.x - top.x) / (2 * step);
      const yy = (bottom.y - top.y) / (2 * step);
      const determinant = xx * yy - xy * yx;
      const trace = xx * xx + xy * xy + yx * yx + yy * yy;
      const discriminant = Math.sqrt(
        Math.max(0, trace * trace - 4 * determinant * determinant),
      );
      const largestSingularValue = Math.sqrt((trace + discriminant) / 2);
      const smallestSingularValue = determinant / largestSingularValue;

      expect(determinant).toBeGreaterThan(0);
      expect(smallestSingularValue).toBeGreaterThanOrEqual(0.499);
      expect(largestSingularValue).toBeLessThanOrEqual(2.001);
    }
  }
}

const positiveHandwritingExamples: readonly ShapeContextGraderTestExample[] = [
  {
    id: `一-1792834279781`,
    drawnStrokes: `173,505.6;189.7,505.6;215.1,505.6;223.1,505.6;247.7,505.6;282.6,505.6;320.7,505.6;362,505.6;408.8,505.6;458,505.6;510.4,506.4;566,507.2;618.4,507.2;663.6,507.2;698.5,506.4;723.2,501.7;742.2,499.3;758.9,497.7;774.7,496.1;781.1,496.1`,
  },
  {
    id: `地-1792834155743`,
    drawnStrokes: `174.6,483.4;185,481.8;219.1,476.3;226.2,472.3;246.1,461.2;275.4,445.3;303.2,431.8;322.3,423.1;323.1,422.3;322.3,422.3|273.1,215.1;270.7,230.2;272.3,255.6;273.1,263.5;274.7,290.5;278.6,330.2;285,381;287.4,427.9;288.9,474.7;288.1,522.3;288.1,572.3;288.1,620.8;288.1,661.2;288.1,689.8;288.1,704.9;288.1,711.2;288.1,716;288.1,720;288.1,723.9;288.1,724.7|124.6,804.9;147.6,785.9;159.6,782.7;166.7,780.3;173.8,777.1;191.3,770;217.5,754.9;255.6,727.9;298.5,700.1;333.4,681.9;358,676.3;369.9,675.5;374.7,675.5;377.1,675.5;379.4,675.5;380.2,675.5|354,523.1;374.7,520.7;393.7,520.7;405.6,518.4;418.3,514.4;448.5,503.3;481,490.6;512.8,477.9;539.8,468.3;562,462.8;581.9,459.6;601.7,456.4;623.1,451.7;645.4,446.1;666,441.4;685.8,435.8;704.1,431;720,426.3;732.7,423.1;743,420.7;750.1,418.3;758.1,416.7;765.2,416;774,415.2;781.9,415.2;789,415.2;796.2,415.2;801.7,415.2;806.5,415.2;808.1,415.2;809.7,415.2;810.5,415.2;811.3,415.2;813.6,415.2;815.2,415.2;816.8,415.2;818.4,418.3;818.4,423.1;818.4,429.4;818.4,439.8;818.4,454.8;815.2,476.3;806.5,504.1;797,537.4;785.9,569.9;774,602.5;763.6,630.3;757.3,651.7;754.9,666.8;754.1,679.5;754.1,688.2;754.1,693.8|753.3,697;752.5,698.5;750.9,700.1;748.6,702.5;742.2,702.5;733.5,702.5;723.2,702.5;710.4,702.5;698.5,701.7;689,694.6;681.9,685.8;676.3,677.9;673.1,667.6;671.6,658.9;669.2,650.1;667.6,643;665.2,634.2;662,626.3;661.2,623.1|615.2,161.1;616,195.3;616,200;616,222.3;608.8,257.2;597.7,299.3;584.2,346.9;574.7,395.3;570.7,441.4;569.9,485;569.9,524.7;569.9,560.4;569.9,589;567.6,608.8;566.8,623.1;565.2,633.5;565.2,642.2;564.4,649.3;564.4,656.5;564.4,663.6;564.4,670.8;564.4,677.1;564.4,681.9;564.4,684.3;564.4,685;562,685;558.8,682.7|485.8,314.3;483.4,362;483.4,365.1;483.4,387.4;483.4,419.1;483.4,455.6;477.1,496.9;469.1,541.4;462.8,585.8;458,628.7;454.8,669.2;452.5,707.3;450.9,740.6;450.9,766.8;450.9,784.3;450.9,799.4;452.5,813.6;462,826.3;473.9,838.3;489,848.6;507.2,858.1;527.1,865.2;547.7,870;567.6,873.2;587.4,875.6;609.6,876.4;634.2,876.4;658.9,876.4;683.5,876.4;704.9,876.4;723.9,876.4;739,876.4;751.7,874.8;762.8,873.2;772.4,870.8;781.1,866;787.4,861.3;793,854.1;796.2,846.2;799.4,835.9;803.3,823.2;808.1,808.1;813.6,791.4;821.6,770.8;824,764.4`,
  },
  {
    id: `也-1792843113487`,
    drawnStrokes: `203.2,486.6;208,488.2;228.6,489.8;232.6,489.8;249.3,489;280.2,479.5;315.9,467.5;356.4,453.3;398.5,439;442.9,423.9;486.6,408.8;528.7,393.7;569.2,378.6;605.7,364.4;635.8,350.9;658.1,338.2;675.5,323.1;690.6,310.4;706.5,300.1;721.6,290.5;735.1,285;745.4,282.6;750.9,282.6;754.9,282.6;756.5,282.6;758.1,285;758.9,289.7;759.7,294.5;760.5,300.1;762,305.6;763.6,312.8;766.8,321.5;770,329.4;771.6,339;771.6,346.9;771.6,358;771.6,373.9;771.6,400.9;767.6,446.1;761.3,504.9;756.5,562.8;751.7,608.8;746.2,639;740.6,655.7;734.3,664.4;730.3,669.2;727.9,669.2;726.3,669.2;725.5,669.2;723.9,669.2;721.6,669.2;714.4,669.2;698.5,669.2;669.2,666.8;629.5,635.8;603.3,600.9|533.4,170.7;535,173;539.8,194.5;542.2,202.4;546.9,231;549.3,281;549.3,344.5;544.5,418.3;528.7,495.3;511.2,571.5;496.1,639;489,677.1|353.2,247.7;351.7,304;351.7,310.4;351.7,342.9;351.7,385.8;352.4,427.1;354.8,469.1;358.8,514.4;365.1,564.4;378.6,619.2;399.3,674.7;427.1,726.3;460.4,768.4;503.3,799.4;552.5,819.2;604.9,830.3;656.5,839;706.5,845.4;753.3,851.7;793.8,856.5;822.4,860.5;842.2,862.1;855.7,862.1;866,862.1;872.4,862.1;875.6,862.1;878.7,862.1;881.9,862.1;884.3,862.1;886.7,862.1;887.5,862.1;887.5,859.7;887.5,855.7;887.5,846.2;887.5,820.8;889.8,760.5;907.3,664.4;912.1,639`,
  },
  {
    id: `商-1792834869972`,
    drawnStrokes: `453.3,60.3;456.4,65.1;465.2,83.3;477.1,104.8;480.2,111.9;491.4,134.9;504.9,161.1|262.7,193.7;286.6,191.3;299.3,191.3;312,191.3;344.5,191.3;384.2,188.1;430.2,186.5;481,186.5;535,186.5;589.8,186.5;642.2,186.5;689.8,188.9;733.5,196.1|386.6,253.2;404.8,274.7;424.7,297.7;434.2,312;445.3,327;468.3,353.2;493.7,378.6;521.5,389.8|702.5,254.8;670,281.8;666,286.6;647.7,306.4;623.9,335;602.5,363.6;587.4,390.5;581.9,408|267.5,382.6;266.7,404;277,435;281.8,458;285.8,481.8;291.3,538.2;293.7,601.7;293.7,668.4;292.1,734.3;283.4,789;279.4,824;279.4,838.3|299.3,362.8;339,369.1;353.2,373.9;367.5,379.4;396.9,388.2;430.2,395.3;468.3,400.9;512,406.4;561.2,413.6;613.6,420.7;664.4,424.7;710.4,426.3;748.6,427.1;777.1,427.9;793.8,432.6;802.5,440.6;807.3,452.5;808.1,471.5;808.1,499.3;802.5,541.4;792.2,589.8;782.7,640.6;777.1,689.8;774.7,735.1;774,774;774,804.9;774,828.7;774,847.8;774,862.1;774,870.8;774,875.6;771.6,876.4;766.8,876.4;760.5,876.4;748.6,874.8;730.3,859.7;711.2,836.7;693,812.1;676.3,798.6;657.3,796.2|516,470.7;490.6,477.1;486.6,477.1;477.9,480.2;457.2,492.9;435,510.4;412.8,527.9;395.3,539;387.4,540.6|671.6,473.9;666.8,488.2;686.6,509.6;708.1,536.6;730.3,561.2;749.3,585.8|413.6,680.3;406.4,695.4;404,713.6;404,720.8;404,746.2;404,777.9;404,807.3;404,831.9;404,853.3;404,866.8|420.7,660.4;439,658.1;463.6,658.1;470.7,658.1;493.7,658.1;523.9,655.7;558,650.9;588.2,647.7;615.2,646.2;633.5,646.2;637.4,652.5;637.4,674.7;630.3,707.3;618.4,745.4;610.4,777.9;605.7,808.9;604.1,832.7;604.1,851;604.1,854.1|430.2,866.8;434.2,868.4;453.3,868.4;481.8,868.4;489.8,868.4;516,868.4;553.3,868.4;591.4,868.4;620.8,868.4`,
  },
  {
    id: `冫-1792834655201`,
    drawnStrokes: `292.9,97.6;306.4,131.8;309.6,138.1;322.3,160.3;340.5,192.1;358,227;374.7,267.5;383.4,304.8|200,807.3;206.4,801.7;234.2,771.6;239.7,762.8;256.4,733.5;278.6,685;302.4,630.3;328.6,568.4;352.4,521.5`,
  },
  {
    id: `做-1792834604697`,
    fails: true,
    drawnStrokes: `310.4,87.3;303.2,123.8;303.2,127.8;300.1,149.2;287.4,178.6;270.7,214.3;248.5,254.8;221.5,297.7;192.1,338.2;162.7,372.3;140.5,395.3|265.9,239.7;273.9,268.3;275.4,274.7;281.8,302.4;285,349.3;285,404;281,469.9;269.1,543.8;261.2,620.8;256.4,690.6;256.4,744.6;256.4,777.9;256.4,783.5|375.5,349.3;381,350.1;403.2,351.7;408,351.7;421.5,351.7;439.8,351.7;459.6,351.7;481,353.2;487.4,354|489,151.6;474.7,176.2;473.9,192.9;470.7,210.4;465.2,250;458.8,299.3;452.5,358.8;446.9,417.5;440.6,470.7;431.8,511.2|333.4,539.8;328.6,571.5;328.6,577.9;328.6,604.9;328.6,640.6;328.6,677.1;328.6,714.4;328.6,750.1;326.3,774.7|340.5,540.6;353.2,543;370.7,543;381,543;392.9,542.2;418.3,538.2;446.1,533.4;516,523.1;523.9,528.7;523.9,556.5;518.4,596.1;505.6,640.6;493.7,685;484.2,726.3;476.3,763.6;469.9,794.6;467.5,804.1|368.3,800.9;385,787.4;396.9,785.9;404,785.1;413.6,784.3;435,784.3;449.3,784.3|757.3,183.4;754.9,188.1;744.6,213.5;739.8,221.5;726.3,243.7;707.3,277;683.5,312.8;655.7,352.4;627.9,390.5;598.5,426.3;573.1,455.6;550.1,481.8;538.2,494.5|707.3,334.2;708.1,343.7;727.9,345.3;743,346.9;758.9,348.5;793.8,350.1;827.9,352.4;857.3,355.6;883.5,358;903.3,360.4;915.2,364.4;923.2,369.9;926.4,377.8;927.2,385.8;927.2,398.5;922.4,416;907.3,440.6;885.9,471.5;855.7,507.2;819.2,548.5;772.4,597.7;720,652.5;662.8,705.7;608.8,754.9;563.6,798.6;531.1,834.3;512.8,854.9;507.2,862.9;506.4,863.7|645.4,462;640.6,473.9;644.6,500.1;648.5,508;661.2,537.4;686.6,581.1;719.2,632.7;761.3,690.6;805.7,745.4;849.4,787.4;888.3,814.4;919.2,827.1;926.4,829.5`,
  },
  {
    id: `做-1792834563385`,
    fails: true,
    drawnStrokes: `325.5,115.9;316.7,145.3;315.1,154;313.6,169.9;298.5,205.6;273.1,248.5;242.9,293.7;207.2,339;172.3,381;138.1,416.7;112.7,446.9;92.1,470.7;77.8,484.2|273.1,319.1;266.7,334.2;264.3,360.4;264.3,366.7;264.3,387.4;263.5,419.9;259.6,458.8;253.2,507.2;248.5,564.4;244.5,620.8;242.9,673.1;241.3,720.8;238.9,760.5;234.2,790.6;228.6,811.3;226.2,818.4|410.4,314.3;419.9,314.3;440.6,314.3;446.9,314.3;466.8,314.3;493.7,314.3;520.7,314.3;546.9,314.3;566,317.5|534.2,180.2;531.1,183.4;524.7,208.8;524.7,215.9;524.7,240.5;523.1,281.8;518.4,329.4;511.2,377.8;504.9,421.5;497.7,462;496.1,470.7|394.5,508.8;386.6,549.3;387.4,555.7;387.4,581.9;389.8,620;391.3,654.9;392.9,689.8;392.9,721.6;391.3,747;385.8,758.9|412.8,507.2;416,507.2;432.6,507.2;450.9,507.2;456.4,507.2;476.3,506.4;504.9,503.3;529.5,500.9;550.1,499.3;561.2,500.1;562,508.8;561.2,532.6;547.7,562.8;536.6,600.9;527.1,638.2;522.3,672.3;520.7,697;520.7,717.6;520.7,721.6|411.2,788.2;415.2,776.3;424.7,776.3;435.8,775.5;464.4,774;498.5,772.4|736.6,258;727.9,258.8;722.4,276.2;712,300.8;705.7,318.3;697.7,339;677.1,382.6;654.9,421.5;636.6,450.1;623.1,470.7;613.6,484.2;610.4,486.6|697,396.9;703.3,394.5;723.9,394.5;739,394.5;756.5,394.5;797,391.3;837.5,383.4;874,377.1;899.4,372.3;914.5,371.5;920,371.5;920,373.1;917.6,387.4;904.9,406.4;889.1,427.1;869.2,450.1;845.4,478.7;818.4,509.6;784.3,549.3;747.8,595.3;708.1,644.6;663.6,693;620.8,735.9;583.4,771.6;556.5,799.4;539,818.4;531.1,825.6;529.5,826.3|681.1,470.7;677.1,481;686.6,508.8;694.6,528.7;704.1,553.3;734.3,611.2;777.9,680.3;827.1,749.3;875.6,807.3;920.8,846.2;939.9,858.9`,
  },
  {
    id: `男-1792851554902`,
    drawnStrokes: `363.6,129.4;374.7,152.4;373.1,172.3;373.1,178.6;373.9,198.4;374.7,227;374.7,263.5;376.3,304.8;379.4,343.7;384.2,372.3;385,377.8|385.8,131;392.1,133.4;416.7,136.5;422.3,136.5;439,138.1;466,139.7;498.5,141.3;535.8,142.1;575.5,142.1;611.2,142.1;643.8,142.1;670,142.1;688.2,147.6;693,163.5;692.2,196.9;689.8,239.7;683.5,285.8;680.3,331.8;680.3,373.9;680.3,409.6;680.3,434.2;680.3,442.9|412,309.6;424.7,304.8;446.1,304.8;458,304.8;473.9,304.8;508,304.8;550.1,304.8;591.4,304.8;630.3,304.8;663.6,304.8;675.5,304.8|528.7,142.9;527.1,160.3;527.9,186.5;530.3,196.9;534.2,226.2;540.6,276.2;545.3,333.4;551.7,387.4;556.5,424.7;558.8,443.7;559.6,446.1|374.7,397.7;399.3,400.1;414.4,400.1;430.2,400.1;462,400.1;497.7,400.1;535.8,400.1;576.3,400.1;617.6,400.1;637.4,399.3|341.3,650.9;379.4,643;382.6,644.6;403.2,639;433.4,629.5;468.3,621.5;505.6,614.4;546.1,609.6;588.2,604.9;630.3,598.5;667.6,593;702.5,589.8;728.7,588.2;748.6,588.2;759.7,589;762.8,595.3;762,606.5;762,618.4;760.5,633.5;754.1,654.9;747,685;740.6,725.5;735.9,768.4;733.5,810.5;733.5,848.6;733.5,884.3;735.9,913.7;740.6,935.9;743,948.6;743,952.6;740.6,952.6;735.9,952.6;731.1,952.6;727.1,952.6;723.9,952.6;721.6,952.6;720,952.6;718.4,952.6;717.6,952.6;716.8,953.4;716,953.4;714.4,953.4;711.2,953.4;704.9,953.4;689.8,951.8;661.2,934.3;635.8,920.8;616,913.7;607.3,908.9|483.4,492.9;485,499.3;487.4,527.9;487.4,534.2;491.4,553.3;495.3,588.2;496.9,635.8;496.9,697;489.8,762;473.1,823.2;451.7,875.6;426.3,915.2;398.5,943.8;377.1,962.1;364.4,972.4;361.2,974`,
  },
  {
    id: `女-1792848116181`,
    drawnStrokes: `502.5,197.7;496.1,203.2;476.3,227.8;471.5,234.2;458.8,254.8;437.4,289.7;410.4,333.4;380.2,381.8;352.4,427.9;327,469.1;306.4,501.7;291.3,525.5;282.6,538.2;280.2,539.8;282.6,539.8;296.1,539.8;312.8,540.6;336.6,552.5;367.5,573.9;403.2,602.5;445.3,635;489.8,673.1;539,711.2;592.2,747;643.8,781.1;689.8,812.1;726.3,838.3;753.3,856.5;766.8,862.1;768.4,861.3|683.5,406.4;655.7,425.5;650.1,435.8;642.2,450.9;622.3,489;592.2,538.2;550.1,596.1;500.9,652.5;442.9,695.4;381,725.5;323.9,749.3;277,767.6;242.9,781.9;223.1,793;211.9,799.4;202.4,803.3|113.5,447.7;156.4,442.1;160.3,442.1;186.5,442.1;231.8,442.1;285,442.1;344.5,442.1;409.6,440.6;476.3,440.6;547.7,440.6;621.5,440.6;693.8,440.6;762,440.6;820.8,437.4;865.2,427.9;893,418.3;904.1,413.6`,
  },
  {
    id: `去-1792847997436`,
    drawnStrokes: `309.6,216.7;317.5,215.9;356.4,214.3;365.1,214.3;394.5,214.3;435.8,214.3;480.2,214.3;524.7,213.5;568.4,208;605.7,198.4;612,196.1|525.5,59.5;518.4,105.6;518.4,114.3;517.6,155.6;513.6,207.2;507.2,266.7;500.1,331;492.2,391.3;484.2,441.4;476.3,473.1|200,508.8;225.4,503.3;238.1,502.5;251.6,498.5;286.6,494.5;331,492.2;387.4,489.8;448.5,485.8;512.8,480.2;579.5,476.3;643,469.1;697,462;739.8,457.2;769.2,454.8|622.3,466;603.3,481;589.8,492.9;581.9,500.1;573.1,508.8;546.9,531.8;509.6,562;465.2,593.8;421.5,624.7;380.2,655.7;341.3,688.2;306.4,719.2;277,744.6;256.4,761.3;246.1,772.4;242.9,779.5;242.9,784.3;242.9,786.7;254.8,786.7;277.8,786.7;309.6,779.5;350.9,771.6;397.7,763.6;450.1,757.3;505.6,754.1;563.6,749.3;619.2,743;668.4,735.1;707.3,727.9;733.5,725.5;750.1,724.7;754.1,723.9|716.8,631.9;726.3,651.7;738.2,681.9;745.4,700.9;753.3,722.4;768.4,766;781.9,802.5;795.4,832.7;806.5,862.9;818.4,887.5`,
  },
  {
    id: `呢-1792843324720`,
    drawnStrokes: `200,245.3;199.2,250;199.2,282.6;199.2,291.3;199.2,323.1;199.2,375.5;199.2,435;200.8,496.9;204.8,550.9;205.6,561.2|204,231;208,229.4;222.3,226.2;235.8,226.2;239.7,226.2;252.4,226.2;276.2,226.2;305.6,226.2;339.7,226.2;373.1,226.2;401.7,226.2;424.7,230.2;435,240.5;435.8,260.4;431.8,293.7;419.9,339;413.6,388.2;410.4,438.2;408,481.8;407.2,516.8;405.6,544.5;402.5,564.4;398.5,581.9;396.9,585|187.3,612;211.9,606.5;219.1,607.3;249.3,599.3;296.9,581.9;347.7,566.8;400.1,554.9;435.8,550.9|523.9,141.3;548.5,135.7;558,134.9;582.6,135.7;624.7,135.7;665.2,135.7;704.9,135.7;741.4,133.4;771.6,132.6;788.2,132.6;794.6,142.1;797,157.2;798.6,176.2;798.6,205.6;798.6,241.3;792.2,281.8;786.7,319.1;783.5,351.7;781.9,364.4|555.7,368.3;560.4,368.3;585.8,369.1;594.6,369.1;623.1,369.1;668.4,366.7;717.6,365.1;769.2,365.9;812.1,365.9;820.8,365.9|565.2,155.6;569.9,163.5;577.1,204;577.1,215.1;577.9,253.2;577.9,316.7;577.1,386.6;565.2,459.6;547.7,537.4;523.9,619.2;495.3,699.3;461.2,767.6;428.7,822.4;396.1,861.3;370.7,885.1;364.4,888.3|813.6,515.2;777.9,535.8;770.8,542.2;747,565.2;710.4,600.9;671.6,637.4;634.2,673.1;602.5,706.5|620,451.7;625.5,467.5;627.9,499.3;627.9,521.5;627.9,546.9;612,603.3;593,660.4;578.7,712.8;566.8,758.9;563.6,793.8;563.6,820;570.7,838.3;588.2,851.7;612,862.9;638.2,872.4;666,880.3;695.4,885.9;726.3,889.1;758.1,890.6;785.9,891.4;811.3,891.4;831.1,891.4;842.2,891.4;846.2,891.4;846.2,889.1;846.2,884.3;846.2,871.6;851.7,830.3;864.4,738.2`,
  },
  {
    id: `门-1792852179135`,
    drawnStrokes: `314.3,191.3;327,191.3;344.5,197.7;354.8,208.8;365.1,222.3;387.4,258.8;406.4,296.9|266.7,315.1;266.7,328.6;266.7,381.8;267.5,395.3;272.3,439;279.4,510.4;285,594.6;290.5,679.5;298.5,750.1;302.4,799.4;302.4,823.2;302.4,828.7|554.1,205.6;566.8,205.6;578.7,208;581.9,209.6;593,213.5;610.4,218.3;631.1,221.5;657.3,221.5;689,221.5;721.6,221.5;751.7,219.9;777.9,217.5;797.8,217.5;810.5,217.5;818.4,217.5;822.4,224.6;825.6,246.1;826.3,281.8;826.3,332.6;826.3,394.5;823.2,464.4;816.8,536.6;811.3,603.3;808.1,655.7;807.3,691.4;807.3,715.2;807.3,734.3;807.3,750.9;807.3,766.8;807.3,781.1;807.3,791.4;807.3,794.6;806.5,793;799.4,786.7;784.3,774.7;763.6,758.1;736.6,731.9;702.5,689.8;670.8,653.3`,
  },
  {
    id: `还-1792851886857`,
    drawnStrokes: `273.1,185;287.4,181;295.3,181;304.8,181;331.8,181;368.3,181.8;410.4,188.1;456.4,195.3;505.6,200;558.8,203.2;613.6,204.8;667.6,204.8;713.6,204.8;748.6,202.4;769.2,192.9;781.9,185.7;792.2,181.8;804.9,179.4;812.1,177|638.2,197.7;620.8,200;615.2,208;595.3,231.8;565.2,263.5;528.7,295.3;487.4,327.8;443.7,356.4;401.7,378.6;366.7,395.3;346.1,402.5|504.1,312;505.6,318.3;508,349.3;509.6,356.4;513.6,383.4;516.8,423.1;517.6,469.9;516.8,523.9;511.2,576.3;505.6,618.4;501.7,654.1;501.7,660.4|510.4,329.4;523.9,340.5;546.1,358.8;575.5,385;609.6,416.7;648.5,451.7;666,467.5|90.5,157.2;93.7,157.2;108.8,172.3;130.2,202.4;136.5,209.6;156.4,235.8;184.2,268.3;211.9,293.7;218.3,299.3|103.2,385.8;111.1,383.4;121.5,384.2;134.9,384.2;149.2,383.4;163.5,381;176.2,378.6;188.1,377.1;196.9,375.5;206.4,375.5;215.1,375.5;223.9,375.5;230.2,375.5;235.8,375.5;240.5,375.5;243.7,377.8;246.9,379.4;247.7,379.4;247.7,380.2;247.7,381;247.7,382.6;247.7,384.2;243.7,388.2;237.3,394.5;230.2,402.5;223.9,412;215.9,423.9;211.2,439;206.4,458;204.8,479.5;205.6,502.5;210.4,525.5;219.9,544.5;230.2,558;241.3,569.2;250,578.7;256.4,591.4;259.6,608;259.6,627.1;259.6,647.7;251.6,667.6;237.3,684.3;220.7,699.3;204,708.9;189.7,715.2;185.7,716|101.6,777.9;111.9,759.7;117.5,757.3;123.8,754.9;139.7,747;161.1,739;187.3,730.3;221.5,719.2;265.9,708.9;315.1,700.1;366.7,694.6;415.2,690.6;458.8,689.8;496.1,689.8;530.3,697;562.8,707.3;596.1,718.4;627.9,728.7;658.9,737.4;692.2,745.4;728.7,747.8;774.7,743.8;797.8,734.3`,
  },
  {
    id: `百-1792851609147`,
    drawnStrokes: `258.8,114.3;303.2,102.4;319.9,102.4;336.6,102.4;371.5,101.6;408,98.4;449.3,94.5;497.7,92.1;554.1,90.5;616,90.5;678.7,88.9;739,86.5;793.8,81.8;816.8,80.2|532.6,93.7;503.3,127;495.3,141.3;486.6,155.6;467.5,186.5;447.7,219.1;427.9,248.5;408.8,276.2;388.2,301.6;366.7,331;355.6,344.5|245.3,298.5;240.5,306.4;238.9,339.7;242.9,348.5;252.4,375.5;265.1,419.1;274.7,466;282.6,518.4;288.1,583.4;291.3,661.2;291.3,736.6;291.3,793.8;292.1,830.3;292.1,847.8;292.1,852.5;288.9,852.5|227.8,346.1;268.3,349.3;283.4,350.9;300.1,351.7;339.7,352.4;385.8,352.4;435.8,352.4;487.4,343.7;539,331.8;589.8,316.7;635.8,304.8;670.8,298.5;689.8,297.7;699.3,297.7;705.7,301.6;711.2,307.2;717.6,313.6;723.2,318.3;727.9,323.1;731.9,327.8;735.1,333.4;735.9,342.1;735.9,355.6;735.9,377.1;735.9,408;735.9,450.1;735.9,510.4;735.9,585.8;735.9,665.2;735.9,737.4;738.2,793.8;738.2,828.7;738.2,847.8;735.9,851|319.9,589.8;357.2,581.1;368.3,581.1;400.9,579.5;451.7,575.5;515.2,573.1;586.6,571.5;655.7,569.9;715.2,563.6;753.3,558|324.7,905.7;356.4,904.1;376.3,903.3;398.5,899.4;450.1,885.1;505.6,871.6;567.6,865.2;634.2,863.7;700.9,863.7;769.2,863.7;800.1,863.7`,
  },
  {
    id: `鸡-1793159299525`,
    drawnStrokes: `152.4,250;154.8,250;162.7,250;173,250;196.1,249.3;224.6,246.1;257.2,244.5;292.1,244.5;326.3,244.5;359.6,245.3;391.3,247.7;416.7,248.5;436.6,248.5;448.5,248.5;451.7,248.5;451.7,249.3;449.3,258;440.6,271.5;425.5,292.9;397.7,330.2;359.6,372.3;312,421.5;254,466.8;200,503.3;157.2,530.3;131.8,541.4|272.3,345.3;287.4,365.9;315.9,404.8;335,423.1;358.8,441.4;407.2,473.1|653.3,49.2;608,73;598.5,81;589.8,92.1;565.2,120.7;550.9,134.9|511.2,150;533.4,146.9;561.2,146.9;575.5,146.9;591.4,146.9;626.3,146.9;660.4,146.9;691.4,146.9;717.6,146.9;739.8,146.9;760.5,146.9;777.1,146.9;786.7,148.4;789,149.2;789,154;788.2,160.3;784.3,171.5;781.9,190.5;780.3,214.3;778.7,241.3;777.9,272.3;777.1,302.4;777.1,334.2;777.1,364.4;777.1,391.3;777.1,414.4;774,427.9;770,431.8;767.6,431.8;765.2,431.8;765.2,431;765.2,429.4;764.4,426.3;763.6,424.7;759.7,421.5;748.6,416.7;729.5,408;708.1,396.1;693.8,382.6|605.7,221.5;611.2,223.1;625.5,236.6;642.2,255.6;650.9,266.7;659.6,277;677.1,297.7;685.8,310.4|539,163.5;535,184.2;535,209.6;535,223.1;535,238.9;535,273.1;535,310.4;534.2,350.9;532.6,392.9;530.3,431.8;528.7,469.1;527.1,500.9;525.5,527.1;523.9,545.3;523.9,554.9;523.1,558.8;523.1,559.6;523.9,559.6;531.8,559.6;550.9,559.6;580.3,559.6;616.8,558.8;656.5,556.5;695.4,554.1;732.7,553.3;767.6,553.3;795.4,553.3;811.3,553.3;813.6,553.3;813.6,554.1;812.8,555.7;810.5,556.5;808.9,558;807.3,559.6;806.5,563.6;806.5,572.3;805.7,589.8;805.7,612.8;805.7,642.2;805.7,673.9;804.9,706.5;804.1,737.4;803.3,767.6;801.7,793.8;800.1,817.6;797.8,839;796.2,856.5;794.6,869.2;793,879.5;791.4,885.1;790.6,888.3;790.6,889.1;789.8,889.1;789,886.7;787.4,884.3;781.9,881.1;769.2,876.4;745.4,866;722.4,843.8|212.7,745.4;226.2,736.6;265.1,736.6;275.4,736.6;312,736.6;367.5,736.6;429.4,736.6;495.3,736.6;566,736.6;636.6,736.6;699.3,736.6;747.8,734.3`,
  },
  {
    id: `一-1792714139002`,
    drawnStrokes: `254.8,506.5;265.9,505.7;304.8,504.9;313.6,504.9;342.1,504.9;390.5,504.9;444.5,501.7;502.5,495.3;561.2,492.2;615.2,489;664.4,485.8;706.5,483.4;739.8,481.9;763.6,479.5;775.5,476.3`,
  },
  {
    id: `冫-1792714274163`,
    drawnStrokes: `301.6,146.9;306.4,158.8;321.5,188.9;325.5,198.5;341.3,232.6;362.8,284.2;377.8,321.5|323.1,776.4;336.6,744.6;340.5,738.3;355.6,709.7;377.1,660.5;400.1,607.3;427.1,559.6;433.4,548.5`,
  },
  {
    id: `出-1792658924863`,
    drawnStrokes: `300.1,221.5;298.5,265.1;298.5,285;298.5,307.2;298.5,351.7;298.5,397.7;298.5,441.4;295.3,477.9;288.1,500.1;285,510.4;285,512.8;287.4,514.4;303.2,516.8;322.3,518.4;345.3,518.4;371.5,518.4;400.1,512.8;435,500.1;476.3,485.8;517.6,473.1;558,461.2;593,453.3;623.1,446.1;650.9,440.6;674.7,436.6;695.4,432.6;710.4,431.8;720,431.8;726.3,433.4;727.1,436.6|545.3,93.7;530.3,123.1;530.3,138.1;529.5,158;526.3,208;523.9,271.5;523.1,344.5;523.1,426.3;523.1,514.4;525.5,602.5;527.9,681.9;527.9,745.4;526.3,786.7;517.6,807.3;507.2,820|728.7,173.9;729.5,181.8;730.3,219.1;730.3,230.2;730.3,262.8;730.3,312;730.3,366;730.3,420.7;730.3,471.5;733.5,506.5|322.3,600.1;319.1,616.8;313.6,677.1;313.6,690.6;313.6,727.9;313.6,775.6;313.6,819.2;313.6,853.4;313.6,871.6;315.9,875.6;333.4,874.8;366.7,867.6;413.6,854.1;468.3,845.4;525.5,842.2;581.1,838.3;632.7,829.5;673.9,818.4;708.9,806.5;737.4,795.4;762,781.1;774.7,774|765.2,590.6;764.4,603.3;764.4,662;765.2,676.3;770.8,718.4;777.9,775.6;782.7,830.3;785.9,879.5;787.4,928;788.2,939.1`,
  },
  {
    id: `发-1792657992672`,
    expectedIssues: [
      {
        kind: `wrong-stroke-order`,
        handwriting: { strokeIndex: 2 },
        reference: { strokeIndex: 4 },
      },
    ],
    drawnStrokes: `338.2,165.1;312.8,212.8;306.4,224.7;297.7,248.5;282.6,285.8;267.5,321.5;258.8,353.3;257.2,377.1;265.9,388.2;296.9,392.2;341.3,392.2;396.9,392.2;457.2,381.8;519.1,369.1;579.5,357.2;637.4,348.5;689.8,339.8|485,121.5;483.4,125.4;481,163.5;481,176.2;481,217.5;481,282.6;471.5,356.4;450.1,437.4;416.7,516;377.1,590.6;336.6,660.5;300.1,723.2;267.5,772.4;246.1,808.1;231.8,824|637.4,188.9;656.5,202.4;676.3,227.8;694.6,256.4;715.2,289.8|393.7,532.7;396.1,533.5;421.5,533.5;429.4,532.7;469.1,527.1;519.9,518.4;571.5,511.2;623.1,503.3;673.9,497.7;718.4,495.3;746.2,495.3;754.9,499.3;753.3,512;736.6,533.5;704.9,571.6;661.2,619.2;617.6,668.4;577.9,713.6;544.5,754.9;517.6,789.1;498.5,808.9;495.3,810.5|446.1,507.3;437.4,514.4;456.4,535.8;489,570;531.1,611.2;578.7,654.9;628.7,694.6;678.7,732.7;727.9,768.4;777.1,793.8;818.4,811.3`,
  },
  {
    id: `地-1792722210838`,
    drawnStrokes: `202.4,395.3;211.2,393.7;242.9,392.2;249.3,392.2;269.9,390.6;299.3,386.6;330.2,383.4;364.4,381;396.9,377.9;418.3,374.7|342.9,212.8;335,235;334.2,242.9;335,249.3;335,277.8;335,323.9;335,373.9;333.4,427.1;329.4,478.7;323.1,527.1;315.1,572.3;308,600.9|213.5,685.1;242.9,666.8;246.1,664.4;264.3,653.3;291.3,635.9;320.7,616.8;352.4,597.7;385.8,577.1;417.5,555.7;446.9,534.2;452.5,529.5|414.4,450.1;431.8,438.2;446.1,437.4;454.8,434.2;466,431.1;492.2,422.3;527.1,410.4;566,396.9;604.9,381.8;642.2,366;677.1,351.7;708.1,340.6;735.1,333.4;755.7,328.7;768.4,327.1;776.3,326.3;781.1,325.5;782.7,324.7;782.7,328.7;782.7,342.9;782.7,366.8;782.7,396.1;781.9,423.1;781.1,450.1;779.5,473.9;777.9,496.9;776.3,520.8;773.2,543;770,562;766,578.7;762.8,592.2;760.5,602.5;758.9,608.9;757.3,615.2;755.7,621.6;754.1,627.1;751.7,632.7;750.1,635.1;748.6,637.4;746.2,639;744.6,639.8;743.8,639.8;739.8,639.8;732.7,639.8;723.9,639.8;713.6,635.1;703.3,622.4;694.6,611.2;687.4,598.5;677.1,585|659.6,174.7;650.9,229.4;650.9,253.2;650.9,277.8;650.9,333.4;646.9,392.9;639,455.7;631.9,514.4;626.3,554.9|529.5,201.6;519.9,242.9;519.9,260.4;519.1,281;513.6,326.3;508.8,369.9;503.3,414.4;496.9,462;491.4,511.2;486.6,559.6;482.6,604.1;479.5,645.4;477.9,679.5;477.9,705.7;477.9,722.4;477.9,731.9;478.7,739;484.2,746.2;490.6,751;500.1,757.3;513.6,763.7;531.8,769.2;554.9,774;579.5,777.9;604.9,780.3;631.9,784.3;658.1,786.7;685.8,790.6;713.6,793.8;743.8,795.4;772.4,795.4;800.1,795.4;825.6,793.8;847,785.9;863.7,775.6;874.8,766;882.7,753.3;888.3,731.9;893,695.4;901.8,645.4;915.2,594.6;920.8,571.6`,
  },
  {
    id: `块-1792725063240`,
    drawnStrokes: `231.8,354.1;261.2,343.7;269.1,342.1;289.7,343.7;326.3,339.8;362.8,335.8;395.3,332.6;423.1,331.8;433.4,331.8|317.5,169.9;314.3,200.8;314.3,223.9;315.9,250.1;321.5,316.7;326.3,392.2;329.4,466.8;330.2,528.7;330.2,571.6;327.8,586.6|167.5,614.4;192.9,600.1;210.4,596.2;230.2,586.6;270.7,567.6;315.9,549.3;362.8,535.8;409.6,529.5;452.5,529.5;490.6,529.5|504.1,331;511.2,334.2;531.1,334.2;544.5,334.2;560.4,334.2;594.6,334.2;631.1,334.2;663.6,328.7;691.4,323.1;715.2,319.1;732.7,318.3;745.4,318.3;749.3,327.9;749.3,352.5;748.6,383.4;740.6,416;733.5,442.2;728.7,462;726.3,485;724.7,495.3|425.5,496.1;429.4,495.3;450.1,493.8;455.6,493.8;481,493.8;522.3,493.8;569.2,492.2;616,491.4;662,491.4;708.1,491.4;755.7,492.2;800.1,493;840.6,492.2;874,473.9;881.9,467.6|647.7,223.1;635,245.3;635,281.8;632.7,309.6;627.1,341.4;608.8,418.4;582.6,506.5;552.5,597.7;518.4,681.1;484.2,751;455.6,802.5;431.8,843.8;421.5,855.7|600.1,502.5;608.8,516;615.2,539;623.1,555.7;633.5,575.5;661.2,623.2;697.7,677.1;738.2,720;757.3,736.7`,
  },
  {
    id: `她-1792722389417`,
    drawnStrokes: `396.1,158;384.2,179.4;374.7,212;370.7,221.5;354.8,256.4;331.8,311.2;312,362.8;296.9,408;285,449.3;277,484.2;273.9,512;273.9,532.7;273.9,549.3;275.4,565.2;285.8,580.3;300.1,593.8;319.1,608.1;342.1,625.5;369.1,645.4;389.8,660.5;399.3,666;400.1,666;398.5,662|436.6,363.6;416,389.8;412,402.5;405.6,419.1;389,462.8;366.7,516;339,570.8;309.6,617.6;284.2,654.1;266.7,678.7;263.5,694.6;263.5,699.4|182.6,443;198.4,437.4;225.4,426.3;234.2,422.3;261.2,412.8;303.2,399.3;348.5,386.6;395.3,377.1;406.4,374.7|477.9,453.3;482.6,448.5;504.1,436.6;508,433.4;523.9,423.9;551.7,411.2;580.3,397.7;612,383.4;643,369.9;671.6,356.4;697.7,345.3;720.8,335;743,326.3;762,319.9;774.7,315.2;781.9,313.6;784.3,312.8;785.9,312.8;786.7,313.6;786.7,322.3;786.7,335.8;786.7,363.6;786.7,402.5;781.9,453.3;781.1,501.7;781.9,543;781.9,572.3;781.9,584.3;781.9,580.3;779.5,577.1;772.4,573.1;758.9,569.2;737.4,563.6;711.2,557.3;688.2,552.5;672.3,547.7|670.8,229.4;652.5,234.2;654.1,271.5;654.1,285.8;654.1,335;650.1,411.2;640.6,486.6;625.5,556.5;620.8,572.3|558.8,173.1;550.9,194.5;550.9,234.2;549.3,260.4;546.9,291.3;542.2,362;536.6,435.8;531.8,508.8;527.1,575.5;523.9,637.4;521.5,691.4;520.7,731.9;520.7,758.1;520.7,774;526.3,783.5;543.8,789.1;572.3,794.6;609.6,797.8;650.1,799.4;689.8,799.4;729.5,798.6;769.2,785.1;802.5,764.4;827.1,731.1;838.3,689;839,643.8;839,597;839,573.9`,
  },
  {
    id: `她-1792722412924`,
    drawnStrokes: `296.1,216.7;285.8,249.3;283.4,268.3;277,290.5;264.3,339.8;250,393.7;235,447.7;220.7,497.7;208.8,540.6;200,570.8;195.3,590.6;194.5,601.7;194.5,607.3;203.2,616.8;221.5,636.6;247.7,666;277,701.7;308,731.9;335,753.3;354.8,766;366.7,768.4;369.9,768.4|386.6,410.4;382.6,416;373.9,450.9;369.1,461.2;355.6,498.5;331.8,552.5;304.8,606.5;271.5,658.1;238.9,702.5;211.2,738.3;192.1,762.1;182.6,770;181,769.2|135.7,503.3;158.8,496.1;188.1,494.6;197.7,492.2;230.2,487.4;273.9,477.9;316.7,467.6;359.6,455.7;401.7,440.6;411.2,436.6|481,486.6;483.4,485.8;500.1,485;505.6,485;526.3,477.9;566,465.2;610.4,449.3;653.3,431.8;691.4,415.2;726.3,400.9;757.3,391.4;783.5,385;804.1,383.4;816,384.2;819.2,398.5;819.2,419.1;819.2,447.7;814.4,479.5;807.3,517.6;801.7,561.2;799.4,604.9;796.2,643.8;793.8,670.8;790.6,684.3;787.4,689;783.5,691.4;780.3,693;775.5,694.6;771.6,694.6;766.8,694.6;762,694.6;755.7,693.8;748.6,685.9;740.6,673.2;728.7,648.6;716.8,619.2;712.8,612|691.4,250.9;672.3,283.4;670,304.8;665.2,328.7;655.7,391.4;646.9,464.4;639,541.4;633.5,604.9;626.3,654.9|596.9,242.1;585,275.5;585,293.7;582.6,315.2;577.1,365.2;569.2,423.1;561.2,483.4;550.9,546.2;539,604.1;527.1,658.1;518.4,704.9;512.8,747;512,781.1;512,804.9;522.3,822.4;542.2,834.3;568.4,842.2;600.9,845.4;639.8,846.2;678.7,846.2;716,846.2;750.9,846.2;781.1,845.4;806.5,841.4;828.7,834.3;846.2,824;858.9,809.7;871.6,780.3;886.7,727.1;907.3,673.2;918.4,649.3`,
  },
  {
    id: `她-1792722441851`,
    drawnStrokes: `331.8,154.8;331,162.7;323.9,190.5;318.3,208.8;310.4,231.8;291.3,289;269.1,352.5;250.8,411.2;239.7,456.5;234.2,490.6;231.8,520.8;231.8,549.3;243.7,582.7;267.5,619.2;303.2,659.7;340.5,699.4;377.1,728.7;399.3,746.2;406.4,749.4|423.9,387.4;420.7,392.2;414.4,422.3;413.6,433.4;401.7,466.8;379.4,519.2;348.5,577.9;309.6,638.2;269.1,691.4;236.6,731.9;211.9,759.7;207.2,764.4|102.4,523.1;106.4,523.1;133.4,523.9;140.5,523.9;170.7,523.9;219.1,522.3;275.4,506.5;331.8,484.2;388.2,461.2;440.6,437.4;478.7,419.9|482.6,500.9;486.6,500.1;505.6,497.7;531.8,492.2;562.8,484.2;597.7,475.5;635,466;675.5,455.7;715.2,445.3;754.9,435;791.4,423.9;824.8,415.2;852.5,407.2;873.2,401.7;886.7,399.3;892.2,396.9;893.8,396.9;893.8,400.9;893.8,416.8;893.8,443.8;892.2,477.1;888.3,516;882.7,554.1;876.4,591.4;869.2,624.7;861.3,655.7;853.3,680.3;843.8,700.1;836.7,712.1;828.7,714.4;820,715.2;811.3,715.2;800.1,710.5;789,701.7;777.9,691.4;766,679.5;755.7,670;745.4,658.1;741.4,648.6|732.7,135;724.7,166.7;725.5,173.1;723.2,198.5;714.4,246.1;704.9,308;693.8,383.4;684.3,464.4;675.5,540.6;666.8,604.1;657.3,645.4|605.7,270.7;611.2,286.6;611.2,319.9;611.2,329.4;611.2,362.8;608,412;601.7,461.2;593.8,511.2;582.6,564.4;571.5,616;561.2,662.8;552.5,702.5;546.9,731.9;546.1,750.2;546.9,756.5;556.5,760.5;572.3,764.4;593.8,769.2;619.2,777.1;648.5,784.3;679.5,789.8;712.8,796.2;747,802.5;779.5,808.9;808.1,816;831.9,822.4;848.6,824.8;862.1,826.4;875.6,826.4;890.6,824.8;904.9,817.6;916,808.1;924.8,796.2;930.3,781.1;937.5,757.3;950.2,709.7;953.4,693.8`,
  },
  {
    id: `她-1792722452912`,
    drawnStrokes: `300.8,158;300.1,162.7;297.7,197.7;290.5,241.3;279.4,288.2;265.9,334.2;251.6,381;238.9,424.7;227,466;216.7,502.5;207.2,535;199.2,560.4;192.9,581.1;189.7,594.6;188.1,602.5;188.1,607.3;188.1,609.7;188.1,610.4;188.9,610.4;190.5,610.4;191.3,610.4;192.1,610.4;192.9,610.4;195.3,610.4;202.4,615.2;216.7,631.9;238.9,658.1;264.3,685.1;291.3,712.1;318.3,732.7;340.5,750.2;354.8,766;363.6,781.1;367.5,795.4;368.3,810.5;368.3,816.8|413.6,427.1;381.8,462;373.1,476.3;362,496.1;339.7,538.2;315.1,585;286.6,634.3;255.6,683.5;225.4,730.3;198.4,768.4;177.8,795.4;163.5,808.1|98.4,505.7;108.8,499.3;148.4,488.2;156.4,486.6;185,483.4;227,480.3;270.7,475.5;314.3,467.6;355.6,457.2;365.1,454.9|462.8,500.9;473.1,496.1;495.3,494.6;508.8,490.6;523.9,485;561.2,473.9;599.3,463.6;640.6,453.3;681.9,439.8;721.6,426.3;762,415.2;800.1,404.1;832.7,397.7;855.7,394.5;868.4,393.7;874.8,393.7;877.1,393.7;877.1,402.5;877.1,419.1;874,444.5;868.4,475.5;863.7,516;860.5,562;858.9,608.1;858.1,650.1;858.1,680.3;855.7,697.8;851,704.1;846.2,706.5;842.2,706.5;838.3,706.5;832.7,706.5;823.2,706.5;808.9,706.5;789.8,693;771.6,675.5;755.7,655.7;747,646.2|717.6,157.2;709.7,251.7;707.3,277.8;703.3,308.8;694.6,375.5;687.4,452.5;678.7,533.5;671.6,602.5;661.2,647.8;650.1,666.8|565.2,273.1;564.4,286.6;564.4,329.4;564.4,339;562.8,367.5;558,408;551.7,451.7;543.8,503.3;535.8,560.4;527.1,613.6;520.7,659.7;514.4,697.8;509.6,730.3;506.4,754.9;506.4,773.2;506.4,786.7;506.4,797;508,804.9;514.4,811.3;523.9,816;538.2,819.2;558.8,823.2;582.6,828.7;608.8,837.5;635.8,847;662,856.5;689,862.9;712,866.8;735.1,868.4;758.1,868.4;780.3,867.6;799.4,863.7;816,860.5;827.1,858.1;833.5,857.3;836.7,857.3;837.5,857.3;839.8,857.3;843.8,857.3;847,856.5;851,855.7;854.9,854.9;857.3,854.9;860.5,853.4;864.4,849.4;870.8,830.3;881.1,769.2;887.5,710.5`,
  },
  {
    id: `她-1792722474262`,
    drawnStrokes: `284.2,100;277,140.5;277.8,146.1;272.3,176.2;260.4,219.9;246.9,269.9;231,327.1;216.7,388.2;203.2,447.7;192.1,498.5;182.6,539;175.4,566;170.7,584.3;168.3,593;168.3,594.6;173.8,595.4;184.2,602.5;204,620.8;234.2,655.7;268.3,695.4;303.2,731.1;331.8,756.5;354,774;364.4,779.5|427.1,362.8;421.5,369.9;401.7,406.4;396.9,417.6;382.6,454.1;356.4,508;322.3,566;281,623.9;240.5,677.1;208,718.4;183.4,742.2;170.7,747|118.3,484.2;144.5,471.5;154.8,469.9;180.2,469.9;223.9,465.2;269.1,458.8;316.7,452.5;367.5,443;390.5,435.8|408,511.2;430.2,507.3;462,506.5;472.3,504.9;506.4,495.3;559.6,478.7;613.6,458.8;669.2,435;723.9,408;779.5,385;830.3,367.5;873.2,356.4;900.2,355.6;910.5,361.2;911.3,383.4;911.3,413.6;905.7,450.9;897.8,493;892.2,539.8;886.7,587.4;881.9,633.5;876.4,670;870.8,691.4;863.7,696.2;860.5,696.2;858.1,696.2;856.5,696.2;855.7,694.6;852.5,692.2;847,686.7;835.1,677.1;815.2,664.4;789,650.9;764.4,640.6;745.4,632.7;733.5,622.4|714.4,165.1;699.3,216.7;697,233.4;692.2,268.3;676.3,335;655.7,416.8;637.4,506.5;628.7,584.3;624.7,640.6;620,671.6|539.8,250.9;540.6,271.5;540.6,292.9;539.8,306.4;537.4,319.9;531.8,347.7;525.5,377.9;519.1,405.6;512,436.6;505.6,468.4;501.7,500.9;497.7,531.9;495.3,560.4;493.7,584.3;493.7,602.5;493.7,619.2;493.7,635.9;493.7,652.5;493.7,667.6;494.5,681.9;495.3,694.6;496.1,707.3;496.9,716.8;498.5,724.8;500.1,731.1;500.9,735.1;502.5,739;504.1,742.2;505.6,744.6;507.2,746.2;509.6,747.8;511.2,748.6;513.6,749.4;516,749.4;517.6,750.2;520.7,750.2;523.9,750.2;526.3,751.7;530.3,753.3;534.2,754.9;539,756.5;543,758.1;549.3,760.5;556.5,762.1;564.4,764.4;574.7,766.8;585,768.4;597.7,769.2;611.2,770.8;627.1,772.4;644.6,774;663.6,774.8;683.5,776.4;703.3,778.7;722.4,781.1;741.4,784.3;759.7,786.7;777.1,789.8;794.6,792.2;812.1,793.8;829.5,794.6;846.2,794.6;862.1,794.6;877.1,785.9;893.8,769.2;912.1,742.2;935.1,699.4`,
  },
  {
    id: `艹-1792714177927`,
    drawnStrokes: `221.5,237.4;227.8,237.4;250,235.8;254.8,235.8;270.7,235.8;297.7,237.4;334.2,237.4;380.2,237.4;433.4,237.4;485.8,237.4;535.8,237.4;581.9,237.4;625.5,237.4;664.4,237.4;696.2,242.9;719.2,250.1|306.4,119.1;303.2,145.3;304,167.5;307.2,191.3;312,247.7;316.7,311.2;319.1,343.7|592.2,124.6;594.6,143.7;594.6,185;594.6,207.2;594.6,229.4;597.7,272.3;605.7,318.3;616,363.6;625.5,404.1`,
  },
  {
    id: `说-1792722605643`,
    drawnStrokes: `307.2,105.6;312,125.4;326.3,142.9;331.8,148.5;349.3,172.3;372.3,216.7;377.1,230.2|193.7,389;209.6,382.6;231.8,377.1;237.3,374.7;254.8,369.1;277.8,363.6;300.8,359.6;321.5,358;337.4,358;346.1,358.8;347.7,375.5;347.7,405.6;334.2,447.7;322.3,492.2;315.1,535;309.6,575.5;307.2,612;306.4,641.4;306.4,663.6;306.4,678.7;306.4,691.4;308.8,699.4;317.5,702.5;330.2,702.5;359.6,669.2;394.5,610.4;420.7,563.6;442.9,539|487.4,150.8;487.4,157.2;499.3,182.6;504.1,189.7;520.7,210.4;550.9,238.2;579.5,256.4|793,154.8;789,158.8;774.7,175.4;762.8,192.9;758.9,197.7;745.4,217.5;740.6,226.3|470.7,292.1;469.1,326.3;471.5,342.1;474.7,359.6;483.4,394.5;489.8,426.3;495.3,450.9;497.7,455.7|481.8,302.5;487.4,300.9;512.8,298.5;520.7,298.5;547.7,296.1;589,289.8;631.9,285;673.1,279.4;711.2,274.7;747.8,272.3;778.7,271.5;797,271.5;803.3,271.5;803.3,277.1;802.5,295.3;795.4,321.5;788.2,350.9;784.3,380.2;782.7,407.2;782.7,414.4|512.8,453.3;528.7,457.2;564.4,457.2;585,457.2;607.3,457.2;650.1,454.1;689.8,447.7;729.5,443;747.8,442.2|615.2,431.8;614.4,458;614.4,473.1;612.8,490.6;602.5,529.5;584.2,570.8;560.4,611.2;531.8,647;504.1,678.7;478.7,701.7|681.1,485;693.8,503.3;693.8,519.2;693.8,529.5;692.2,542.2;686.6,572.3;680.3,603.3;675.5,632.7;672.3,657.3;671.6,676.3;671.6,688.2;671.6,695.4;673.1,701.7;681.1,707.3;692.2,711.3;705.7,712.1;718.4,712.1;732.7,712.1;749.3,712.1;764.4,711.3;779.5,711.3;794.6,710.5;811.3,709.7;826.3,706.5;838.3,700.1;844.6,692.2;845.4,680.3;845.4,662;845.4,627.9`,
  },
  {
    id: `饭-1792725082958`,
    drawnStrokes: `285,162.7;282.6,172.3;280.2,193.7;277,200.1;266.7,223.1;249.3,257.2;227.8,293.7;204,327.1;186.5,349.3;183.4,352.5|254,273.9;272.3,261.2;287.4,262.8;292.9,262.8;308.8,262.8;335.8,262.8;366.7,263.6;398.5,263.6;429.4,263.6;454.1,263.6;470.7,263.6;477.1,263.6;477.1,265.1;471.5,275.5;452.5,296.9;430.2,327.1;408,359.6;388.2,387.4;371.5,412.8;361.2,427.9|330.2,320.7;325.5,342.1;325.5,377.1;324.7,385.8;320.7,417.6;313.6,465.2;304.8,520;295.3,577.1;285,634.3;277,689;273.1,738.3;272.3,783.5;272.3,810.5;274.7,817.6;278.6,817.6;285.8,809.7;301.6,786.7;323.1,754.9;354,715.2;385.8,670.8;411.2,634.3|798.6,140.5;798.6,142.9;794.6,159.6;780.3,177.8;775.5,181;759.7,194.5;730.3,212.8;693.8,232.6;650.1,251.7;610.4,267.5;577.9,281.8;550.1,295.3;528.7,306.4;523.9,308.8|546.1,292.9;539,302.5;539,323.1;539,337.4;539,354.8;539,400.9;539,460.4;539,527.1;529.5,591.4;519.1,649.3;509.6,699.4;500.1,743;489.8,781.9;475.5,814.5|560.4,495.3;563.6,496.1;579.5,496.1;599.3,496.1;606.5,496.1;630.3,496.1;667.6,494.6;705.7,490.6;743,485.8;777.9,482.6;809.7,480.3;835.1,477.9;851,476.3;858.1,476.3;859.7,476.3;858.1,485.8;847.8,508;825.6,540.6;793,581.9;755.7,625.5;717.6,672.4;683.5,716;654.9,754.1;637.4,784.3;633.5,798.6|558.8,513.6;561.2,516;579.5,528.7;608.8,554.9;617.6,565.2;644.6,597;683.5,645.4;725.5,693.8;773.2,737.5;822.4,771.6;870,793.8;912.9,808.1;939.1,820`,
  },
  {
    id: `饭-1792725095896`,
    drawnStrokes: `311.2,101.6;304,113.5;299.3,142.9;296.1,154;281.8,192.9;257.2,250.1;228.6,312;194.5,377.1;158.8,437.4;126.2,491.4;100.8,534.2;89.7,548.5|228.6,304.8;230.2,308;242.9,313.6;254,314.4;259.6,314.4;285.8,316;319.1,316;353.2,316;385,313.6;413.6,308;439.8,302.5;461.2,299.3;473.9,297.7;477.9,297.7;477.1,303.2;467.5,316.7;454.8,338.2;440.6,369.1;423.1,405.6;404,443;398.5,450.9|317.5,384.2;308,422.3;308,440.6;308,460.4;308,508;305.6,564.4;300.8,624.7;296.9,685.1;293.7,740.6;292.1,789.1;291.3,831.1;291.3,866.1;291.3,893.8;290.5,910.5;289.7,913.7;289.7,902.6;304,871.6;333.4,829.5;371.5,782.7;389.8,761.3|929.5,177.8;918.4,186.6;899.4,194.5;868.4,209.6;829.5,227.8;783.5,244.5;741.4,255.6;700.1,264.4;658.1,271.5;617.6,281.8;579.5,293.7;560.4,300.1|558,301.7;561.2,306.4;566,330.2;567.6,337.4;571.5,365.2;572.3,412.8;572.3,472.3;560.4,534.2;540.6,593;519.9,644.6;501.7,694.6;483.4,747;464.4,798.6;446.9,843.8;432.6,866.1;429.4,866.8|557.2,508.8;577.9,508.8;603.3,508.8;619.2,508.8;636.6,508.8;673.1,505.7;712,500.9;751.7,496.9;789,493;825.6,489.8;859.7,484.2;891.4,476.3;915.2,469.2;930.3,463.6;932.7,462.8;931.9,466.8;913.7,491.4;892.2,527.9;866,575.5;836.7,633.5;801.7,697;766,761.3;730.3,819.2;699.3,867.6;677.1,902.6;664.4,915.3|551.7,512;557.2,527.9;580.3,558.1;587.4,569.2;612.8,602.5;652.5,661.3;699.3,731.9;749.3,798.6;794.6,846.2;835.1,870.8;870.8,882.7;900.2,886.7;907.3,886.7`,
  },
  {
    id: `鱼-1792714248657`,
    drawnStrokes: `421.5,100.8;416,120.7;407.2,145.3;400.1,160.4;392.9,174.7;375.5,201.6;353.2,227.8;326.3,248.5;299.3,263.6|377.1,185.8;399.3,191.3;423.1,191.3;435.8,191.3;450.9,191.3;482.6,191.3;519.1,191.3;559.6,187.4;600.9,181;642.2,175.4;678.7,170.7;708.1,168.3;726.3,168.3;732.7,168.3;733.5,173.9;733.5,181.8;726.3,196.9;709.7,218.3;688.2,246.9;665.2,271.5;643,292.9|308.8,319.9;317.5,334.2;317.5,363.6;317.5,383.4;319.1,405.6;320.7,455.7;320.7,508.8;320.7,555.7;320.7,589.8;320.7,601.7|315.9,331.8;325.5,340.6;351.7,339.8;359.6,339.8;385,339.8;423.1,339.8;462,336.6;502.5,328.7;543,322.3;584.2,317.5;625.5,314.4;662,313.6;689.8,313.6;707.3,313.6;716.8,313.6;721.6,315.2;723.9,317.5;724.7,320.7;724.7,329.4;724.7,352.5;719.2,392.9;708.1,442.2;700.1,497.7;695.4,552.5;693.8,600.9;693.8,627.9|346.1,499.3;361.2,496.9;381,496.9;394.5,496.9;412,497.7;452.5,500.9;500.9,504.9;549.3,506.5;595.3,506.5;635.8,505.7;662.8,496.1|518.4,328.7;516.8,359.6;516.8,368.3;517.6,401.7;523.9,457.2;529.5,518.4;537.4,577.1;543,625.5;548.5,651.7|296.9,636.6;302.4,642.2;322.3,642.2;338.2,642.2;356.4,643;397.7,644.6;448.5,644.6;502.5,643.8;558,634.3;608.8,625.5;653.3,621.6;685,620.8|187.3,808.1;192.1,811.3;215.1,811.3;223.9,811.3;249.3,811.3;292.1,811.3;340.5,811.3;395.3,808.9;453.3,804.9;512,801;571.5,797;628.7,793.8;681.1,789.1;728.7,782.7;770.8,774.8;800.1,768.4;819.2,766;827.9,764.4;827.9,763.7;827.1,762.1`,
  },
  {
    id: `好-20261018145855`,
    drawnStrokes: `288.9,163.9;288.9,164.3;288.9,165.6;288.9,169.2;287.3,176.6;283.5,186.3;279.8,195.7;274.3,209.3;266.8,228.1;257.7,250.1;247.2,275.4;238,301.4;228.3,328.8;217.9,356.1;208.4,381.9;201.7,400.2;196.4,415.7;190.9,433.6;185.7,449.3;182.7,459;181.4,463.4;178.4,471.4;175.5,478.7;174,483;172.2,487.4;170.4,491.7;168.8,495.5;166.6,498.8;164.9,502.4;163.6,505.9;162.2,509;160.9,510.9;159.9,512.8;159.4,514.3;158.9,515.8;158.3,517.4;157.7,518.9;157.3,520.2;157.2,521.2;157.2,522.1;157.1,522.8;157.1,523.3;157.1,523.7;157.3,524.2;158.6,525.5;161,527.6;164.3,531.3;169.4,537.3;177.3,548;184.9,560;192.4,572.2;202.8,589.4;214.5,608.2;228.4,629.9;244.6,656;257,675.9;266.7,690.7;278.8,709.2;286.2,720.5;291.6,726.9;298.2,734.5;302.5,739.8;306,743.7;308.1,745.8;309.6,747;310.7,748;311.1,748.6;311.6,749.2;312.1,749.5|342.4,437.6;342.4,437.9;342.4,441.3;341.9,447.8;340.4,454.6;337.1,464.1;332.2,478.3;326,498.3;318.8,518.7;311.8,538.7;302.9,561.9;293.3,584.3;282.9,607.8;273.4,626.8;266.3,639.3;257,655.1;248.8,667.9;241.1,677.5;232.4,688.8;223,700.9;214,711.5;207.9,718;202.1,724.7;195.4,732.5;189.5,739.4;185.4,744.4;181.7,749.9;177.9,755.3;174.7,759.5;172.5,763.1;171.6,764.5;171,765.7;170.1,767.1;169.6,767.6|125,405.2;124.8,405.2;125.5,405.2;127.9,405.2;132.5,405.2;139.8,405.2;151.6,405.2;164,405.2;180.7,405.2;196,405.2;213.5,405.2;238.7,405.2;258.2,405.2;275.1,404.6;292,403.3;308.1,401.9;319.9,400.7;330.3,399.6;337.7,399;340.2,398.8;342.3,398.4;343.8,398.3;345,398.2|533.7,145.4;533.5,145.4;533,145.4;534.2,145.4;538.2,145.4;554.5,145.4;568.1,145.4;592.4,145.4;616.5,145.4;641.9,145.4;672.5,145.4;703.6,146.2;728.1,147.1;748.4,147.9;771.9,149.4;786.5,150.2;796.5,150.8;806.1,151.4;812.5,151.4;819,151.7;823.5,152.1;825.9,152.4;827.3,152.9;828.1,153.2;828.5,153.5;828.6,154;827.9,155.2;825.9,156.8;821.9,158.8;816.5,161.9;811.4,165;804.7,168.7;795,174.5;780.2,183.5;762.2,194.9;745.5,206.3;726.7,218.6;706.8,232.2;691.7,243.3;677.3,253.3;661.7,264.7;652,272;644.6,277.3;636.5,283.2;631.3,286.8;627.8,289.3;624.3,291.8;621.8,293.6;620.4,294.5;619.6,295|619.6,294.6;619.6,295;619.6,297.3;619.6,313.8;619.6,358;619.6,627.4;619.6,680.7;619.6,703.1;619.6,724.5;619.6,741.2;619.6,749.1;619.6,751.6;619.6,754;619.6,756.3;619.6,757.8;619.6,759.3;619.6,760.7;619.6,761.6;619.6,762.5;619.6,763.1;619.8,763.6;620,764.1;620,764.6;620,765.1;620.2,765.3;620.4,765.1;620.4,764.4;620.4,762.4;620.1,759.5;618,756;614.6,751.7;611.5,748.2;607.6,744.6;602.6,740;598.3,735.8;593.6,731.9;588,727.6;583,723.5;578.9,720.3;575.3,717.6;571.8,714.9;569.4,712.7;567.8,711.1;566.3,709.9;565.1,708.4|477,466.1;476.8,466.1;477.7,466.1;484.6,466.1;493.9,466.1;505.6,466.1;525.5,466.1;550.8,466.1;582.1,465.3;617.1,464.4;654.5,464.3;693.4,464.2;726.6,464.2;747.5,464.2;765.5,464.2;780.2,464.2;788.2,464.6;798.5,465.2;810.4,466.4;818.1,467.5;821,467.8;823.7,468.1;825.4,468.4;826.6,468.7;827.5,468.8;828.2,468.8;828.8,469;829.3,469.3;829.5,469.5;829.7,469.7`,
  },
  {
    id: `好-20261018145953`,
    drawnStrokes: `327.3,89.4;327.3,90.2;327.3,92.5;327.3,99.2;326.4,109.7;324.7,123.8;321.2,143.1;316.1,165.3;311.1,191.7;304.7,224.3;297.5,257.9;291.2,291;285.9,324.8;282.3,350.2;279.5,374.2;276.8,402.7;274.1,430;271.8,450.3;269.6,467.6;266.8,487.6;263.9,506.3;261.1,523.3;258.5,537.8;256.8,547;254.7,554.7;252.5,563.7;251.5,568.4;250.3,572;249.3,575.6;248.7,578.4;248.1,580.4;247.2,581.6;246.7,582.4;246.6,582.9;246.6,583.3;247.5,584.8;249.6,587.6;252.9,591.8;266.5,609;275.3,621.1;285,634.9;293.4,646.5;305.4,662;317.1,676.5;325.3,686.7;333.6,697.1;343.6,710.3;353.1,723.5;362.6,736.9;372.1,750.4;381.9,764.3;390.6,777.1;398.5,787.6;404.3,794.5;408.4,800.1;412.6,805.8;415.5,809.5;417.3,812;418.3,813.3;418.9,814;419.5,814.5;420,815.1;420.6,815.4|421.3,459.5;421.3,460.1;421.3,462.7;421.3,466.8;421.3,472.9;420,485.8;415.9,503.9;409.6,523.2;400.8,547;389.6,575.5;375.3,605.9;363.1,629.9;349.3,654.5;331.8,683.7;320.1,703.3;308.8,721.3;294.7,742.2;280.7,760.8;267.1,776.6;255.9,789.4;246.3,799.8;236.4,809.2;230.2,815.4;225.6,819;219.3,823.8;215.3,827.1;211.2,830;207.3,832.6;205.2,834.4;202.9,836.3;200.6,837.6;198.8,838.7;198,839.4;197.5,840;196.9,840.3|164.2,455.4;164.6,455.4;167.6,455.4;171.4,455.4;176.1,455.4;182.8,455.4;190.5,455.4;199.3,455.4;206.6,455.4;211.4,455.4;218.9,455.4;225.5,455.4;230.6,455.4;236.8,455.4;240.8,455.4;245.3,455.4;248.7,455.4;251.8,455.4;257,455.4;262,455.4;265.6,455.4;269.5,455.4;273.9,455.4;277.7,455.4;280.6,455.4;282.7,455.4;284.3,455.4;285.1,455.4;285.6,455.4;286,455.4;286.3,455.4;286.9,455.4;287.4,455.4;287.8,455.4;288.3,455.4;288.8,455.4;289.3,455.4;289.8,455.4;290.6,455.4;292.1,455.4;294.1,455.4;296.5,455.4;300.5,455.4;305.6,455.4;310.1,455.4;315.7,455.4;323.4,455.4;332,455.8;340,456.7;347.5,457.6;355.3,458.6;362.2,459.6;368.5,460.5;372.9,461.4;376.4,461.7;379.3,462;381.7,462.4;384,462.4;385.5,462.4;387.4,462.4;390.2,462.4;393.4,462.4;396.9,462.4;400.4,462.4;403.9,462.4;407.1,462.4;409.6,462.4;411.6,462.4;413.1,462.1;413.9,461.8;414.4,461.8;414.9,461.8;415.3,461.8;415.8,461.8|542.6,222.6;542.3,222.6;543,222.6;547.9,222.6;556.7,222.6;569.4,222.6;587.3,222.6;604.2,222.6;624.7,222.6;651,222.6;672.1,223.1;691.8,224.3;714,225.7;734.9,227.7;750,229.7;761.7,231;771.4,231.7;778.1,232.6;782.4,233.9;783.9,234.5;784.6,234.9;784.8,235.2;784.9,235.7;784.9,236.4;784.9,237.5;783.3,239.1;779.8,241.4;775.3,244.3;769.2,248.5;761.9,254.1;753.1,261.7;738.8,273.8;723.6,287.4;714.5,297;707.1,305;694.7,318.7;682.7,331.9;673.6,341.5;663.7,352.9;655.5,362.3;649.6,369.2;644.3,375.4;639.2,381;635.4,385.3;632.6,387.8;631.2,389.1;630.7,390;630.2,390.2|630.2,390.2;630.2,390.4;630.2,391.4;630.2,395;630.2,401.8;630.2,414.3;630.2,430.5;630.2,447.8;630.2,469.3;630.2,495.5;630.2,523.9;630.2,547.5;630.2,574.1;630.2,608.4;630.2,647.4;631.7,686.3;634.1,720.7;635.3,748.8;637,771.7;638.6,795.6;639,810.1;640.1,820.4;640.7,833.1;640.7,841.2;640.7,847;640.7,850.7;640.7,853.1;640.7,855.3;640.7,856.9;640.7,857.7;640.7,858.3;640.7,858.8;641,859.1;641.2,859;640.1,857.7;637.8,855.6;633.7,851.9;628.2,846.5;622.2,840.1;614.8,831.8;606,821.2;598.3,811.2;592.4,802.6;586.7,794.2;581.5,786.8;576.9,779.3;573.8,773.3;571.6,769.4;568.8,764;566.2,758.8;564.5,755.1;562.8,751.3;561.5,748.5;560.7,746.2;560,744.5;559.4,743.5;559.2,742.6;559.1,741.8;558.9,741.5;558.6,741;558.5,740.3|481.5,510.2;482.3,510.2;489,510.2;501.5,510.2;514,510.2;530.4,510.2;553.8,510.2;583.6,510.2;617.9,510.2;655.2,510.2;693.3,510.2;731.3,510.2;771,510.2;799.8,510.2;821.5,510.2;838.3,510.2;848.2,510.2;860.5,510.2;871.8,510.2;880.3,510.2;886,510.2;889.5,510.2;891.4,510.2;892.3,510.2;893,510.2`,
  },
  {
    id: `好-20261018150011`,
    drawnStrokes: `347.7,151.4;347.7,153;347.7,160.4;346.4,175.1;344.2,189.2;340.5,207.4;333.8,234.6;323.8,272.6;314.6,307.3;307,335.6;297.7,371.6;287.2,411.1;278.8,444.5;273,473.9;267.5,504.3;264.2,524.4;260.5,541.8;256,563.9;253.8,583.1;251.3,597.5;249.5,605.8;248.6,611.7;247.3,619.7;246.7,626.6;246.1,631.6;245.7,635.3;245.1,638.2;244.4,640;244.3,641;244.3,641.5;244.3,642.1;244.3,642.6;244.3,643.1;244.9,643.7;246.9,645.2;249.7,647.6;256.1,653.9;267,664.2;279,675.6;292.3,688.8;307.9,704.4;321.2,717.7;331,727.1;343.1,739.7;357.4,754.5;370.1,767.3;380.9,778.2;388.2,785;394.1,790;400.2,794.7;404.3,797.8;407,800.1;409,801.8;410.5,802.7;411.2,803.1;411.6,803.5;412.1,804;412.4,804.5;412.7,804.8|417.9,476.4;417.9,477;417.9,481.7;417.9,492.4;415.8,508.1;412.5,522.9;407.8,540.6;397.6,572.6;388.2,602.5;377.7,633.1;365.4,663.5;355.4,685.5;341.2,713.3;329.1,735.2;318.9,753.3;305.8,773;294.5,788;285.3,800;276.8,809.8;269.8,817.4;265.9,821;263.3,823;259.7,825.9;255.7,828.7;252.4,831.2;250.1,832.7;248.4,833.6;247.4,834.3;246.6,834.6;246.3,834.5|169.7,492.3;169.7,492.1;169.9,491.9;171.5,491.9;174.8,491.9;180.8,491.9;189.7,491.9;203.5,491.9;217.6,491.9;232.4,491.9;257.8,491.9;276.7,491.9;297.1,491.9;319.2,491.9;335.7,491.9;354.9,491.9;370.1,491.9;379.8,491.9;387.1,491.9;394.6,491.9;399.1,491.9;403,491.9;405.5,491.9;407,491.9;408.4,491.9;409.1,491.9;409.8,491.9;410.3,491.9;410.8,491.9;411.3,491.9;411.8,491.9;412.2,491.9;412.6,491.5;413.1,490.9;414.4,490.2;415.2,490;415.7,489.8;416.3,489.5;416.8,489.2;417.2,489;417.7,488.7;418.1,488.7;418.3,488.5|533.4,180.9;533.6,180.9;535.9,180.9;541.8,180.9;551.2,180.9;563.1,182.1;578.3,183.9;597.6,185.3;618.2,186.8;639.8,188.3;654,189;665.7,189;682.5,189.5;698.7,190.6;710.1,191.3;718.5,191.5;727.8,191.6;734.4,191.6;738.3,191.6;740.6,191.6;741.9,191.6;742.5,191.6;742.7,191.8;742.7,192.3;742.7,193.2;742.7,194.8;742.4,197;740.7,200.3;736.9,205.6;728.9,214.8;718.2,226.8;706.8,240.2;692.8,255.7;677.5,273.3;660.7,292.5;642.9,311.9;630.7,326.1;623,335.4;612.7,347.8;604.3,358.6;598.1,366;591.7,373.6;587.1,378.9;583.9,382.4;581.8,384.4;580.8,385.5;580.1,386.1;579.8,386.7|579.8,386.7;579.8,387.1;579.8,389.5;579.8,396.2;579.8,406.5;579.8,420.8;580.5,439.8;581.8,461.7;584,487;586.7,518.8;588.8,555.1;591.5,589;593.8,614.9;596.5,649.5;598.7,684.1;599.1,702.3;599.6,716.1;601.1,732;602.4,747.6;602.8,757.1;603.3,764.2;603.4,769.4;603.4,772.5;603.4,773.7;603.6,774.2;603.9,774.7;603.9,775.2;603.5,775.2;601.9,774.1;599.2,771.8;595.6,768.3;590.5,762.7;584.5,756.8;577.9,749.6;570.6,741.4;564.5,734.8;559.9,729.2;554.6,723.4;549.6,717.4;546.7,713.4;544.1,710.7;541.5,707.8;539.8,705.2;538.2,701.8;536.8,697.3|473.8,511.2;473.8,510.9;474.4,510.7;478.2,510.7;485.6,510.7;495.4,510.7;509.9,510.7;530.3,510.7;553.7,510.7;579.5,510.7;598.4,510.7;623.9,510.7;649.5,510.7;661.2,510.7;678.4,510.7;696.8,510.7;712.8,510.7;724.7,510.7;733.3,510.7;741.4,510.7;747,510.7;750.9,510.7;753.3,510.7;754.3,510.7;754.8,510.7`,
  },
  {
    id: `十-synthetic-positive`,
    drawnStrokes: `109,458;177,478;373,444;819,395;869,401;932,424|456,89;484,97;522,133;512,307;507,933`,
  },
  {
    id: `一-20261019230729`,
    drawnStrokes: `231.6,551.2;231.4,551.2;231.8,551.2;233.8,551.2;237.5,551.2;245.2,551.2;257,551.2;273.9,551.2;293.3,551.2;318,551.2;351.2,549.4;388.5,546.6;441.1,543.2;488.1,540.2;517.3,538.1;552.9,535.6;594.8,533.4;638.2,529.7;671,526.5;696.9,524.3;724.1,520.3;740.3,517.4;751.3,515.6;763,513.3;771.9,511.2;777,509.9;779.7,509.4;782.6,508.7;785.5,507.7;788.2,506.6;790,505.9;791.7,505.2;793.4,504.6;795,503.9;796.6,503.3;798.2,502.7`,
  },
  {
    id: `好-20261017000000`,
    drawnStrokes: `313.7,195.4;313.7,195.6;313.7,196.4;313.7,198.9;313.4,202.2;312.2,205.6;311,210.1;310.1,214.2;308,220.3;305.1,228.2;302.1,236.5;298.8,246.2;294.8,257.1;290.7,268.3;285.8,279.8;280.7,293.2;275.7,306.4;269.3,319.7;264.2,333.6;259.3,346.5;253.9,358.4;245.5,379.1;242.6,385.8;233.9,408.3;231.7,414.5;229.3,420.7;227,426.1;224.9,431.3;222.8,436.4;220.7,440.9;218.7,445.4;215.8,452;213.1,457.4;211.5,460.7;209.1,465.8;206.9,470.8;204.1,476.4;201.2,482.6;198.8,488.7;196.4,494.4;194.1,500.1;191.9,505.5;189.8,510.2;187.5,515.8;186,520.2;184.5,524.8;182.2,531.2;180.3,536.9;178.8,541.5;177,546.8;175.3,551.6;174,556.5;172.6,561.3;171.4,565.4;170.7,568.7;170,571.5;169.2,574.9;168.5,577.8;167.9,580.1;167.1,583;166.5,585.3;166.1,587;165.9,588.6;165.3,590.6;164.9,592.3;164.6,593.5;164.3,594.7;164.3,595.5;164.1,596;163.8,596.5;163.8,596.9;163.8,597.3;163.6,597.8;163.4,598.2;163.3,598.7;163.1,599.3;162.9,599.8;162.6,600.9;162.2,602.8;161.9,604.8;161.2,607.2;160.5,609.6;159.8,612;159.1,614.8;158.1,617.2;157.2,619.1;156.9,620.6;156.5,622.1;156,623.4;155.8,624.4;155.5,625.2;155.2,626.1;154.9,627.2;154.6,628.1;154.6,628.7;154.6,629.2;154.6,629.6;154.6,630.1;154.4,630.4;154.4,630.6;155.9,631.8;158.9,634.4;162.5,638;167.2,643.2;173.1,650.1;179.6,657.7;186.3,666.6;191.8,674.5;197.1,682;203.7,691.7;210.6,702;217.9,712.4;225.2,722.8;232.3,732.4;238.7,741.2;244.4,749.6;249.7,757.1;253.8,762.8;257.6,767.6;262.3,772.8;266.1,777.3;269.5,781.7;272.5,785.6;274.8,788.5;277.1,791.6;279.5,794.4;281.3,796.6;282.8,798.7;284.1,800.3;285.4,802;286.6,803.3;287.5,804.1;288,805.2;288.5,806;289,806.5;289.5,807.3;290.1,808.1;290.5,808.8;291,809.7;291.6,810.9;292.1,812;292.7,813.2;293.3,814.4;293.9,815.6;294.5,816.7;295.1,817.9;295.6,819;295.9,819.9;296.1,820.5;296.3,821.1;296.5,821.6;296.8,822.1;296.8,822.7;296.8,823.2|329.9,479.3;329.9,479.5;329.9,480.2;329.9,481.7;329.9,483.6;329.9,485.2;329.9,487.2;329.9,491.2;329.9,495.7;329.9,499.2;329.9,503.3;329.5,508.9;328.3,516;326,524;322.7,532.3;318.6,541.5;313.1,553.7;306.3,566.4;299.7,577.4;292.8,589.2;287.1,599.5;281.4,609.6;275.6,620.6;269.9,630.6;264.2,641.5;259.9,651.3;255,660.5;250,669.4;244.8,678.8;238.2,689.7;232.4,700.1;226.4,710.8;219.2,721.6;212.1,731.7;205.1,741.6;197.6,751.4;191.6,758.7;186.1,766;179.2,775.1;172.3,784.4;165.4,792.8;158.6,800.4;153.2,806.1;148.9,810.6;144.2,815.4;140.1,819;136.8,821.9;134.1,824.2;132.1,825.9;130.8,827.1;130,827.9;129.2,828.5;128.7,829;128.4,829.4;128.3,829.9;127.8,830.3;127.5,830.8;127.3,831.3;126.8,831.8;126.3,832.1;126,832.3;125.7,832.6;125.5,832.8|59.7,440.8;60.1,440.8;61.3,440.8;63.9,440.8;67.1,440.8;70.6,440.8;75.2,440.8;80.3,440.8;86.4,440.8;93.9,440.8;101.9,440.8;109.1,440.8;116.4,440.8;125.3,440.8;133.4,440.8;139,440.8;146.2,440.8;154.9,440.8;161.9,440.8;167.8,440.8;176,440.8;187.3,440.8;198,440.8;204.8,440.8;209.3,440.8;217.3,440.8;226,440.8;231.2,441.2;235.8,441.6;240.6,442;244.8,442.8;248.4,443.5;251,443.9;253,444.3;254.9,444.6;256.8,444.6;258.7,444.6;260.2,444.6;262.1,444.6;264.8,444.6;267.7,444.6;270.6,444.6;273.5,444.6;276.5,444.9;279.1,445.2;281.6,445.3;284.6,445.6;287.4,446;290.8,446;294.2,446.3;297,446.7;299.3,446.7;302.1,447;305.5,447.4;308.3,447.4;310.8,447.4;313.5,447.7;316.1,448;318.6,448.1;321.1,448.4;323.1,448.7;325,449;326.9,449.3;328.4,449.5;329.9,449.8;331.4,449.9;332.7,450.1;334,450.4;334.9,450.4;335.5,450.7;336.1,450.9;336.6,450.9;336.9,451.2|475.4,234.8;476.3,234.8;478.4,234.8;482.3,234.8;488.2,234.8;494.8,234.8;502.9,234.8;513.5,234.8;522.7,234.8;532.7,234.8;545.7,234.8;560.7,234.8;577.3,234.8;593.9,234.8;610.3,234.8;625.6,234.8;635.8,234.8;648.9,234.8;661,234.8;667.8,234.8;675.3,234.8;681.1,234.8;686.9,234.8;692,234.8;696,235;699.4,235.4;703.4,235.8;707.5,236.6;711.2,237.4;714.2,238.1;716.7,238.8;718.7,239.1;720.2,239.1;721.3,239.1;722,239.3;722.4,239.5;722.9,239.6;723.3,239.6;723.7,239.8;723.8,240.2;723.8,241.1;723.5,241.8;721.9,243.4;718.9,246;714.6,249.9;707.9,255.6;700.1,262.2;692.5,268.8;683.8,276.9;676.2,284.2;668.9,290.5;659.5,299.3;650.5,308.1;641.5,317;632.3,326.1;623.8,335.1;615.4,343.5;607.9,351.1;602.6,356.9;597.9,361.1;592.7,365.9;588.6,370.4;585.3,374.1;582.9,376.3;580.2,378.5;578,380.6;577.1,381.7;576.4,382.5;575.9,382.9;575.6,383.5;575.1,384;574.6,384.5;574.1,385;573.6,385.5;573,385.9;572.1,386.3;571.3,386.8;570.4,387.6;569.3,388.4;568.4,389;567.5,389.8;566.7,390.6;566.1,391.2;565.6,391.7;565.3,392.2;565,392.7;564.5,393.2;564.1,393.6;563.9,394.1;563.7,394.3;563.5,394.5;563.3,394.8;562.8,395.1;562.3,395.4;561.8,395.8;561.3,396.3;560.5,397.1;559.7,397.9;558.8,398.7;558,399.6;557.4,400.4;556.9,401.2;556.4,401.7;555.9,402.2;555.7,402.7;555.4,403.2;555.2,403.6;555,403.8;554.8,404.1;554.5,404.5;554.1,405;553.6,405.4;553.4,405.8|553.4,405.8;553.4,406;553.4,407.6;553.4,410.5;553.4,414.5;553.4,420.3;553.4,428.4;553.4,441.8;554,459.4;555.3,478.7;557.6,502.5;560.1,529.5;562.7,558.9;566.1,588.9;569.5,618.8;572.3,643.6;574.8,664.9;577.7,684.8;579.9,703.9;581.7,725.9;583.8,745.4;585.8,761.8;587.2,776.5;588.5,789.9;589.2,798.7;589.8,805.4;590.3,812.8;590.3,818.7;590.7,823.8;591.1,828.3;591.1,832.2;591.5,836.1;591.9,840;592.2,843.3;592.5,846.7;593,850.8;593.4,854.9;593.4,859;593.4,863.1;593.9,867.8;594.3,872.5;594.7,877;595.1,880.6;595.4,883.7;596,887.5;596.5,891;596.8,893.8;597.2,896.1;597.3,897.9;597.3,898.9;597.3,899.6;597.3,900.1;597.3,900.2;596.8,899.5;595.9,898.6;594.3,897;591.7,894.8;588.5,891.9;584,888.4;578.9,883.8;573.6,878;567.6,872;560.8,865.7;555.4,860.9;551.6,857;542.1,848.8;538.7,845.8;535,842.9;531.3,840.3;527.5,838.2;523.5,836.1;511.3,830.1;503.2,825.2;502.2,824.3;501.3,823.4;500.7,822.5;500.1,822.2;499.9,821.9;499.6,821.7|398.7,519.4;398.5,519.4;399.4,519.4;402.1,519.4;410.2,519.4;423.9,519.4;439.1,519.4;457.1,517.9;478.7,514.9;496.8,512.5;516,510.7;541.2,507.5;566.8,504.4;587.8,503.1;608.7,501.9;632.2,501;653.8,500.2;675.3,499.4;695.4,498.7;713.1,497.9;727,497.9;734.7,497.9;742.4,497.9;751.4,497.9;757.9,497.9;764.4,497.9;770.2,497.9;774.2,497.9;777.6,497.9;781.2,497.9;784.8,497.9;788.4,497.9;791,497.9;793.4,497.9;796.3,497.9;798.2,497.9;799.3,497.9;800.8,497.9;802.2,497.9;803.2,497.9;804.4,497.9;805.7,497.9;807.1,497.9;808.5,497.9;809.8,497.9;811,497.9;812.1,497.9;813.3,497.9;814.1,497.9;814.6,497.9;815.1,497.9;815.6,497.9;816,497.9;816.3,498.1`,
  },
  {
    id: `牛-20261019204742`,
    drawnStrokes: `342.4,204.8;342.4,205;342.4,206.7;342.4,210.6;342.4,215.4;342.4,225;342.4,236.9;341.4,246.5;338.3,260;332.6,280;326.1,300.3;321.1,313.4;315.6,326;308.2,341.4;302.1,352.2;296.2,362;289,373.6;281.8,385.1;273.9,396.4;266.7,406.2;260,416.3;254.8,423.9;250.6,429.8;246.2,435.7;243.5,440;241.4,443.8;239.7,445.6;238.8,446.4;238.5,447.1;238.4,447.5|308.3,350.3;308.8,349.8;310.9,349.2;316.3,349.2;326.3,349.2;342.3,348.6;362.9,345.9;385.1,342.3;410.3,339.8;436.3,336.5;454.1,334.1;471,333.3;491.4,331.1;505.6,329.7;518,329.3;533,328.7;547.2,328.6;560.5,328.5;569.5,328.5;575.9,327.6;583.4,326.6;589.5,326.5;595,326.5;599.7,326.5;603.2,326.5;605.5,326.5;607.7,325.9;610.1,325.3|175.8,573.2;176.2,572.7;178.2,571.9;181.1,571.5;187.6,570.9;197.3,570.3;208.6,569.2;225.8,567.4;258.4,563.6;301,558.5;331.4,555;381.4,546.9;445.7,538.2;476.1,535.6;501.1,533.4;538.4,529.9;575.1,526.9;602.1,525.5;625.5,524.4;651.5,523.4;672.1,523.3;689.8,523.3;706,523.3;719.6,523.3;730.2,523.3;738,523.3;743.7,523.3;749.7,523.3;756.9,523.3;763.3,523.3;768.4,523.3;772.8,523.3;776.1,523.3;779.1,523.3;781.6,523.3;783.1,523.3;783.9,523.3;784.5,523.3;785.4,523.3;786.5,523.3;787.6,523.1;788.8,522.8;789.7,522.6;790.3,522.3;790.9,522;791.4,521.8|466.1,263.1;465.5,263.1;465,263.3;465,264.9;465,269.6;465,277.4;465,291.3;465.7,310.9;467.7,331.4;471.2,363;475.1,400.4;477.8,435.7;481,476.4;484,517.2;486.7,553.5;488.5,577.5;488.5,598.4;489,620.7;489.7,639;490,658.6;490.1,677.7;490.1,694.4;490.1,709;490.1,722.9;490.1,735.4;490.1,747.5;490.1,758.1;490.1,765.5;490.1,769.9;490.1,774.5`,
  },
  {
    id: `八-1794570133216`,
    drawnStrokes: `376.3,138.1;373.9,165.9;373.9,175.4;373.1,204.8;365.1,258.8;351.7,319.9;333.4,389.8;311.2,461.2;286.6,527.1;264.3,580.3;247.7,621.5;237.3,653.3;233.4,667.6|546.9,176.2;543.8,180.2;539,208.8;539,219.1;541.4,254;559.6,313.6;587.4,393.7;625.5,496.1;665.2,606.5;700.9,697.7;731.1,755.7;744.6,781.9`,
  },
  {
    id: `山-1794544625301`,
    drawnStrokes: `293.7,208.8;298.5,227.8;298.5,264.3;299.3,277;299.3,325.5;299.3,400.1;299.3,469.9;299.3,530.3;300.1,575.5;301.6,605.7;303.2,624.7;305.6,635;309.6,641.4;313.6,646.2;318.3,650.9;322.3,654.1;326.3,656.5;331,658.9;336.6,661.2;343.7,663.6;354.8,667.6;369.1,670.8;389.8,673.9;418.3,676.3;454.8,677.1;494.5,677.1;537.4,677.1;581.1,671.6;627.9,666.8;669.2,664.4;701.7,664.4;717.6,664.4;721.6,664.4;723.9,664.4;727.1,664.4;729.5,664.4;732.7,664.4;737.4,664.4;743,664.4;749.3,663.6;756.5,658.9;762.8,650.9|522.3,73.8;515.2,74.6;504.1,87.3;504.1,105.6;504.1,111.9;504.1,133.4;505.6,169.9;508.8,214.3;512,262.7;513.6,315.1;515.2,372.3;517.6,426.3;519.9,471.5;520.7,506.4;521.5,533.4;521.5,555.7;521.5,575.5;521.5,595.3;521.5,613.6;521.5,628.7;521.5,639;521.5,644.6;521.5,646.9;521.5,650.1;521.5,653.3;521.5,657.3;521.5,661.2|718.4,139.7;714.4,146.9;708.1,185;708.1,198.4;708.1,235;708.1,289.7;708.1,350.9;709.7,412.8;713.6,471.5;716.8,523.9;719.2,571.5;722.4,616.8;726.3,662;729.5,699.3;733.5,722.4;737.4,730.3;739.8,730.3`,
  },
  {
    id: `兄-1794544601020`,
    drawnStrokes: `327.8,254;324.7,294.5;324.7,317.5;324.7,345.3;324.7,408.8;321.5,475.5;318.3,536.6;313.6,589.8;312,607.3|332.6,232.6;342.9,233.4;381,235;389,235;417.5,235;458.8,235;500.9,232.6;539,228.6;573.1,227.8;599.3,227.8;619.2,235.8;631.1,256.4;635,278.6;637.4,305.6;637.4,342.1;637.4,388.2;636.6,442.9;635,498.5;635,547.7;635,585;635.8,604.9;638.2,610.4|322.3,577.9;339,569.2;362,569.2;376.3,569.2;390.5,571.5;427.1,577.1;469.1,582.6;518.4,586.6;569.9,588.2;620.8,588.2|419.1,595.3;416.7,600.9;413.6,630.3;413.6,639;413.6,668.4;406.4,708.9;391.3,750.9;372.3,790.6;347.7,827.1;322.3,859.7;297.7,878.7;293.7,881.9|553.3,589.8;551.7,620;549.3,635;546.1,651.7;540.6,685.8;534.2,722.4;527.9,757.3;523.9,786.7;523.9,809.7;523.9,827.1;524.7,839.8;536.6,851.7;550.1,862.1;566,868.4;581.1,875.6;597.7,881.1;613.6,884.3;629.5,887.5;643.8,894.6;654.9,902.5;660.4,908.1;661.2,910.5;663.6,906.5;671.6,900.2;679.5,893;687.4,882.7;694.6,864.4;697,825.6;697,797.8`,
  },
  {
    id: `人-1794543326583`,
    drawnStrokes: `530.3,130.2;531.8,144.5;531.8,177.8;528.7,202.4;523.1,227.8;510.4,285;493.7,350.9;474.7,419.9;452.5,486.6;427.1,550.1;394.5,608;355.6,666.8;306.4,733.5;281.8,758.9|517.6,331;524.7,347.7;536.6,372.3;543.8,391.3;552.5,413.6;570.7,469.9;592.2,542.2;617.6,623.9;650.1,698.5`,
  },
  {
    id: `渴-1794480495217`,
    drawnStrokes: `285,157.2;290.5,166.7;303.2,194.5;304.8,201.6;315.1,227;327.8,257.2;346.1,287.4;350.1,295.3|247.7,445.3;256.4,466;263.5,481.8;267.5,488.2;288.9,519.1;312,557.2;328.6,592.2|283.4,928;304,891.4;309.6,881.9;314.3,871.6;323.9,849.4;349.3,789.8;368.3,729.5|508,94.5;506.4,99.2;503.3,129.4;503.3,139.7;503.3,173;503.3,227;503.3,282.6;503.3,339;503.3,390.5;500.1,416|508,117.5;519.1,111.9;546.1,104;553.3,100.8;573.9,93.7;599.3,88.1;622.3,85.7;643,85.7;658.9,87.3;670,101.6;673.1,127.8;673.1,161.1;672.3,199.2;667.6,234.2;665.2,270.7;666,315.9;666,358.8;666.8,387.4|536.6,270.7;543,269.9;573.1,266.7;580.3,264.3;604.1,258;635.8,248.5;662.8,243.7;672.3,244.5|571.5,382.6;584.2,396.9;612,392.1;620.8,389.8;647.7,382.6;682.7,373.9;702.5,373.1|539,467.5;534.2,477.1;523.9,507.2;522.3,512.8;513.6,531.8;500.1,557.2;483.4,582.6;467.5,602.5;454.1,612|527.1,531.1;530.3,531.1;552.5,532.6;560.4,532.6;582.6,528.7;619.2,521.5;656.5,514.4;692.2,506.4;723.2,497.7;747.8,490.6;764.4,486.6;770,486.6;771.6,489;771.6,513.6;770.8,561.2;762,635;755.7,716.8;754.1,785.1;754.1,831.9;754.1,858.9;754.1,870;753.3,847.8;743.8,792.2;739.8,781.1|651.7,593.8;633.5,623.1;627.1,633.5;616,646.9;593,677.9;571.5,704.1;553.3,728.7;546.1,737.4|594.6,619.2;616.8,634.2;633.5,667.6;642.2,685.8;651.7,704.9;671.6,736.6;689,759.7;696.2,770|472.3,656.5;469.9,663.6;467.5,699.3;467.5,708.9;467.5,736.6;467.5,774;469.9,804.1;479.5,820.8;496.1,824;521.5,824;557.2,816.8;593.8,811.3;620.8,810.5`,
  },
  {
    id: `亿-1794480347549`,
    drawnStrokes: `364.4,65.9;351.7,100.8;346.9,106.4;329.4,136.5;298.5,183.4;254.8,238.9;210.4,296.1;168.3,351.7;132.6,398.5;107.2,435.8;90.5,462;84.9,470.7|296.9,220.7;285,253.2;285.8,257.2;285.8,282.6;280.2,331;272.3,393.7;265.1,461.2;258,530.3;250.8,600.9;244.5,672.3;238.1,736.6;235,788.2;235,816|425.5,213.5;447.7,227;491.4,227;519.9,227;553.3,227;625.5,227;697,227;766,227;826.3,225.4;872.4,223.9;899.4,223.9;910.5,223.9;910.5,233.4;900.2,250;872.4,276.2;831.1,308.8;777.1,354.8;713.6,411.2;642.2,472.3;575.5,531.1;521.5,581.1;481,623.9;450.9,662;432.6,693.8;426.3,714.4;426.3,727.9;447.7,739.8;487.4,748.6;541.4,754.9;597.7,764.4;654.1,773.2;710.4,780.3;765.2,783.5;812.1,784.3;845.4,780.3;862.9,756.5;870,722.4;870,669.2;861.3,581.1;851.7,512.8`,
  },
  {
    id: `饿-1794480186144`,
    drawnStrokes: `240.5,146.9;243.7,194.5;240.5,216.7;232.6,240.5;209.6,295.3;185,353.2;161.1,403.2;143.7,438.2;137.3,446.1|207.2,295.3;211.9,295.3;239.7,295.3;248.5,295.3;275.4,294.5;315.1,289.7;350.1,285;378.6,281.8;396.9,281.8;403.2,283.4;402.5,300.1;397.7,325.5;385,353.2;376.3,381;372.3,400.1|292.9,369.9;283.4,396.9;283.4,417.5;283.4,445.3;280.2,512.8;272.3,589.8;265.1,664.4;259.6,728.7;258,774.7;258,804.1;260.4,812.8;266.7,812.8;278.6,784.3;297.7,719.2;312,689.8|565.2,143.7;570.7,185;569.9,190.5;558.8,218.3;533.4,262.7;507.2,308.8;485,350.9;470.7,377.1|436.6,465.2;457.2,474.7;497.7,474.7;523.9,474.7;554.1,474.7;613.6,471.5;671.6,461.2;723.9,447.7;771.6,433.4;808.9,419.1;832.7,411.2|539.8,249.3;553.3,282.6;558,306.4;561.2,336.6;563.6,412;563.6,512;563.6,624.7;573.1,725.5;585.8,803.3;596.1,857.3;598.5,892.2;598.5,921.6;597.7,930.3;589.8,930.3;574.7,901;549.3,831.1;522.3,775.5;509.6,767.6|440.6,790.6;469.1,785.1;477.9,781.1;505.6,758.1;546.1,714.4;586.6,654.9|674.7,286.6;660.4,319.9;662,328.6;662,368.3;664.4,439.8;669.2,535;681.9,649.3;704.9,754.9;736.6,821.6;763.6,858.1;777.1,866;782.7,866;788.2,849.4;793.8,804.1;799.4,747;804.1,708.1|779.5,537.4;771.6,546.9;747.8,604.9;744.6,624.7;731.9,694.6;721.6,793;719.2,847|779.5,187.3;774,189.7;767.6,219.9;770.8,229.4;781.9,266.7;794.6,308.8`,
  },
  {
    id: `读-1794469859552`,
    drawnStrokes: `281.8,123.8;282.6,129.4;285.8,153.2;288.1,159.6;295.3,177;304.8,203.2;315.9,236.6;318.3,244.5|185.7,396.9;191.3,399.3;218.3,402.5;224.6,401.7;244.5,396.9;269.9,389;294.5,382.6;314.3,380.2;323.1,381;323.1,398.5;323.1,427.9;318.3,460.4;311.2,500.1;299.3,555.7;281,636.6;266.7,710.4;255.6,764.4;250.8,805.7;250.8,838.3;250.8,870;250.8,904.1;250.8,931.9;250.8,947;252.4,958.1;253.2,963.7;253.2,960.5;254,941.4;261.2,926.4;273.1,912.1;292.1,888.3;315.9,862.1;351.7,824;361.2,811.3|481,149.2;483.4,151.6;505.6,156.4;512,156.4;539.8,156.4;578.7,158;618.4,159.6;655.7,162.7;689.8,166.7;697,166.7|594.6,57.2;593.8,70.6;593.8,91.3;593.8,96;593.8,115.9;593.8,150.8;593.8,182.6;591.4,211.9;589.8,239.7;589,264.3;589,269.9|369.9,273.1;393.7,285.8;396.9,284.2;414.4,284.2;443.7,284.2;481,284.2;526.3,284.2;581.1,284.2;636.6,284.2;689,283.4;734.3,277;774.7,273.1;805.7,271.5;827.1,271.5;836.7,271.5;838.3,273.1;838.3,277;838.3,280.2;832.7,283.4;824.8,288.1;817.6,293.7;808.1,299.3;797.8,307.2;785.1,315.1;781.9,318.3|480.2,392.1;482.6,397.7;492.2,413.6;504.9,428.7;507.2,433.4;516.8,450.1;527.1,468.3|442.1,459.6;455.6,479.5;478.7,492.2;485,496.9;500.9,512;512.8,527.9|377.1,585.8;412,582.6;417.5,582.6;444.5,582.6;489,582.6;543,582.6;606.5,582.6;672.3,580.3;741.4,576.3;808.9,570.7;867.6,566;906.5,564.4;920.8,564.4|636.6,342.1;636.6,372.3;636.6,379.4;635,422.3;622.3,489;603.3,561.2;581.9,626.3;558,681.9;527.1,734.3;495.3,786.7;466,833.5;446.9,870.8;443.7,884.3|612.8,573.9;624.7,605.7;623.1,612;632.7,655.7;653.3,723.9;682.7,789;717.6,847.8;747.8,881.9`,
  },
  {
    id: `象-1794190577845`,
    drawnStrokes: `375.5,81;371.5,111.9;369.9,125.4;363.6,139.7;345.3,175.4;317.5,217.5;281.8,257.2;244.5,286.6|340.5,176.2;367.5,176.2;378.6,176.2;393.7,176.2;433.4,176.2;481,173.8;529.5,171.5;576.3,169.1;616,166.7;643,166.7;654.9,166.7;656.5,172.3;656.5,189.7;637.4,218.3;610.4,252.4;587.4,286.6;567.6,317.5|337.4,308.8;341.3,320.7;347.7,345.3;351.7,362;353.2,382.6;354,432.6;354,482.6;354,531.1;352.4,551.7|351.7,307.2;365.9,310.4;385.8,310.4;393.7,310.4;418.3,310.4;460.4,310.4;508.8,310.4;561.2,309.6;610.4,307.2;653.3,305.6;689.8,305.6;719.2,305.6;746.2,305.6;770.8,305.6;791.4,305.6;809.7,305.6;820.8,305.6;826.3,306.4;827.1,311.2;827.1,316.7;827.1,324.7;827.1,333.4;827.1,344.5;827.1,362.8;825.6,398.5;818.4,448.5;808.9,497.7;801.7,537.4;793,562.8|331,548.5;350.1,553.3;367.5,553.3;379.4,553.3;395.3,553.3;441.4,553.3;503.3,553.3;569.9,553.3;636.6,548.5;697.7,542.2;754.1,539.8|585.8,299.3;584.2,311.2;584.2,332.6;584.2,348.5;582.6,365.1;569.9,410.4;546.9,460.4;519.1,507.2;482.6,553.3;439.8,596.1;396.1,634.2;363.6,662.8;345.3,680.3|569.9,436.6;573.1,462.8;574.7,475.5;577.9,489;584.2,523.9;588.2,566;589,612.8;589,660.4;589,704.1;588.2,747;585.8,788.2;584.2,827.1;584.2,862.1;584.2,891.4;583.4,913.7;581.1,931.1;578.7,941.4;576.3,947.8;574.7,949.4;571.5,949.4;566.8,949.4;560.4,949.4;546.9,947;523.9,944.6;488.2,943|581.1,695.4;573.9,704.9;555.7,720.8;547.7,726.3;519.9,743.8;469.1,768.4;412.8,792.2;358.8,814.4;315.9,835.1;297.7,840.6|564.4,795.4;558,833.5;550.1,835.9;540.6,840.6;505.6,855.7;449.3,880.3;392.1,902.5;348.5,918.4|796.2,612.8;780.3,617.6;767.6,623.1;749.3,631.1;704.9,650.9;654.9,671.6;609.6,691.4;589.8,697.7|579.5,704.9;587.4,714.4;604.1,732.7;614.4,742.2;623.9,753.3;643,774;666,797.8;696.2,825.6;741.4,854.1;793,882.7;845.4,907.3;891.4,929.5`,
  },
  {
    id: `吧-1794184095095`,
    drawnStrokes: `312,324.7;310.4,345.3;310.4,376.3;310.4,396.9;311.2,417.5;315.9,458.8;319.9,497.7;321.5,533.4;321.5,548.5|314.3,325.5;338.2,323.9;350.1,323.9;362.8,323.9;389.8,323.9;416,323.9;440.6,323.9;458.8,323.9;468.3,323.9;469.1,337.4;467.5,370.7;460.4,417.5;455.6,463.6;454.8,502.5;454.1,535;452.5,557.2;451.7,574.7;449.3,589;443.7,596.1|340.5,573.9;354,574.7;376.3,574.7;381.8,573.9;400.9,568.4;426.3,561.2;448.5,555.7|578.7,246.1;596.1,238.9;626.3,238.9;635,238.9;662,238.9;699.3,238.9;735.1,238.9;766.8,237.3;790.6,235;802.5,235;804.1,245.3;801.7,273.9;784.3,312.8;767.6,358;753.3,401.7;745.4,437.4;743,465.2;743,482.6;743,492.9|673.1,323.1;672.3,360.4;672.3,363.6;672.3,385.8;671.6,415.2;669.2,445.3;666.8,466.8|585.8,481.8;602.5,493.7;627.9,493.7;644.6,493.7;662,493.7;697,492.9;730.3,489.8;760.5,488.2|598.5,253.2;603.3,288.1;603.3,306.4;603.3,331;597.7,381;587.4,438.2;575.5,498.5;563.6,558.8;553.3,611.2;546.1,650.9;543,676.3;543,693;543,704.1;554.9,708.9;577.1,709.7;610.4,709.7;651.7,704.1;689.8,703.3;726.3,703.3;754.9,703.3;777.1,694.6;792.2,677.1;795.4,663.6`,
  },
  {
    id: `冫-1794184026570`,
    drawnStrokes: `343.7,179.4;351.7,202.4;360.4,242.9;368.3,269.1;377.1,296.9;399.3,356.4|298.5,797;300.1,783.5;304.8,757.3;308.8,750.1;325.5,720.8;360.4,674.7;404.8,616;414.4,598.5`,
  },
  {
    id: `一-1794183317007`,
    drawnStrokes: `199.2,481.8;224.6,478.7;233.4,478.7;245.3,481;271.5,489;305.6,499.3;348.5,507.2;396.1,512;447.7,512.8;498.5,512.8;547.7,512.8;597.7,512.8;643.8,514.4;686.6,516;723.2,516;749.3,516`,
  },
  {
    id: `菜-1793676031405`,
    drawnStrokes: `254,84.1;259.6,80.2;291.3,65.9;302.4,62.7;341.3,56.4;404.8,54;474.7,54.8;552.5,59.5;635,70.6;716.8,74.6;798.6,72.2;853.3,49.2|477.1,-45.2;471.5,-38.9;462.8,-4.8;461.2,5.6;459.6,38.1;459.6,89.7;469.9,140.5;473.9,151.6|666.8,40.5;664.4,42.9;659.6,72.2;656.5,82.6;651.7,115.1;649.3,161.9;649.3,196.9|718.4,246.9;662.8,260.4;634.2,272.3;599.3,286.6;528.7,321.5;461.2,350.9;395.3,370.7;332.6,383.4;274.7,394.5;230.2,402.5|385.8,379.4;389.8,385;414.4,414.4;422.3,421.5;450.1,444.5;478.7,464.4|569.9,407.2;579.5,418.3;604.1,446.1;620,463.6;635,477.1;648.5,487.4|777.9,359.6;741.4,381;739,385;722.4,404;698.5,438.2;675.5,470.7|299.3,662.8;304,660.4;340.5,656.5;354,656.5;392.9,654.9;450.9,649.3;515.2,645.4;579.5,641.4;636.6,639;678.7,638.2;685,638.2|554.1,524.7;554.9,534.2;553.3,581.9;550.1,597.7;542.2,646.9;531.8,722.4;524.7,797;521.5,862.1;516.8,904.1;508,920.8;505.6,920.8|523.1,673.9;513.6,688.2;504.1,709.7;499.3,718.4;482.6,744.6;459.6,776.3;434.2,808.9;408,835.9;385,857.3;380.2,859.7|580.3,695.4;591.4,700.1;621.5,723.9;626.3,731.1;642.2,750.9;668.4,779.5;697,810.5;717.6,833.5`,
  },
  {
    id: `飞-1793674611159`,
    drawnStrokes: `173.8,199.2;198.4,185.7;211.9,180.2;227,173.8;258.8,163.5;296.1,156.4;335.8,151.6;373.9,148.4;402.5,146.9;419.9,146.9;427.1,146.9;427.9,149.2;427.9,151.6;427.9,156.4;427.9,166.7;427.9,189.7;430.2,221.5;436.6,257.2;442.9,292.9;449.3,332.6;454.8,382.6;461.2,434.2;470.7,485;483.4,532.6;494.5,576.3;504.1,618.4;508.8,646.2;516,673.9;523.1,699.3;529.5,721.6;535,740.6;539,753.3;540.6,758.9;543,763.6;546.9,770;554.1,778.7;581.1,810.5;585,811.3;590.6,813.6;598.5,816;609.6,820;618.4,822.4;624.7,824;627.9,824.8;631.9,823.2;649.3,785.1;689.8,708.9;714.4,658.9|581.1,231;578.7,250;576.3,281;573.1,288.1;562,311.2;542.2,340.5;517.6,365.9;496.9,388.2;485.8,410.4;483.4,415.2|485.8,434.2;500.9,450.9;520.7,461.2;531.8,467.5;543.8,474.7;570.7,489;600.9,505.6;634.2,524.7`,
  },
  {
    id: `的-1793674571945`,
    drawnStrokes: `477.9,97.6;439,139.7;426.3,154;412,167.5;381.8,201.6;355.6,234.2;344.5,246.9|229.4,282.6;230.2,312;230.2,323.1;230.2,362;230.2,428.7;230.2,509.6;235.8,598.5;239.7,679.5;238.9,742.2;238.9,775.5;238.9,786.7;238.9,793.8|222.3,300.1;230.2,294.5;254.8,285;260.4,285;278.6,284.2;315.9,283.4;365.9,281.8;416.7,274.7;460.4,265.1;495.3,254.8;521.5,247.7;538.2,245.3;548.5,245.3;553.3,246.9;553.3,254.8;553.3,268.3;550.9,291.3;541.4,330.2;532.6,387.4;527.1,454.8;525.5,524.7;525.5,591.4;525.5,646.2;523.9,688.2;519.1,723.9;512.8,758.1;508.8,792.2;508.8,814.4|253.2,559.6;259.6,561.2;296.1,562.8;305.6,562.8;340.5,562.8;389.8,562.8;439.8,562.8;487.4,569.9;498.5,572.3|303.2,797.8;297.7,798.6;307.2,790.6;344.5,772.4;356.4,769.2;391.3,762;439,758.9;481,760.5;512,776.3;518.4,782.7|711.2,179.4;707.3,198.4;692.2,229.4;687.4,239.7;662,285.8;637.4,323.1;617.6,352.4;604.1,366.7|675.5,285.8;695.4,287.4;727.9,287.4;738.2,287.4;767.6,287.4;806.5,287.4;839,287.4;864.4,294.5;880.3,309.6;886.7,332.6;886.7,361.2;884.3,394.5;870,433.4;854.1,483.4;842.2,539.8;836.7,594.6;835.1,643.8;832.7,687.4;827.9,719.2;821.6,744.6;814.4,762;807.3,770;800.1,774.7;795.4,777.9;790.6,779.5;787.4,779.5;785.1,779.5;776.3,779.5;760.5,777.9;744.6,767.6;739.8,756.5|676.3,458;677.1,475.5;685.8,502.5;688.2,509.6;697,539.8;710.4,577.1;725.5,611.2;728.7,618.4`,
  },
  {
    id: `请-1793667896558`,
    expectedIssues: [
      {
        kind: `wrong-stroke-order`,
        handwriting: { strokeIndex: 4 },
        reference: { strokeIndex: 4 },
      },
      {
        kind: `wrong-stroke-order`,
        handwriting: { strokeIndex: 5 },
        reference: { strokeIndex: 5 },
      },
    ],
    drawnStrokes: `293.7,69.1;296.9,78.6;296.9,108;296.9,127.8;298.5,146.9;308.8,186.5;322.3,219.9;331,231.8|187.3,431.8;219.9,423.1;226.2,420.7;246.1,410.4;271.5,396.9;298.5,384.2;322.3,372.3;341.3,365.9;353.2,364.4;356.4,369.1;356.4,395.3;352.4,435;342.9,491.4;335.8,557.2;329.4,630.3;325.5,707.3;322.3,781.9;321.5,841.4;321.5,878.7;321.5,892.2;329.4,893;339.7,893;354.8,893;377.1,881.9;404.8,846.2;436.6,792.2;466,731.9;478.7,702.5|528.7,117.5;539.8,105.6;548.5,105.6;559.6,105.6;581.9,105.6;606.5,109.5;632.7,113.5;659.6,116.7;689,118.3;716,119.9;743,121.5;766,123;782.7,127|558.8,251.6;571.5,238.9;578.7,238.9;586.6,238.9;609.6,237.3;637.4,236.6;666,235.8;693.8,233.4;721.6,228.6;734.3,225.4|473.9,366.7;479.5,368.3;501.7,361.2;516,356.4;531.8,351.7;569.2,342.1;608,335;649.3,330.2;690.6,326.3;732.7,322.3;773.2,320.7;808.9,320.7;821.6,320.7|652.5,29.4;631.9,17.5;631.9,45.2;631.9,89.7;631.9,142.1;631.9,192.1;631.9,238.1;637.4,277;645.4,308;647.7,321.5|579.5,469.1;583.4,494.5;583.4,514.4;583.4,538.2;584.2,592.2;585,643.8;585,690.6;585,736.6;584.2,780.3;578.7,823.2;573.9,859.7;572.3,873.2|579.5,460.4;584.2,451.7;607.3,445.3;635,438.2;662,431.8;685.8,428.7;706.5,426.3;723.9,425.5;738.2,425.5;748.6,447.7;753.3,487.4;756.5,537.4;759.7,589;763.6,645.4;771.6,708.1;779.5,771.6;784.3,825.6;786.7,858.1;787.4,872.4;788.2,878.7;784.3,878.7;773.2,874;760.5,870;748.6,866;735.9,854.9;729.5,843.8|597.7,599.3;606.5,604.1;616.8,597.7;623.9,593;631.9,589.8;650.9,582.6;671.6,579.5;695.4,578.7;716,578.7;733.5,585.8;739.8,592.2|623.1,717.6;636.6,707.3;655.7,707.3;669.2,707.3;683.5,707.3;712.8,707.3;729.5,707.3`,
  },
  {
    id: `坐-1793593305196`,
    drawnStrokes: `419.1,92.9;423.1,109.5;413.6,137.3;403.2,155.6;392.1,175.4;362.8,221.5;335,266.7;312,297.7;293.7,326.3|371.5,223.9;374.7,230.2;390.5,258;395.3,265.9;411.2,289.7;435.8,325.5;442.1,333.4|657.3,132.6;643.8,149.2;636.6,173.8;633.5,181.8;614.4,215.9;582.6,265.9;554.1,310.4;534.2,348.5;531.1,356.4|609.6,255.6;620,280.2;628.7,291.3;642.2,304.8;659.6,322.3;683.5,343.7;702.5,363.6|273.9,422.3;297.7,436.6;302.4,435;322.3,435;360.4,435;406.4,433.4;455.6,431;507.2,430.2;558,429.4;604.1,426.3;646.2,419.9;677.9,415.2;684.3,414.4|515.2,103.2;504.1,119.1;505.6,146.1;505.6,155.6;505.6,187.3;505.6,246.9;505.6,323.9;505.6,407.2;508,483.4;508.8,549.3;508.8,600.9;507.2,642.2;503.3,677.9;501.7,684.3|200.8,702.5;218.3,702.5;277,703.3;288.1,703.3;326.3,703.3;385.8,703.3;450.1,707.3;515.2,710.4;580.3,710.4;643,709.7;701.7,696.2;758.1,685;804.9,678.7;816,677.9`,
  },
  {
    id: `我-1793338521366`,
    expectedIssues: [
      {
        kind: `reversed-stroke`,
        handwriting: { strokeIndex: 0 },
        reference: { strokeIndex: 0 },
      },
    ],
    drawnStrokes: `353.2,272.3;370.7,281;380.2,277.8;385.8,277;404,269.9;435,258.8;467.5,248.5;502.5,239.7;540.6,230.2;581.1,221.5;611.2,215.9|335,484.2;342.1,480.2;374.7,468.3;381.8,463.6;411.2,450.9;457.2,431;510.4,409.6;568.4,390.5;621.5,375.5;666.8,362.8;697,354;708.9,353.2|484.2,387.4;486.6,414.4;486.6,422.3;487.4,447.7;489,486.6;490.6,523.9;490.6,562;490.6,604.1;490.6,647.7;490.6,688.2;490.6,722.4;490.6,747;490.6,758.1;490.6,762;481,759.7;462,750.1;437.4,729.5;422.3,681.9|321.5,593.8;353.2,587.4;366.7,580.3;381.8,571.5;424.7,544.5;479.5,504.9;532.6,466.8;558.8,454.1|569.2,271.5;580.3,311.2;580.3,325.5;581.1,341.3;584.2,377.1;588.2,424.7;593,481.8;600.1,535;614.4,577.9;629.5,611.2;647.7,639.8;667.6,669.2;688.2,697.7;708.1,721.6;724.7,741.4;739,755.7;751.7,764.4;762.8,767.6;768.4,767.6;770,765.2;770,755.7;770,743;779.5,718.4;791.4,681.1;801.7,639.8|757.3,484.2;745.4,525.5;743,531.1;725.5,561.2;690.6,617.6;650.1,672.3;608.8,719.2;566,758.9;540.6,781.9|796.2,192.1;801.7,191.3;824.8,190.5;828.7,191.3;843,196.1;871.6,196.9;907.3,196.9`,
  },
  {
    id: `饿-1793328418643`,
    drawnStrokes: `254.8,206.4;252.4,215.1;247.7,254;245.3,262;237.3,287.4;226.2,320.7;215.1,353.2;204.8,385.8;198.4,407.2|258,288.1;262,285;286.6,280.2;295.3,280.2;319.1,275.4;358.8,267.5;394.5,262;423.9,259.6;442.9,259.6;447.7,262.7;446.1,273.9;427.9,291.3;401.7,315.1;381.8,340.5;371.5,359.6;369.1,372.3|312,339;311.2,346.9;309.6,380.2;309.6,388.2;309.6,414.4;309.6,458;309.6,508;309.6,561.2;308,608.8;304.8,646.2;302.4,677.1;300.1,698.5;298.5,712;296.9,721.6;296.1,728.7;295.3,735.1;295.3,739;295.3,743;295.3,745.4;295.3,747.8;295.3,750.1;295.3,752.5;297.7,753.3;300.1,753.3;307.2,748.6;323.9,716.8;344.5,678.7;366.7,639;390.5,604.1;402.5,585.8|618.4,123.8;623.1,139.7;615.2,165.1;605.7,186.5;597.7,208;577.9,247.7;555.7,277.8;534.2,294.5;525.5,299.3|534.2,337.4;549.3,350.9;573.1,350.1;580.3,350.1;606.5,347.7;646.2,345.3;688.2,343.7;727.9,342.9;769.2,340.5;807.3,337.4;842.2,332.6;862.9,325.5|615.2,224.6;615.2,255.6;615.2,275.4;616.8,296.1;624.7,354;635,416.7;644.6,479.5;653.3,535.8;661.2,589;666.8,635;670.8,669.2;672.3,693;673.9,711.2;676.3,732.7;678.7,754.1;680.3,772.4;681.1,783.5;681.1,785.9;681.1,783.5;674.7,773.2;659.6,755.7;641.4,735.9;620.8,716.8;599.3,704.1;584.2,699.3;578.7,694.6|554.1,658.9;553.3,656.5;574.7,634.2;581.1,627.9;604.1,604.1;636.6,562.8;668.4,519.1;681.9,497.7|709.7,204.8;708.1,210.4;707.3,243.7;709.7,255.6;717.6,289.7;732.7,344.5;750.1,405.6;766,468.3;781.1,522.3;791.4,565.2;799.4,594.6;803.3,620.8;807.3,640.6;810.5,655.7;812.8,663.6;813.6,666.8;816,668.4;818.4,670;820.8,672.3;823.2,673.9;824.8,675.5;827.9,675.5;831.1,675.5;834.3,675.5;836.7,675.5;846.2,658.9;866,616;891.4,565.2;895.4,554.1|857.3,458.8;849.4,465.2;825.6,492.2;821.6,498.5;808.9,523.9;787.4,554.9;765.2,581.9;744.6,600.9;739.8,604.1|806.5,163.5;816,186.5;836.7,220.7;843,229.4;862.1,260.4;879.5,293.7`,
  },
];

const negativeHandwritingExamples: readonly ShapeContextGraderTestExample[] = [
  {
    id: `热-1792983399289`,
    drawnStrokes: `168.3,296.9;175.4,298.5;199.2,298.5;206.4,297.7;231,295.3;268.3,293.7;306.4,292.1;345.3,291.3;387.4,286.6;418.3,279.4|331,137.3;335,146.1;340.5,178.6;340.5,185.7;340.5,215.1;340.5,264.3;339,319.1;339,378.6;339,439.8;339,499.3;339,555.7;340.5,604.1;344.5,637.4;346.1,655.7;345.3,662;345.3,662.8;345.3,660.4;336.6,645.4;313.6,621.5;277,596.1;242.9,580.3;215.1,572.3;210.4,571.5|211.2,493.7;232.6,478.7;273.9,449.3;285,442.1;318.3,416;363.6,379.4;395.3,351.7|579.5,142.1;580.3,156.4;581.1,209.6;581.1,221.5;579.5,258;568.4,313.6;554.9,375.5;538.2,439;519.9,497.7;500.9,547.7;482.6,585.8;471.5,603.3|504.1,315.1;524.7,298.5;554.9,299.3;562.8,297.7;589,294.5;628.7,288.1;667.6,282.6;701.7,277;730.3,274.7;749.3,274.7;757.3,276.2;757.3,292.1;755.7,321.5;747,359.6;739.8,402.5;734.3,442.1;730.3,478.7;727.1,507.2;727.1,531.1;726.3,550.1;726.3,562.8;726.3,572.3;726.3,578.7;726.3,584.2;726.3,589;726.3,593;726.3,594.6;726.3,595.3;728.7,595.3;731.9,596.1;738.2,598.5;745.4,600.1;754.9,602.5;764.4,604.1;774.7,605.7;785.1,604.9;794.6,604.9;802.5,604.9;811.3,604.9;819.2,604.9;827.9,604.9;836.7,604.9;843.8,604.9;851.7,604.9;857.3,602.5;861.3,596.1;862.1,587.4;862.1,572.3;862.1,546.1;862.1,499.3;862.1,458.8|635,394.5;617.6,408;594.6,420.7;587.4,424.7;563.6,440.6;526.3,460.4;487.4,478.7;452.5,491.4;444.5,493.7|296.9,747.8;269.1,777.9;266.7,781.9;254.8,799.4;234.2,825.6;211.2,849.4;192.9,863.7|417.5,735.1;419.9,741.4;433.4,771.6;438.2,778.7;453.3,801.7;477.1,828.7;502.5,854.9;519.9,870.8|572.3,754.1;576.3,759.7;593.8,789.8;597.7,797;614.4,818.4;635.8,849.4;655.7,874;667.6,884.3|712.8,758.1;735.1,777.1;758.9,806.5;764.4,813.6;781.9,838.3;822.4,899.4`,
  },
  {
    id: `热-1792983385587`,
    drawnStrokes: `157.2,280.2;170.7,288.1;198.4,286.6;208.8,286.6;239.7,281;283.4,273.1;324.7,266.7;362,263.5;392.9,262;398.5,262|303.2,98.4;292.1,115.1;293.7,149.2;293.7,159.6;294.5,195.3;294.5,254;294.5,321.5;294.5,396.1;294.5,467.5;294.5,532.6;294.5,585.8;294.5,623.1;294.5,645.4;296.1,660.4;296.9,665.2;294.5,663.6;280.2,638.2;262,600.1;243.7,567.6;231,548.5|161.1,539.8;168.3,522.3;191.3,504.1;198.4,498.5;227.8,480.2;268.3,451.7;311.2,418.3;343.7,389|570.7,141.3;572.3,190.5;572.3,196.1;569.2,223.1;558.8,265.9;546.1,313.6;531.1,366.7;516.8,421.5;505.6,470.7;498.5,510.4;489,538.2;473.1,558.8;468.3,563.6|467.5,286.6;471.5,281;496.1,280.2;504.1,279.4;527.1,275.4;561.2,269.9;594.6,263.5;624.7,258;653.3,251.6;680.3,247.7;703.3,246.1;720.8,246.1;731.9,254;735.1,269.1;735.1,288.1;729.5,312.8;716.8,343.7;708.1,377.1;701.7,414.4;697,450.9;693.8,485;691.4,512.8;689.8,530.3;689.8,539.8;689.8,543.8;689.8,545.3|690.6,546.9;693.8,548.5;698.5,550.1;704.1,552.5;708.9,554.1;715.2,557.2;723.2,561.2;731.9,564.4;743,567.6;754.9,569.9;768.4,571.5;781.9,573.9;797,576.3;811.3,578.7;824,580.3;835.9,581.9;845.4,583.4;852.5,582.6;855.7,582.6;858.1,582.6;859.7,582.6;859.7,578.7;860.5,569.2;862.1,550.1;862.9,506.4;862.9,447.7|420.7,485;447.7,469.1;454.1,464.4;485,445.3;530.3,416;579.5,382.6;589.8,372.3|252.4,762;229.4,795.4;227.8,800.1;213.5,818.4;196.9,843.8;180.2,868.4;168.3,885.1|398.5,738.2;396.1,754.1;412.8,784.3;416.7,793.8;432.6,824.8;452.5,862.9;472.3,885.1;477.1,888.3|517.6,737.4;522.3,746.2;543,782.7;547.7,792.2;564.4,819.2;586.6,858.1;603.3,884.3|676.3,750.9;681.1,756.5;708.1,784.3;714.4,792.2;735.1,814.4;763.6,851;781.9,878.7`,
  },
  {
    id: `热-1792983368601`,
    drawnStrokes: `158.8,269.1;161.9,270.7;187.3,272.3;195.3,272.3;227.8,271.5;277.8,263.5;324.7,256.4;362,253.2;384.2,252.4;387.4,251.6|332.6,96;332.6,101.6;333.4,134.2;333.4,142.9;333.4,174.6;333.4,233.4;333.4,298.5;333.4,369.1;332.6,438.2;332.6,498.5;332.6,550.1;332.6,593;332.6,627.1;332.6,648.5;332.6,654.9;329.4,650.9;322.3,631.9;308.8,603.3;285.8,568.4;263.5,544.5;258,542.2|197.7,539.8;215.9,531.1;247.7,508.8;256.4,502.5;285,481.8;322.3,454.8;359.6,424.7;385.8,404|522.3,159.6;522.3,171.5;523.1,217.5;523.1,226.2;523.1,262.7;522.3,321.5;513.6,384.2;502.5,442.9;487.4,492.2;469.1,531.8;464.4,539|516.8,158.8;519.9,159.6;541.4,161.1;546.9,161.1;565.2,161.1;593,159.6;619.2,155.6;643,152.4;663.6,149.2;681.1,148.4;693.8,148.4;703.3,153.2;706.5,175.4;706.5,211.2;704.9,254;697.7,297.7;693.8,342.1;693,385.8;693,429.4;693,469.1;697.7,497.7;723.9,517.6;730.3,520.7;737.4,524.7;743.8,528.7;750.1,531.8;756.5,535;761.3,535.8;763.6,537.4;766,539;768.4,539;770.8,539.8;773.2,541.4;777.1,542.2;780.3,543;783.5,543.8;787.4,543.8;791.4,544.5;796.2,544.5;800.1,544.5;804.1,544.5;808.9,544.5;813.6,544.5;818.4,544.5;822.4,544.5;826.3,544.5;831.1,544.5;835.1,544.5;838.3,543.8;842.2,540.6;845.4,534.2;847.8,522.3;849.4,503.3;849.4,470.7;849.4,419.1|441.4,400.1;454.1,396.1;491.4,369.1;503.3,362;539.8,337.4;589,304;598.5,295.3|280.2,742.2;273.9,753.3;258.8,796.2;254.8,805.7;242.9,831.9;222.3,870;199.2,904.1;192.9,911.3|413.6,734.3;421.5,753.3;433.4,783.5;444.5,812.1;454.1,836.7;474.7,878.7;492.2,904.1;496.9,908.1|561.2,763.6;579.5,782.7;590.6,808.1;595.3,814.4;611.2,836.7;631.9,865.2;636.6,870.8|689,772.4;697,784.3;726.3,823.2;731.9,829.5;752.5,854.1;778.7,885.9;783.5,894.6`,
  },
  {
    id: `热-1792983355047`,
    drawnStrokes: `151.6,243.7;162.7,238.9;184.2,238.1;190.5,236.6;213.5,231;247.7,224.6;277.8,222.3;303.2,220.7;317.5,219.9|292.9,82.6;291.3,90.5;288.1,122.2;288.1,130.2;288.1,156.4;288.1,198.4;288.1,252.4;288.1,316.7;288.1,387.4;291.3,458;293.7,519.9;295.3,567.6;294.5,596.1;294.5,604.1;291.3,604.1;289.7,604.1;289.7,603.3;287.4,596.9;281,585;267.5,566;251.6,548.5;234.2,537.4;217.5,531.8;212.7,531.1|187.3,498.5;190.5,491.4;208.8,466.8;215.1,461.2;236.6,444.5;268.3,421.5;304,396.1;331.8,376.3|487.4,127;485,134.2;481.8,169.1;481.8,178.6;481.8,209.6;478.7,254.8;469.9,307.2;457.2,366.7;443.7,422.3;427.1,464.4;411.2,480.2|396.9,243.7;423.9,230.2;431,231.8;454.8,231.8;492.9,231;534.2,228.6;576.3,225.4;613.6,220.7;645.4,213.5;668.4,207.2;681.1,205.6;685,206.4;685.8,223.1;685,250.8;681.1,285.8;677.1,323.9;674.7,361.2;673.1,396.9;673.1,428.7;673.1,454.8;673.9,473.1;683.5,481;698.5,482.6;714.4,482.6;731.1,482.6;750.9,482.6;770.8,482.6;791.4,482.6;810.5,479.5;826.3,476.3;836.7,472.3;842.2,469.9;842.2,469.1;841.4,469.1;841.4,467.5;841.4,466;841.4,460.4;841.4,447.7;835.9,414.4;831.1,400.1|284.2,705.7;262,727.9;249.3,754.9;246.1,762;231.8,785.9;211.9,813.6;192.9,834.3;188.1,837.5|407.2,697.7;411.2,709.7;430.2,755.7;435,766.8;454.1,800.1;480.2,839.8;505.6,871.6;521.5,885.1|523.1,713.6;541.4,720;561.2,743.8;566.8,750.9;583.4,774;604.9,804.9;623.9,832.7;628.7,839|680.3,718.4;704.1,745.4;708.1,753.3;727.1,782.7;758.1,826.3;785.9,865.2;806.5,887.5`,
  },
  {
    id: `短-1792983292286`,
    drawnStrokes: `282.6,98.4;275.4,113.5;255.6,163.5;250.8,172.3;235.8,205.6;209.6,251.6;176.2,299.3;139.7,344.5;108,377.8;88.9,389.8|185,273.9;191.3,273.9;220.7,274.7;229.4,274.7;254,274.7;288.9,272.3;322.3,270.7;350.9,268.3;377.1,265.9;393.7,264.3|181,521.5;214.3,520.7;218.3,520.7;242.9,520.7;284.2,519.9;327,514.4;370.7,506.4;396.1,498.5|308.8,296.9;306.4,332.6;307.2,339;307.2,365.1;304.8,409.6;296.1,461.2;281.8,516.8;263.5,578.7;240.5,647.7;214.3,718.4;190.5,777.1;173,813.6;161.1,827.1;159.6,827.1|305.6,535.8;308,543;319.1,577.9;322.3,588.2;333.4,617.6;352.4,664.4;376.3,716;399.3,763.6;418.3,800.1;427.1,813.6|693,123.8;700.9,139.7;704.9,151.6;706.5,155.6;712.8,168.3;723.9,188.9;726.3,194.5|566.8,256.4;566,265.9;566,304.8;566,314.3;571.5,346.1;579.5,390.5;588.2,439;596.1,483.4;600.1,517.6;600.1,521.5|592.2,250;613.6,249.3;639,250;646.9,250.8;673.1,251.6;714.4,252.4;756.5,252.4;789.8,248.5;812.8,245.3;824.8,245.3;830.3,247.7;831.1,265.9;831.1,296.1;830.3,341.3;824.8,389.8;821.6,434.2;818.4,470.7;812.1,493.7;798.6,515.2;794.6,518.4|612.8,539.8;631.1,548.5;659.6,547.7;669.2,547.7;697.7,547.7;738.2,543;776.3,534.2;808.9,527.1;816,525.5|618.4,609.6;623.1,614.4;640.6,642.2;645.4,650.1;659.6,676.3;681.9,712.8;703.3,740.6;722.4,759.7;725.5,762|855.7,627.9;851.7,634.2;840.6,663.6;837.5,670;830.3,692.2;818.4,726.3;804.9,763.6;800.9,773.2|580.3,805.7;585,804.9;610.4,801.7;618.4,800.9;644.6,795.4;685,789;730.3,783.5;779.5,781.1;826.3,778.7;871.6,775.5;910.5,774.7;918.4,774.7`,
  },
  {
    id: `图-1792983175327`,
    drawnStrokes: `248.5,165.9;242.1,203.2;242.9,210.4;242.9,238.1;242.9,284.2;242.9,344.5;242.1,426.3;240.5,518.4;240.5,606.5;240.5,682.7;240.5,744.6;240.5,792.2;240.5,800.9|239.7,175.4;288.1,144.5;292.9,147.6;321.5,142.9;364.4,136.5;413.6,133.4;462.8,133.4;513.6,133.4;564.4,134.2;615.2,138.9;658.9,146.1;690.6,154.8;708.1,168.3;717.6,185;720.8,205.6;722.4,230.2;722.4,263.5;722.4,308;722.4,359.6;722.4,419.1;722.4,488.2;722.4,565.2;722.4,640.6;722.4,702.5;725.5,743.8;725.5,770;725.5,790.6;725.5,808.9;722.4,820.8;720.8,823.2;720,822.4;715.2,821.6;707.3,812.1;693.8,803.3;677.9,797.8;658.1,793;640.6,786.7|386.6,238.1;391.3,242.9;407.2,271.5;412,277.8;425.5,300.1;445.3,330.2;458.8,348.5|353.2,357.2;357.2,363.6;372.3,385.8;377.1,389;392.9,401.7;416,418.3;441.4,437.4;458,450.1|317.5,561.2;339.7,562;377.1,561.2;388.2,559.6;420.7,554.9;466.8,549.3;511.2,543;554.9,538.2;563.6,538.2|497.7,250.8;500.1,262.7;505.6,305.6;505.6,315.1;507.2,346.1;513.6,393.7;518.4,450.9;522.3,513.6;524.7,573.9;529.5,628.7;531.8,674.7;533.4,708.1;533.4,726.3;533.4,734.3;533.4,735.1;533.4,734.3;533.4,733.5|502.5,546.9;494.5,560.4;484.2,585;480.2,593;467.5,616;444.5,646.9;416,678.7;386.6,704.9;361.2,724.7;346.9,734.3;344.5,733.5|535.8,580.3;542.2,583.4;554.1,588.2;565.2,592.2;569.9,596.1;584.2,609.6;609.6,635.8;635,663.6;660.4,688.2;673.1,707.3`,
  },
  {
    id: `请-1792983162689`,
    fails: true,
    expectedIssues: [
      {
        kind: `wrong-stroke-order`,
        handwriting: { strokeIndex: 8 },
        reference: { strokeIndex: 0 },
      },
      {
        kind: `wrong-stroke-order`,
        handwriting: { strokeIndex: 9 },
        reference: { strokeIndex: 1 },
      },
    ],
    drawnStrokes: `523.9,200.8;542.2,205.6;573.9,204;581.9,203.2;612,198.4;650.9,193.7;689,192.1;725.5,192.1;762.8,192.1;786.7,192.1|590.6,314.3;595.3,313.6;616.8,313.6;622.3,313.6;639,313.6;665.2,313.6;692.2,312.8;712.8,312.8|500.9,414.4;492.9,436.6;523.9,434.2;534.2,434.2;565.2,433.4;611.2,430.2;657.3,425.5;702.5,420.7;745.4,413.6;780.3,408.8;785.9,408.8|678.7,97.6;674.7,107.2;670,146.1;670,154.8;670,188.9;670,246.9;670,313.6;670,379.4;670,435.8;670,470.7|528.7,537.4;529.5,558;535,586.6;537.4,595.3;543.8,626.3;553.3,677.9;561.2,734.3;568.4,785.1;573.9,815.2;573.9,818.4|538.2,551.7;541.4,551.7;561.2,551.7;594.6,551.7;604.1,551.7;639,549.3;688.2,543;732.7,535.8;768.4,533.4;789,533.4;794.6,543.8;794.6,580.3;788.2,639.8;781.9,703.3;780.3,752.5;780.3,787.4;780.3,804.1;776.3,807.3;774,806.5|585,707.3;594.6,693.8;625.5,685.8;634.2,683.5;660.4,676.3;697.7,666.8;733.5,661.2;751.7,658.9|621.5,809.7;624.7,812.8;655.7,816;666.8,812.8;696.2,804.1;732.7,796.2;755.7,793.8|221.5,148.4;227,158.8;253.2,201.6;260.4,210.4;281.8,237.3;307.2,271.5;313.6,279.4|162.7,402.5;168.3,402.5;195.3,404;204,404;229.4,400.1;262.7,394.5;293.7,391.3;318.3,391.3;329.4,396.9;330.2,424.7;327,469.1;314.3,525.5;303.2,584.2;292.9,642.2;285,697.7;277.8,750.9;273.1,795.4;271.5,823.2;269.9,831.9;270.7,831.1;285,822.4;315.1,806.5;354,790.6;392.1,781.1;422.3,774;428.7,771.6`,
  },
  {
    id: `师-1792978725612`,
    drawnStrokes: `386.6,160.3;351.7,194.5;345.3,200.8;325.5,219.9;296.9,244.5;266.7,264.3;238.1,279.4;212.7,290.5;194.5,298.5;188.9,302.4|339,210.4;327,261.2;327,277.8;327,297.7;327,350.1;325.5,413.6;324.7,484.2;323.9,558;323.9,631.1;323.9,699.3;323.1,757.3;323.1,794.6;323.1,808.1|483.4,145.3;497.7,138.1;519.9,136.5;537.4,132.6;557.2,128.6;600.1,119.9;648.5,115.1;697,114.3;746.2,114.3;787.4,116.7|461.2,258.8;452.5,287.4;452.5,303.2;452.5,323.1;452.5,363.6;457.2,405.6;462,442.9;466.8,477.1;469.9,496.1|462.8,295.3;467.5,286.6;493.7,285;511.2,280.2;532.6,274.7;579.5,262.7;625.5,256.4;665.2,255.6;703.3,255.6;737.4,262;768.4,273.1;789,284.2;800.1,295.3;805.7,304;806.5,313.6;806.5,328.6;806.5,350.1;808.9,379.4;812.8,416.7;819.2,455.6;825.6,487.4;831.1,511.2;834.3,527.9;835.9,539.8;835.9,544.5;834.3,544.5;821.6,543;801.7,538.2;780.3,533.4;762.8,527.9;747.8,523.1;733.5,516.8|658.1,117.5;641.4,134.9;641.4,148.4;641.4,167.5;641.4,221.5;640.6,292.1;640.6,373.9;640.6,455.6;643,527.1;643,587.4;643,633.5;643,667.6;641.4,693.8;641.4,716;641.4,737.4;641.4,746.2`,
  },
  {
    id: `周-1792977960113`,
    drawnStrokes: `346.1,183.4;346.9,206.4;346.1,241.3;342.9,267.5;339,293.7;331.8,349.3;325.5,406.4;320.7,464.4;317.5,519.9;315.1,573.9;315.1,626.3;315.1,681.9;314.3,735.9|340.5,209.6;342.1,214.3;362,213.5;375.5,210.4;389,207.2;424.7,202.4;465.2,200;510.4,200;560.4,200;612,200;660.4,200.8;704.9,203.2;739,205.6;762.8,210.4;774.7,215.1;778.7,219.1;780.3,224.6;780.3,238.1;780.3,261.2;780.3,290.5;780.3,331.8;778.7,379.4;777.1,435;776.3,489;776.3,535;775.5,569.9;774.7,597.7;773.2,623.9;770,649.3;766,677.1;762,704.9;756.5,735.9;750.9,762.8;745.4,781.1;743,786.7;741.4,786.7;741.4,784.3;741.4,782.7;741.4,781.9;741.4,781.1;741.4,781.9;734.3,781.9;711.2,778.7;680.3,762.8;666,748.6|399.3,354;416,350.9;442.1,350.9;449.3,350.9;473.9,350.1;509.6,348.5;548.5,347.7;586.6,347.7;624.7,347.7;642.2,347.7|529.5,261.2;518.4,283.4;518.4,300.8;518.4,312;518.4,323.1;518.4,349.3;518.4,379.4;519.1,394.5|437.4,442.1;434.2,467.5;434.2,482.6;434.2,502.5;432.6,550.1;431,599.3;429.4,643;426.3,677.9;422.3,700.9;419.9,706.5|436.6,454.1;449.3,440.6;475.5,440.6;490.6,440.6;504.9,442.9;535,450.1;566.8,459.6;594.6,467.5;620,477.1;640.6,487.4;653.3,501.7;654.9,528.7;654.9,562;650.9,600.1;644.6,630.3;640.6,656.5;637.4,678.7;635,698.5;633.5,708.1|439,736.6;445.3,729.5;473.9,726.3;492.2,722.4;511.2,718.4;554.1,713.6;593,713.6;627.1,719.2`,
  },
  {
    id: `和-1793118079580`,
    drawnStrokes: `227.8,263.5;291.3,259.6;296.9,260.4;327.8,260.4;377.1,260.4;429.4,260.4;539,261.2;577.1,262|411.2,57.2;406.4,61.9;412,87.3;413.6,95.3;417.5,129.4;421.5,191.3;423.1,273.9;423.1,367.5;421.5,466;413.6,558;407.2,635;404,689.8;404.8,729.5;404.8,746.2|430.2,264.3;400.1,295.3;400.1,301.6;392.1,329.4;377.8,371.5;358.8,418.3;331.8,463.6;304,503.3;280.2,535;266.7,548.5|445.3,295.3;446.9,296.9;458,318.3;474.7,352.4;480.2,362.8;495.3,399.3;514.4,453.3;530.3,500.1;544.5,543;547.7,551.7|651.7,361.2;648.5,388.2;649.3,394.5;653.3,416.7;663.6,446.9;673.1,477.1;679.5,497.7|644.6,340.5;647.7,337.4;664.4,332.6;683.5,332.6;688.2,332.6;704.9,332.6;726.3,332.6;747,332.6;763.6,332.6;774.7,332.6;781.1,332.6;782.7,333.4;783.5,344.5;783.5,369.1;784.3,401.7;786.7,435;789.8,465.2;793.8,492.2;795.4,519.9;795.4,541.4;795.4,545.3|684.3,525.5;684.3,522.3;695.4,516;714.4,512.8;720,512.8;739,512.8;763.6,512.8;781.9,512.8`,
  },
  {
    id: `停-1793117596216`,
    drawnStrokes: `339,136.5;323.1,172.3;320.7,180.2;307.2,204.8;286.6,242.1;263.5,285.8;236.6,333.4;208.8,381.8;177.8,423.1;150,453.3|269.9,277.8;281.8,315.9;284.2,333.4;288.1,354.8;294.5,410.4;298.5,485.8;304.8,569.2;313.6,645.4;323.9,715.2;333.4,772.4;339.7,813.6|645.4,86.5;647.7,108;648.5,127.8;651.7,136.5;654.1,146.1;658.9,162.7|439.8,231.8;469.9,222.3;481,222.3;492.9,219.9;522.3,213.5;558.8,207.2;601.7,202.4;649.3,198.4;696.2,193.7;741.4,188.9;781.9,182.6|545.3,288.9;554.1,302.4;558.8,327;561.2,340.5;564.4,356.4;570.7,389;573.1,404|551.7,274.7;561.2,271.5;577.9,271.5;587.4,271.5;600.1,270.7;630.3,265.1;658.9,260.4;685.8,258;708.1,257.2;726.3,257.2;734.3,257.2;743.8,269.9;745.4,288.1;745.4,308.8;745.4,328.6;745.4,345.3;745.4,351.7;745.4,358.8;745.4,365.9|558,430.2;592.2,419.1;598.5,417.5;630.3,409.6;662.8,402.5;693.8,394.5;716.8,389.8|467.5,542.2;462,548.5;465.2,559.6;474.7,588.2;477.9,595.3;485.8,620.8;493.7,653.3;500.1,671.6|479.5,530.3;483.4,523.9;501.7,524.7;527.1,519.9;535.8,518.4;562,516;602.5,514.4;644.6,512.8;685,511.2;722.4,506.4;741.4,503.3;774.7,495.3;801.7,485.8;821.6,477.9;831.9,474.7;835.1,474.7;835.1,486.6;835.1,513.6;835.1,544.5;835.1,577.1;835.1,591.4;835.1,603.3;835.1,612.8;834.3,622.3;834.3,630.3;832.7,638.2;831.1,641.4|587.4,599.3;596.1,612;596.9,630.3;596.9,647.7;596.9,654.1;595.3,684.3;582.6,718.4;568.4,750.1;553.3,779.5;539,802.5;529.5,816;525.5,819.2|589.8,593.8;603.3,596.9;618.4,596.9;627.9,596.9;636.6,596.9;658.1,596.1;679.5,591.4;697.7,589.8;710.4,589;716.8,589;718.4,593.8;718.4,609.6;718.4,637.4;718.4,677.1;717.6,718.4;717.6,752.5;717.6,777.1;717.6,793.8;719.2,802.5;726.3,808.1;735.1,810.5;745.4,812.1;758.9,812.1;774.7,812.1;793.8,812.1;812.8,811.3;829.5,805.7;844.6,800.1;858.9,795.4;872.4,792.2;883.5,788.2`,
  },
  {
    id: `牛-20261019230837`,
    drawnStrokes: `327.7,193;327.5,193;327.2,193.4;327.2,194.7;327.2,197.7;327.2,202.5;327.2,208.5;327.2,214.3;327.2,219;326.8,225;325.5,232.6;323.5,240;320.6,247.1;316.5,254.4;312.4,261.6;307.7,269.4;303.4,276.2;298.2,283.2;291.3,294.2;283.8,306.3;274.8,319;265.7,332.2;256.2,346.4;248,359.1;242.7,367.4;237.5,375.4;232.6,383;229.3,388.6;226.1,394.1;223,398.8;221.2,401.9;219.3,404.7;217.1,407.8;214.7,411.3;212.7,414.4;210.7,417.3;208.4,419.8;207,421.3;206,422.5;205.2,423.4;204.6,424|272.2,317.9;272.4,317.9;273.8,317.9;276.4,317.9;281,317.9;287.5,317.9;294.3,317.9;303.5,317.9;320.7,317.9;341.1,317.9;356.8,317.9;376,317.9;403,317.9;435.2,317.9;471.5,317.9;507.8,317.9;547.1,317.9;586.6,317.9;613.7,317.9;636.5,317.9;661.9,317.9;683.9,317.9;696.1,317.9;703.3,317.9;713.3,317.9;721.6,317.9;728.3,317.9;733.2,317.9;735.7,317.9;737.1,317.9;738.3,317.9;739.2,317.9|165.9,556;165.9,556.2;165.7,556.4;166.4,556.4;169,556.4;174.3,556.4;183.8,556.4;197,555.8;213.5,553.1;234.1,548.8;258.3,543.3;299.5,534.4;333.3,527.9;356.6,524.5;394.1,519.1;437.6,513.8;482.8,511;524.6,509.5;567.3,508.3;606.4,508.1;630.4,508.1;650.4,508.1;673.5,508.1;692.6,508.1;706.2,508.1;714.5,508.1;723.4,508.1;732.4,508.1;739.2,508.1;744.3,508.4;747.7,509.1;749.6,509.4;750.9,509.7;751.8,510;752.3,510.3;752.8,510.5;753.6,510.8;754.7,511.1;755.8,511.3;757.4,511.8;759.7,512.4;762.5,513.2;765.3,513.9;768.2,514.6;771.2,515.4;774.9,516.2;778.4,517;781.8,517.3;785.7,517.7;789.1,518.4;791.7,518.8;794.4,519.1;797.5,519.4;800,519.4;802.1,519.7;804.2,520;805.6,520.1;806.3,520.3;806.9,520.6;807.4,520.6;807.9,520.6;808.4,520.6`,
    options: {
      sampleCount: null,
      sampleSpacing: 0.1,
      radialBins: 5,
      angularBins: 12,
      iterations: 3,
      tpsRegularization: 0.08,
      unmatchedCost: 0.55,
      missingReferenceStrokePenaltyWeight: 1.5,
      extraHandwritingStrokePenaltyWeight: 0.5,
      maxRotationDegrees: 12,
      rotationSteps: 1,
      sustainedTangentMismatchEnabled: false,
      sustainedTangentMismatchThresholdDegrees: 45,
      sustainedTangentMismatchMinimumLengthFraction: 0.5625,
      sustainedTangentMismatchNoiseLengthFraction: 0.05,
      sustainedTangentMismatchTangentWindowFraction: 0.1,
    },
  },
  {
    id: `十-synthetic-negative`,
    drawnStrokes: `100,300;924,300|100,724;924,724`,
  },
  {
    id: `好-20261018141648`,
    drawnStrokes: `372.7,196;357.6,257.1;344.4,296.8;336.8,319.7;316.9,377.3;291.5,449.2;269.1,510.7;248.7,552.7;248.1,556.8;256.8,585.7;282.8,659.7;315.1,747.9;340.1,809.3;355.2,836.3|424.2,407.9;424.7,435.1;421.7,456.1;404.3,504.2;379.6,553;348.1,604.2;314.1,651.4;280.1,687.4;247.4,717.8;220.4,742.8;193.1,759.3;175.4,769.5|141.9,426.2;188.6,426.2;254.3,426.2;316.3,424.6;372.6,424.6;409.7,424.6;425.3,424|569.9,241.4;612.8,234.8;673.3,233;726.2,233;800,233;837.8,241.3;854,248;832,266.5;803,292.8;758.7,329.5;716.2,360.9;671.4,393.8;636.3,418.8;597.3,452.6|597.3,452.6;597.3,495.5;597.3,565.2;597.3,624.6;597.3,701.7;598.6,788.1;600.5,833.5;601.5,845;586,833.6;570.5,822.2;551,807;531.8,792;516.9,777.9;508.6,764.7`,
  },
  {
    id: `好-20261017185501`,
    drawnStrokes: [
      `349.9,190;349.9,190.2;349.9,191.8;349.9,194.6;349.9,201.8;348.7,213.4;346.4,223.8;342.6,237.3;337.1,256.8;330.3,281.2;321.9,310.6;312.3,342.9;301,379.3;289.1,415.6;277.8,447.7;269.3,468.8;262.4,487;254.9,508.1;250.7,517.9;247.9,524.4;243.8,533.1;240.3,540.3;237.4,546.5;235.1,550.9;233.7,554.4;232.8,558;232,561.1;231.2,563.6;230.4,568;229.9,574;229.4,579.8;228.5,587.1;227.7,593.4;226.8,600.5;225.8,609.3;224.3,617.6;222.9,624.4;221.9,630.3;220.5,636.5;219.3,641.8;218.4,646.1;217.6,649.3;216.9,652;216.5,653.6;216,654.8;216,655.1;216,655.7;216,656.4;216.3,658.2;218.3,662.2;223.4,670;232.3,681.3;244.6,696.7;259.4,716.2;291.4,757.1;305.4,776.4;319.1,795.6;331.2,812.4;345.8,832.6;356.5,846.5;363.7,855.9;370.7,865.9;376,872.4;379.8,876.7;381.7,879.1;382.6,880.2;383.4,881;384.1,881.4;384.5,881.8;385,882.1;385.3,882.4`,
      `403.1,493.6;403.1,493.8;403.1,495.2;403.1,498.4;402.7,501.9;401,506.8;398.1,514;393.1,526.3;387.4,540.3;382.6,551;375.6,565.6;367,583.5;359.7,597.2;351.4,612.2;342,630.3;332.9,645.8;323.3,660.5;314.6,674;307.1,685.3;300.3,694.4;294.5,701.7;289.5,708.7;285.2,714.1;280.4,718.5;274.4,724.5;268.4,731.3;263.4,736.9;257.9,742.3;251.4,748.9;244.9,755.8;237.7,763;230.4,770.3;224,777.2;218.4,783.8;214.2,789.1;210.9,792.7;206.1,798.3;201.9,803.6;198.6,807.6;194.7,811.9;191.1,815.6;188,819.1;185.5,821.9;183.3,823.9;181.1,825.8;179,827.3;177.4,828.2;175.9,829.4;174.4,830.3;173.3,830.9;171.8,832.1;170.2,833.2;168.9,833.9;167.3,835;165.2,836.1;163.4,837.1;162.2,837.9;160.4,838.8;158.6,839.8;157.4,840.7;156.2,841.5;155.1,842.1;154,842.6;153.2,843.2;152.8,843.5;152.4,843.7;152,844;151.5,844.2;151.1,844.5;150.8,844.8`,
      `144.5,493;145.3,493;148.2,493;152.6,493;159,493;168.7,493;180.4,493;193.4,493;207.5,493;222.3,493;237.9,493;249.7,493;259.9,493;273.2,493;281.8,493;286.7,493;293.8,493;301.3,493;307,493;311.4,493;316.7,493;321.4,493;324.8,493;327.3,493;330.4,493;333.4,493;336.5,493;339.9,493;343.5,493;347.1,493;350.5,493;354.1,493;357.2,493;359.7,493;362.2,493;364.6,493;366.5,493;368,493;369.9,493;372.1,493;374.5,493;376.6,493;378.1,493;379.7,493;381.1,493;382.3,493;383.5,493;384.7,493;385.9,493;387,493;388.5,493;390,493;391.2,493;392.8,493;394.4,493;395.6,493;396.8,493.2;397.7,493.5;398.3,493.5;398.9,493.8;399.4,494;399.9,494;400.4,494;400.8,494;401.3,494;401.8,494;402,494.2`,
      `550.8,289.4;551.2,289.4;552.8,289.4;557.4,289.4;565.5,289.4;574.3,289.4;586.8,289.4;600.8,289.4;613.8,289.4;628.1,289.4;642.7,289.4;657.2,290;671.1,292.4;683.9,295.4;694.5,297.1;700.7,297.9;711,300.2;717.6,302;723.4,303.5;727.5,304.5;730.3,305.3;732.5,305.7;734.3,306.3;735.2,306.9;735.8,307.1;736.3,307.1;736.8,307.4;737,307.8;737,308.2;737,308.7;737,309.1;737,309.6;737,310.1;736.8,310.5;736.2,310.9;735,311.4;733.3,312;731.1,312.7;728.7,313.6;726.2,314.9;723.2,316.4;719.9,317.9;716.4,319.4;713.3,320.9;710.3,322.4;706.8,324.3;702.1,327.4;697.3,330.4;694.1,332.6;690.7,335.3;686.5,338.7;681,342.8;674.9,347.1;668.3,351.7;660.8,357.5;653.3,363.4;645.7,368.9;637.9,375;632.3,379.6;627.9,383.2;623.9,386.5;619.6,389.9;615.4,393;612.5,394.9;609.6,397.2;607.4,399;605.6,400.4;604.2,401.4;603.3,402.1;602.6,402.7;602.1,403.2;601.6,403.7;601.1,404.2;600.8,404.2;600.8,403.8;600.8,404.4;600.8,406.4;600.8,410.1;600.8,416.7;600.8,424.9;600.8,435.8;601.4,449.4;602.1,469;602.5,487.7;603.1,503.9;603.3,520;603.4,536;604.1,556.2;604.7,576.1;604.9,594.4;605.5,611.1;606.1,625.7;606.8,638.3;607.4,647.2;607.4,653.9;607.4,661.9;607.8,668.5;608.2,674.3;608.2,679.1;608.2,682.8;608.5,686.8;608.8,690.4;608.9,694.2;609,697.8;609,700.5;609,703;609,705.4;609,707.9;609,710.4;609,712.3;609,714.1;609,716;609,717.8;609,719.8;609,721.9;609,723.9;609,726.2;609,729;609,731.6;609,734.2;609,737;609,740.4;609,744;609,747.3;609,750.4;609,753;609,756.4;609,760.2;609,763.7;609,767.3;609,770.8;609,774.5;609,778.5;609,782;609,785.1;609,788.6;609,792.6;609.3,796.6;609.7,800.5;610,803.6;610.3,806.6;610.4,810.5;610.8,814.5;611.2,818.7;611.2,822.8;611.3,826.3;611.3,829;611.3,831.2;611.3,833.2;611.3,835.2;611.3,836.5;611.3,837.3;611.3,838.4;611.3,839.1;611.3,839.5;611.3,839.9;611.3,840.4;611.3,840.6;611,840.2;610.1,839;608.3,836.5;606.1,833.6;603.2,829.7;599.2,824.7;594.6,819.4;589.8,813.7;584.4,807.7;578.8,801.6;573.8,795.7;568.4,790.3;563.8,786.5;559.9,783.4;555.6,779.9;551.2,775.9;547.6,772.6;544.2,769.9;540.4,766.9;536.5,763.8;533,760.9;530.1,758.4;527.3,756;525,754.1;523.3,752.7;521.6,751.4;520,750.1;518.5,748.9;517,747.7;515.5,746.9;514.2,746.2;513,745.2;511.5,744.3;510.3,743.4;509.4,742.5;508.5,741.9;507.6,741.5;507.2,741.2;506.9,740.9;506.4,740.7;506.2,740.3`,
    ].join(`|`),
  },
  {
    id: `牛-20261019185113`,
    drawnStrokes: `409.2,129.5;409.2,130;409.2,132.3;409.2,136.2;409.2,144;409.2,152.5;408.7,162.3;406,178.5;400.5,198;393.9,222.5;384.5,252.2;372.4,283.1;360.3,312.5;348.2,340.3;339.4,360;331.3,375.9;320.1,394.8;309,410.1;299.5,422.1;294,429.5;289.8,435.3;284.3,441.6;279.2,447.5;274.1,453.3;270.2,457.7;266.9,461.4;264.4,463.9;262.9,466;261.6,467.4;260.9,468.1;260.6,468.6;260.2,469.1;259.9,469.6|368.6,305.3;369.7,305.3;374.4,305.3;383.6,305.3;397.4,305.3;417.2,305.3;440.2,305.3;467.4,305.3;497.3,305.3;527.3,304.5;551.6,303.6;573.3,303.6;600.1,303.6;621.1,303.6;638.8,303.6;658.5,303.6;676.3,303.6;688,303.6;696.3,303.6;706.4,303.6;713.8,303.6;717.6,303.6;719.9,303.6;722.1,303.6;723.8,303.6;724.9,303.6;725.6,303.6|164.7,593.7;164.4,593.7;164.8,593.7;167.2,593.7;174.2,593.7;186.7,593.7;201.9,593.7;219.8,593.7;240.3,593;261.2,591;286.4,587.9;312.6,585.3;329.4,584.6;346.4,583;370.6,580.9;397.5,580;423.5,579.7;443,579.6;461.6,579.6;481.6,579.6;501.2,579.6;520.6,579.6;535.5,579.6;552.1,579.6;567.6,579.6;580.4,579.1;595.9,578.5;610.3,578.3;624.6,577.7;638.8,577.1;654.1,576.4;668.3,575.2;681.5,574.6;694.4,574;705.9,573.4;715,573.1;723.4,572.6;734,572.4;744.8,572.3;755.1,572.3;765.3,572.2;775,572.2;783.7,572.2;790.3,572.2;796.8,572.2;804.4,572.2;810.4,572.2;817.9,572.2;824.7,572.2;830.7,572.2;836.6,572.2;840.5,572.2;844.8,572.2;849.9,572.2;855.2,572.5;859.9,572.9;864.3,573;868.6,573;872.2,573;875.7,573;879.2,573;882.6,573;885.3,573;887.9,573;891.1,573;894.1,573.3;897.2,573.6;900.1,573.7;903.1,574;905.7,574.3;907.5,574.6;908.8,574.9;910,575;910.8,575;911.3,575;911.8,575;912.3,575;912.5,575.1|529.6,310.6;529.6,311;529.6,312.2;529.6,314.2;529.6,317;529.6,321;529.6,326.2;529.6,330.8;529.6,336.2;529.6,343.6;529.6,350.9;529.6,356.5;529.6,363.4;529.6,372.8;529.6,382.6;529.6,393.4;529.6,410.1;529.6,429.1;529.6,447.8;529.6,468.8;529.6,490.4;529.6,514.1;529.6,539.8;529.6,565.9;529.6,584.4;529.6,596.1;529.6,612.3;529.6,630.8;529.6,648.3;529.6,666.1;529.6,682.1;529.6,696.9;530.8,712;533.2,727.3;535.7,742.2;537.7,758;539.1,773.3;540.2,783.6;541.3,792.6;542.1,801.3;542.6,808.2;542.8,815.3;542.8,821.1;542.9,826.3;542.9,830.8;542.9,834.1;542.9,836.8;542.9,839.4;542.9,841.5;542.9,843.6;542.9,846;542.9,848.8;542.9,851.7;542.9,853.9;542.9,856.1;542.9,858.9;542.9,861.8;542.9,864.7;542.6,867.3;542.3,869.8;542.3,872.4;541.9,874.4;541.3,876.5;541,878.5;540.6,880.4;540,882.3;539.4,884.2;539,885.7;538.8,887.2;538.3,889.2;537.7,890.8;537.3,892.4;537,894;536.5,895.3;536.1,896.5;536.1,897.6;535.8,898.8;535.5,899.7;535.5,900.2;535.5,900.7;535.5,901.1;535.5,901.4;535.5,901.9;535.5,902.4`,
  },
  {
    id: `午-20261019194748`,
    drawnStrokes: `366.4,107.6;366.4,107.8;366.4,108.7;366.1,111.1;364.6,115.6;360.1,124.8;353.6,137.3;339.1,161.4;321.4,188.3;307.7,208.1;291.9,230.6;275.5,252.7;263.2,268.6;252.4,282.1;242.7,294.5;233.5,305.8;223.4,317.6;216.7,325.3;211.4,331.3;206,337.3;201.5,341.9;198.9,344.3;197.4,345.5;196.5,346.4;195.9,346.9;195.4,347.2|298.4,238;298.6,238;299.9,238;303.2,238;308.6,238;316.4,238;330.9,238;350.1,238;370.9,238;394.5,238;419.5,238;439.1,238;458.2,238;477.3,238;495.7,239.2;516.8,241.1;535.2,242.6;548.6,243.8;558.9,245;570.2,246.1;579.9,246.8;587.6,247.3;593.6,247.7;598.1,247.7;601.5,247.7;603.4,247.7;604.6,247.7;605.9,247.7;606.8,247.7;607.5,247.7;608,247.7|151.7,514.9;152.8,514.9;158.8,514.9;170.3,514.9;181.7,514.9;198.2,514.9;233.3,513.1;284.6,509.9;322.2,508.5;354.5,507.5;399.9,506.5;448.4,506.5;495,506.4;534.9,506.4;572.9,506.4;595.8,506.4;611,506.4;633.1,506.4;652.6,506.4;669.9,506.4;685.6,506.4;698.9,506.4;709.1,506.4;718.1,506.4;725.1,506.4;730.9,506.4;737,506.4;741.6,506.4;749,506.4;755.3,505.9;759,505.2;764.6,504.9;770,504.5;774.6,504.1;779.5,504;783.7,504;787.8,504;791.3,504;794,503.7;795.8,503.3;796.9,503.3;797.7,503.3;798.2,503.3;798.6,503.3;799,503.3;799.5,503.3;800,503.3;800.5,503.3;801,503.3;801.5,503.3|459.5,128.2;459.5,129.3;459.5,134.4;459.5,144.2;459.5,154.6;459.5,174.1;459.5,206.8;459.5,279.5;459.5,364.7;459.5,436.5;459.5,518.4;459.5,596.4;459.5,647.9;461.7,688.3;463.9,723.4;464.5,743.4;465.9,771.5;467.6,800.9;469.1,823.8;470,838.9;470.8,850.4;471.4,861.5;471.9,869.5;472.4,875.4;472.4,879.4;472.4,882.1;472.4,884.2;472.4,885.4;472.4,885.9;472.4,886.3;472.4,886.7;472.4,887.1;472.4,887.6`,
  },
  {
    id: `图-1794469501757`,
    drawnStrokes: `269.1,121.5;256.4,135.7;258,165.1;258,174.6;258,203.2;258,242.9;258,287.4;258,336.6;258,397.7;258,466.8;258,534.2;258,585.8;257.2,609.6;255.6,616;253.2,625.5;250.8,635.8;249.3,646.9;249.3,658.1;249.3,666.8;249.3,673.1;250.8,677.9;250.8,681.1|256.4,130.2;265.1,127;292.1,120.7;298.5,120.7;319.1,124.6;357.2,131.8;399.3,138.1;442.9,143.7;482.6,147.6;519.1,148.4;553.3,148.4;585,148.4;616,147.6;647.7,144.5;677.9,144.5;706.5,144.5;727.9,144.5;749.3,148.4;768.4,150.8;786.7,152.4;804.1,154;823.2,156.4;841.4,160.3;859.7,163.5;876.4,166.7;889.1,166.7;892.2,166.7;892.2,169.1;889.1,174.6;883.5,190.5;873.2,234.2;854.9,309.6;834.3,394.5;820.8,468.3;816,526.3;815.2,578.7;815.2,620.8;814.4,662;814.4,682.7;814.4,705.7;814.4,720.8;814.4,726.3;812.1,726.3;797.8,726.3;772.4,718.4;748.6,710.4;727.1,697;721.6,690.6|442.1,235.8;446.9,240.5;469.1,259.6;473.9,265.1;489,281;504.9,306.4;506.4,313.6|385,318.3;408,334.2;434.2,360.4;439.8,367.5;457.2,389;463.6,396.9|362,469.9;383.4,468.3;427.9,461.2;439.8,459.6;479.5,455.6;531.8,454.8;583.4,454.8;631.1,455.6;674.7,458.8;716,460.4;750.9,460.4;758.1,460.4|594.6,227;596.1,231;597.7,268.3;597.7,282.6;596.9,337.4;587.4,412.8;571.5,482.6;546.1,541.4;514.4,584.2;484.2,612;459.6,631.9;447.7,648.5;441.4,659.6|596.9,460.4;602.5,475.5;627.1,504.1;634.2,514.4;655.7,545.3;687.4,588.2;711.2,611.2;726.3,623.1;729.5,626.3|294.5,743.8;315.9,741.4;358,738.2;370.7,737.4;412,736.6;473.1,735.9;539.8,736.6;607.3,743;671.6,747.8;729.5,748.6;743,748.6`,
  },
  {
    id: `看-1794183717589`,
    expectedIssues: [
      {
        kind: `missing-stroke`,
        reference: { strokeIndex: 6 },
      },
    ],
    drawnStrokes: `340.5,100;369.9,100;383.4,100;402.5,100;447.7,100;497.7,101.6;546.1,105.6;591.4,111.9;611.2,111.9|314.3,200;373.1,194.5;380.2,194.5;417.5,193.7;471.5,190.5;525.5,188.9;579.5,187.3;616.8,185|224.6,292.9;236.6,294.5;264.3,294.5;281.8,294.5;302.4,294.5;354.8,294.5;412,294.5;470.7,294.5;535.8,292.1;603.3,287.4;666,280.2|514.4,88.1;513.6,106.4;512.8,134.2;511.2,142.9;504.9,171.5;489,219.1;466,277;432.6,340.5;391.3,400.1;343.7,454.8;291.3,504.9;238.1,552.5;202.4,583.4|446.9,442.9;436.6,465.2;437.4,500.1;437.4,512.8;437.4,553.3;437.4,613.6;437.4,681.1;440.6,743.8;442.1,797;442.1,807.3|469.9,433.4;489.8,431.8;518.4,431.8;535.8,431.8;553.3,431.8;590.6,431.8;625.5,431.8;654.9,435.8;678.7,441.4;694.6,444.5;704.1,450.1;704.9,462.8;704.9,490.6;689.8,541.4;672.3,607.3;656.5,678.7;644.6,746.2;636.6,807.3;632.7,858.1;631.9,877.1|450.9,640.6;458,636.6;492.2,636.6;512,636.6;535,636.6;581.1,636.6;627.9,636.6;646.9,636.6|454.1,837.5;469.1,839.8;507.2,839.8;519.1,839.8;555.7,839;604.9,835.1;651.7,835.1;660.4,835.1`,
  },
  {
    id: `做-1794183743160`,
    expectedIssues: [
      {
        kind: `missing-stroke`,
        reference: { strokeIndex: 8 },
      },
    ],
    drawnStrokes: `396.1,110.3;400.9,117.5;400.9,142.1;400.9,158;398.5,175.4;388.2,216.7;371.5,260.4;346.1,304.8;313.6,353.2;273.1,397.7;228.6,442.1;185.7,481;167.5,495.3|362,320.7;340.5,356.4;340.5,369.9;340.5,387.4;340.5,435.8;340.5,499.3;342.9,571.5;347.7,648.5;354.8,727.9;361.2,802.5;365.1,871.6;365.9,921.6|432.6,392.9;458,381.8;462,382.6;478.7,382.6;505.6,382.6;538.2,381.8;576.3,380.2;616,379.4;645.4,378.6|551.7,216.7;549.3,228.6;549.3,260.4;549.3,272.3;549.3,309.6;550.1,370.7;550.1,442.9;550.1,519.9;550.1,596.1;550.1,646.9|438.2,641.4;437.4,673.1;438.2,694.6;442.1,720;450.1,779.5;458,839.8;463.6,892.2|434.2,659.6;450.9,639.8;471.5,639.8;477.9,639.8;496.1,639;523.1,639;550.9,639;578.7,639;600.9,639;618.4,639;627.9,641.4;628.7,650.9;628.7,673.1;620,709.7;612.8,752.5;607.3,795.4;605.7,830.3;605.7,857.3;605.7,867.6|439,872.4;440.6,870.8;464.4,868.4;471.5,867.6;500.1,866;543,865.2;587.4,865.2;597.7,865.2|773.2,236.6;769.2,266.7;770,270.7;770,294.5;765.2,334.2;747,381.8;723.9,431;698.5,473.9;670.8,510.4;641.4,540.6;624.7,557.2|741.4,378.6;745.4,378.6;769.2,378.6;776.3,378.6;797,381;825.6,385;851,387.4;873.2,387.4;888.3,387.4;896.2,387.4;899.4,387.4;900.2,391.3;898.6,416.7;883.5,460.4;862.9,518.4;843,581.1;826.3,643;811.3,703.3;796.2,759.7;778.7,806.5;758.1,845.4;735.1,877.1;712,904.1;696.2,923.2;689,935.9;689,941.4|722.4,530.3;716.8,511.2;719.2,524.7;727.1,561.2;741.4,631.1;761.3,715.2;786.7,803.3;817.6,882.7;851.7,945.4;858.9,955.7`,
  },
  {
    id: `做-1794529035833`,
    drawnStrokes: `373.9,138.1;366.7,163.5;361.2,173;354,185.7;331.8,219.1;297.7,263.5;256.4,308.8;219.9,346.1;191.3,372.3;171.5,387.4;158,395.3;151.6,396.9|295.3,256.4;285,273.9;285,304;286.6,344.5;292.9,396.9;298.5,458.8;304,525.5;310.4,595.3;317.5,666.8;322.3,734.3;324.7,784.3;324.7,810.5;324.7,812.8|400.1,362.8;402.5,363.6;429.4,361.2;448.5,356.4;469.9,350.9;516,339;563.6,330.2;604.1,323.1;635,319.9;653.3,319.1;656.5,318.3|517.6,177;504.1,214.3;505.6,220.7;505.6,248.5;505.6,292.9;505.6,342.9;506.4,392.9;508.8,434.2;511.2,464.4;511.2,481.8;511.2,487.4|442.9,550.9;440.6,575.5;440.6,590.6;440.6,611.2;443.7,656.5;448.5,700.9;451.7,741.4;454.1,765.2;454.1,769.2|442.1,549.3;461.2,543.8;484.2,543;496.9,540.6;509.6,537.4;539,528.7;566.8,519.9;592.2,513.6;612.8,510.4;627.1,510.4;635,511.2;636.6,528.7;636.6,556.5;636.6,593.8;633.5,637.4;627.9,685.8;624.7,731.1;622.3,765.2;622.3,788.2|450.9,795.4;454.1,795.4;487.4,793.8;497.7,793;530.3,785.9;576.3,781.1;618.4,781.1;654.1,781.1;661.2,781.1|812.1,203.2;797.8,237.3;793.8,253.2;785.9,273.1;770,314.3;750.1,358;727.9,399.3;707.3,432.6;693,450.1;689,452.5|765.2,333.4;766.8,330.2;791.4,330.2;799.4,330.2;823.2,330.2;858.9,330.2;892.2,327.8;918.4,323.1;936.7,319.9;944.6,316.7;933.5,330.2;912.9,369.9;890.6,427.1;860.5,494.5;829.5,569.2;791.4,650.9;754.1,727.9;722.4,783.5;700.9,816;691.4,827.9;689.8,829.5|745.4,440.6;745.4,457.2;752.5,499.3;755.7,511.2;763.6,558;775.5,631.1;790.6,711.2;811.3,784.3;835.1,836.7;859.7,865.2;874,869.2`,
  },
];

async function characterPathsFor(character: string): Promise<string[]> {
  const url = new URL(
    `../../src/client/wiki/${character}/character.json`,
    import.meta.url,
  );
  const parsed = z
    .object({ svg: z.object({ medians: z.array(z.string()) }) })
    .parse(JSON.parse(await readFile(url, `utf8`)));
  return parsed.svg.medians.map(transformArphicSpaceSvgPath);
}

async function visuallySimilarReferencesFor(
  character: string,
): Promise<SimilarCharacterReference[]> {
  const url = new URL(
    `../../src/client/wiki/${character}/character.json`,
    import.meta.url,
  );
  const parsed = z
    .object({
      visuallySimilar: z.array(hanziCharacterSchema).optional().default([]),
    })
    .parse(JSON.parse(await readFile(url, `utf8`)));
  return Promise.all(
    parsed.visuallySimilar.map(async (hanzi) => ({
      hanzi,
      medianPaths: await characterPathsFor(hanzi),
    })),
  );
}

function makeStrokePoints(
  strokes: readonly (readonly WritingStrokePoint[])[],
  transform: (point: WritingStrokePoint) => WritingStrokePoint = (point) =>
    point,
): WritingStrokePoint[][] {
  return strokes.map((stroke) => stroke.map(transform));
}

function rotateStrokes(
  strokes: readonly (readonly WritingStrokePoint[])[],
  degrees: number,
): WritingStrokePoint[][] {
  const radians = (degrees * Math.PI) / 180;
  return makeStrokePoints(strokes, ({ x, y }) => ({
    x: Math.cos(radians) * x - Math.sin(radians) * y,
    y: Math.sin(radians) * x + Math.cos(radians) * y,
  }));
}

function pointsForPaths(paths: readonly string[]): WritingStrokePoint[][] {
  return paths.map((path) => {
    const length = SVGPathCommander.getTotalLength(path);
    const pointCount = Math.max(2, Math.ceil(length / 20));
    return Array.from({ length: pointCount }, (_, index) =>
      SVGPathCommander.getPointAtLength(
        path,
        (length * index) / (pointCount - 1),
      ),
    );
  });
}

describe(`gradeCharacterShape`, () => {
  const deformationStrokes: WritingStrokePoint[][] = [
    [
      { x: -1, y: -1 },
      { x: 1, y: -1 },
    ],
    [
      { x: -1, y: 1 },
      { x: 1, y: 1 },
    ],
    [
      { x: -1, y: -1 },
      { x: -1, y: 1 },
    ],
    [
      { x: 1, y: -1 },
      { x: 1, y: 1 },
    ],
  ];
  const gradeDeformation = (
    deform: (point: WritingStrokePoint) => WritingStrokePoint,
  ) => {
    const referencePaths = makeStrokePoints(deformationStrokes, deform).map(
      (stroke) => `M ${stroke.map(({ x, y }) => `${x} ${y}`).join(` L `)}`,
    );
    return gradeCharacterShape(deformationStrokes, referencePaths, {
      sampleCount: 32,
    });
  };
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
    expect(result.shapeSimilarity).toBeGreaterThan(0.9);
    expect(result.correspondences.length).toBeGreaterThan(
      result.sourcePoints.length - 2,
    );
  });

  test(`detects reversed horizontal and vertical strokes without flagging forward strokes`, () => {
    for (const referencePath of [`M 0 0 L 100 0`, `M 0 0 L 0 100`]) {
      const points = pointsForPaths([referencePath])[0];
      if (points == null) {
        throw new Error(`Missing straight-stroke points`);
      }
      const forward = gradeCharacterShape([points], [referencePath]);
      const reversedPoints = [...points].reverse();
      const reversed = gradeCharacterShape([reversedPoints], [referencePath]);
      const reversedWithoutIssues = gradeCharacterShape(
        [reversedPoints],
        [referencePath],
        {},
        undefined,
        false,
      );

      expect(forward.strokeAssignments[0]?.direction).toBe(`forward`);
      expect(
        forward.issues.some(({ kind }) => kind === `reversed-stroke`),
      ).toBe(false);
      expect(reversed.strokeAssignments[0]?.direction).toBe(`reverse`);
      expect(reversed.issues).toContainEqual({
        kind: `reversed-stroke`,
        handwriting: { strokeIndex: 0, start: 0, end: 1 },
        reference: { strokeIndex: 0, start: 0, end: 1 },
      });
      expect(reversedWithoutIssues.issues).toEqual([]);
      expect(reversedWithoutIssues.shapeCost).toBe(reversed.shapeCost);
      expect(reversedWithoutIssues.strokeAssignments).toEqual(
        reversed.strokeAssignments,
      );
      expect(evaluateHanziCharacterWritingAcceptance(reversed, [])).toEqual(
        evaluateHanziCharacterWritingAcceptance(reversedWithoutIssues, []),
      );
    }
  });

  test(`does not report reversed direction for sub-resolution strokes`, () => {
    const referencePaths = [`M 0 0 L 1000 0`, `M 0 50 L 0.1 50`];
    const sourceStrokes = pointsForPaths(referencePaths);
    const shortStroke = sourceStrokes[1];
    if (shortStroke == null) {
      throw new Error(`Missing short stroke points`);
    }

    const result = gradeCharacterShape(
      [sourceStrokes[0] ?? [], [...shortStroke].reverse()],
      referencePaths,
    );

    expect(result.issues.some(({ kind }) => kind === `reversed-stroke`)).toBe(
      false,
    );
    expect(
      measureStrokeDirection(result.targetStrokes[1] ?? []).endpointDistance,
    ).toBeLessThan(0.02);
  });

  test(`assigns reordered strokes globally and reports unmatched strokes`, () => {
    const stroke0 = strokes[0];
    const stroke1 = strokes[1];
    const stroke2 = strokes[2];
    if (stroke0 == null || stroke1 == null || stroke2 == null) {
      throw new Error(`Missing synthetic stroke`);
    }
    const reorderedStrokes = [
      [...stroke2].reverse(),
      [...stroke0].reverse(),
      [...stroke1].reverse(),
    ];
    const reordered = gradeCharacterShape(reorderedStrokes, reference);
    expect(
      reordered.strokeAssignments.map(
        ({ sourceStrokeIndex, targetStrokeIndex }) => [
          sourceStrokeIndex,
          targetStrokeIndex,
        ],
      ),
    ).toEqual([
      [0, 2],
      [1, 0],
      [2, 1],
    ]);
    expect(
      reordered.strokeAssignments.every(
        ({ direction }) => direction === `reverse`,
      ),
    ).toBe(true);
    expect(reordered.strokePairCosts).toHaveLength(3);
    expect(reordered.strokePairCosts.every((row) => row.length === 3)).toBe(
      true,
    );
    expect(
      reordered.strokeAssignments.map(
        ({ targetStrokeIndex }) => targetStrokeIndex,
      ),
    ).toEqual([
      ...new Set(
        reordered.strokeAssignments.map(
          ({ targetStrokeIndex }) => targetStrokeIndex,
        ),
      ),
    ]);

    const missingSourceStroke = gradeCharacterShape(
      strokes.slice(0, 2),
      reference,
    );
    expect(missingSourceStroke.strokeAssignments).toHaveLength(2);
    expect(missingSourceStroke.unmatchedTargetStrokeIndices).toHaveLength(1);

    const extraSourceStroke = gradeCharacterShape(
      [...strokes, pointsForPaths([`M 700 700 L 710 700`])[0] ?? []],
      reference,
    );
    expect(extraSourceStroke.strokeAssignments).toHaveLength(3);
    expect(extraSourceStroke.unmatchedSourceStrokeIndices).toHaveLength(1);
    expect(missingSourceStroke.issues).toContainEqual({
      kind: `missing-stroke`,
      reference: { strokeIndex: 2, start: 0, end: 1 },
    });
    expect(extraSourceStroke.issues).toContainEqual({
      kind: `extra-stroke`,
      handwriting: { strokeIndex: 3, start: 0, end: 1 },
    });

    const presence = diagnoseShapeContextStrokePresence(missingSourceStroke);
    expect(presence.summary.matchedReferenceStrokeCount).toBe(2);
    expect(presence.summary.unmatchedReferenceStrokeCount).toBe(1);
    expect(presence.summary.unmatchedHandwritingStrokeCount).toBe(0);
    expect(presence.summary.unmatchedReferenceArcLengthFraction).toBeCloseTo(
      1 / 3,
      2,
    );
    expect(presence.summary.unmatchedHandwritingArcLengthFraction).toBeCloseTo(
      0,
    );
    expect(missingSourceStroke.missingReferenceStrokeFraction).toBeCloseTo(
      presence.summary.unmatchedReferenceArcLengthFraction,
    );
    expect(
      missingSourceStroke.weightedScoreContributions
        .missingReferenceStrokePenalty,
    ).toBeCloseTo(
      missingSourceStroke.missingReferenceStrokeFraction *
        missingSourceStroke.options.missingReferenceStrokePenaltyWeight,
    );
    const zeroMissingPenalty = gradeCharacterShape(
      strokes.slice(0, 2),
      reference,
      { missingReferenceStrokePenaltyWeight: 0 },
    );
    expect(zeroMissingPenalty.missingReferenceStrokeFraction).toBeCloseTo(
      missingSourceStroke.missingReferenceStrokeFraction,
    );
    expect(
      zeroMissingPenalty.weightedScoreContributions
        .missingReferenceStrokePenalty,
    ).toBe(0);
    const unmatchedReferenceStroke = presence.referenceStrokes.find(
      ({ handwritingStrokeIndex }) => handwritingStrokeIndex == null,
    );
    expect(unmatchedReferenceStroke?.selectedAssignmentCost).toBeNull();
    expect(unmatchedReferenceStroke?.costOfLeavingReferenceUnmatched).toBe(
      shapeContextGraderDefaults.unmatchedCost,
    );
    const matchedReferenceStroke = presence.referenceStrokes.find(
      ({ handwritingStrokeIndex }) => handwritingStrokeIndex != null,
    );
    if (
      matchedReferenceStroke == null ||
      matchedReferenceStroke.handwritingStrokeIndex == null
    ) {
      throw new Error(`Expected a matched reference stroke`);
    }
    const matchedAssignment = missingSourceStroke.strokeAssignments.find(
      ({ targetStrokeIndex }) =>
        targetStrokeIndex === matchedReferenceStroke.referenceStrokeIndex,
    );
    if (matchedAssignment == null) {
      throw new Error(`Expected a selected stroke assignment`);
    }
    const matchedPairCost =
      missingSourceStroke.strokePairCosts[
        matchedAssignment.sourceStrokeIndex
      ]?.[matchedAssignment.targetStrokeIndex];
    if (matchedPairCost == null) {
      throw new Error(`Expected stroke-pair cost components`);
    }
    expect(matchedReferenceStroke.selectedAssignmentCost).toBe(
      matchedPairCost.totalCost,
    );
    expect(matchedReferenceStroke.costComponents).toEqual({
      dtwCost: matchedPairCost.dtwCost,
      centroidDistance: matchedPairCost.centroidDistance,
      arcLengthPenalty: matchedPairCost.lengthPenalty,
    });
    expect(
      matchedReferenceStroke.cheaperThanLeavingReferenceAndHandwritingUnmatched,
    ).toBe(true);
    expect(matchedReferenceStroke.arcLengthDifference).toBeCloseTo(
      Math.abs(
        (matchedReferenceStroke.handwritingArcLength ?? 0) -
          matchedReferenceStroke.referenceArcLength,
      ),
    );

    const extraPresence = diagnoseShapeContextStrokePresence(extraSourceStroke);
    expect(extraPresence.summary.unmatchedHandwritingStrokeCount).toBe(1);
    expect(
      extraPresence.summary.unmatchedHandwritingArcLengthFraction,
    ).toBeGreaterThan(0);
    expect(extraSourceStroke.extraHandwritingStrokeFraction).toBeCloseTo(
      extraPresence.summary.unmatchedHandwritingArcLengthFraction,
    );
    expect(
      extraSourceStroke.weightedScoreContributions
        .extraHandwritingStrokePenalty,
    ).toBeCloseTo(
      extraSourceStroke.extraHandwritingStrokeFraction *
        extraSourceStroke.options.extraHandwritingStrokePenaltyWeight,
    );
    expect(
      extraPresence.unmatchedHandwritingStrokes[0]?.handwritingArcLength,
    ).toBeGreaterThan(0);

    const missingStrokeAcceptance = evaluateHanziCharacterWritingAcceptance(
      missingSourceStroke,
      [],
    );
    const missingStrokeDiagnostic = createShapeContextGraderDiagnostic({
      fixtureId: `synthetic-missing-stroke`,
      targetCharacter: `三`,
      encodedDrawnStrokes: encodeShapeContextStrokes(strokes.slice(0, 2)),
      drawnStrokes: strokes.slice(0, 2),
      referencePaths: reference,
      expectedAcceptance: false,
      acceptanceThreshold: hanziCharacterWritingSimilarityThreshold,
      gradingDurationMs: 1,
      geometry: missingSourceStroke,
      acceptance: missingStrokeAcceptance,
      contrastiveCandidates: [],
      expectedIssues: [
        {
          kind: `missing-stroke`,
          reference: { strokeIndex: 2 },
        },
      ],
    });
    expect(missingStrokeDiagnostic.schemaVersion).toBe(24);
    expect(missingStrokeDiagnostic.issueExpectations).toMatchObject({
      declared: true,
      expected: [{ satisfied: true }],
      allSatisfied: true,
    });
    expect(
      missingStrokeDiagnostic.algorithm.strokePresence.summary
        .unmatchedReferenceStrokeCount,
    ).toBe(1);
    expect(
      missingStrokeDiagnostic.score.missingReferenceStrokeFraction,
    ).toBeCloseTo(1 / 3, 2);
    expect(
      missingStrokeDiagnostic.score.missingReferenceStrokePenalty,
    ).toBeCloseTo(
      missingSourceStroke.weightedScoreContributions
        .missingReferenceStrokePenalty,
    );
    expect(missingStrokeDiagnostic.acceptance.strokeCompleteness).toMatchObject(
      {
        passed: false,
        referenceStrokeCount: 3,
        matchedReferenceStrokeCount: 2,
        unmatchedReferenceStrokeCount: 1,
        unmatchedReferenceStrokeIndices: [2],
      },
    );
    expect(missingStrokeDiagnostic.acceptance.rejectionCondition).toBe(
      `missingReferenceStroke`,
    );

    const missingStrokeSvg = renderShapeContextGraderDiagnosticSvg({
      fixtureId: `synthetic-missing-stroke`,
      targetCharacter: `三`,
      drawnStrokes: strokes.slice(0, 2),
      referencePaths: reference,
      geometry: missingSourceStroke,
      acceptance: missingStrokeAcceptance,
      contrastiveCandidates: [],
      expectedAcceptance: false,
      acceptanceThreshold: hanziCharacterWritingSimilarityThreshold,
      expectedIssues: [
        {
          kind: `missing-stroke`,
          reference: { strokeIndex: 2 },
        },
      ],
    });
    expect(missingStrokeSvg).toContain(`Localized writing issues (1)`);
    expect(missingStrokeSvg).toContain(`Missing stroke`);
    expect(missingStrokeSvg).toContain(`Issue expectations satisfied`);
    expect(missingStrokeSvg).toContain(
      `data-reference-stroke-status="unmatched"`,
    );
    expect(missingStrokeSvg).toContain(
      `data-stroke-completeness-reason="missingReferenceStroke"`,
    );
    expect(missingStrokeSvg).toContain(
      `data-score-contribution="missingReferenceStrokePenalty"`,
    );
    expect(missingStrokeSvg).toContain(
      `data-handwriting-stroke-status="matched"`,
    );
    const extraStrokeAcceptance = evaluateHanziCharacterWritingAcceptance(
      extraSourceStroke,
      [],
    );
    expect(extraStrokeAcceptance.strokeCompleteness).toMatchObject({
      passed: true,
      unmatchedReferenceStrokeCount: 0,
      unmatchedReferenceStrokeIndices: [],
    });
    const extraStrokeSvg = renderShapeContextGraderDiagnosticSvg({
      fixtureId: `synthetic-extra-stroke`,
      targetCharacter: `三`,
      drawnStrokes: [
        ...strokes,
        pointsForPaths([`M 700 700 L 710 700`])[0] ?? [],
      ],
      referencePaths: reference,
      geometry: extraSourceStroke,
      acceptance: extraStrokeAcceptance,
      contrastiveCandidates: [],
      expectedAcceptance: false,
      acceptanceThreshold: hanziCharacterWritingSimilarityThreshold,
    });
    expect(extraStrokeSvg).toContain(
      `data-handwriting-stroke-status="unmatched"`,
    );
  });

  test(`preserves original handwriting indices after discarding degenerate strokes`, () => {
    const result = gradeCharacterShape(
      [
        [
          { x: 5, y: 5 },
          { x: 5, y: 5 },
        ],
        [
          { x: 0, y: 0 },
          { x: 100, y: 0 },
        ],
        [
          { x: 0, y: 100 },
          { x: 100, y: 100 },
        ],
      ],
      [`M 0 0 L 100 0`],
    );

    expect(result.sourceStrokeOriginalIndices).toEqual([1, 2]);
    expect(result.issues).toEqual([
      {
        kind: `extra-stroke`,
        handwriting: { strokeIndex: 2, start: 0, end: 1 },
      },
    ]);
  });

  test(`preserves original reference indices after discarding degenerate paths`, () => {
    const result = gradeCharacterShape(pointsForPaths([`M 0 0 L 100 0`]), [
      `M 0 0 L 0 0`,
      `M 0 0 L 100 0`,
      `M 0 100 L 100 100`,
    ]);

    expect(result.targetStrokeOriginalIndices).toEqual([1, 2]);
    expect(result.issues).toContainEqual({
      kind: `missing-stroke`,
      reference: { strokeIndex: 2, start: 0, end: 1 },
    });
  });

  test(`extracts full, partial, and zero-length arc-length segments`, () => {
    const stroke = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 30 },
    ];
    expect(extractWritingStrokeSegment(stroke, 0, 1)).toEqual(stroke);
    expect(extractWritingStrokeSegment(stroke, 0.25, 0.75)).toEqual([
      { x: 10, y: 0 },
      { x: 10, y: 20 },
    ]);
    expect(extractWritingStrokeSegment(stroke, 0.5, 0.5)).toEqual([
      { x: 10, y: 10 },
    ]);
    const denseLine = Array.from({ length: 11 }, (_, index) => ({
      x: index * 10,
      y: 0,
    }));
    const sparseSegment = extractWritingStrokeSegment(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      0.25,
      0.75,
    );
    const denseSegment = extractWritingStrokeSegment(denseLine, 0.25, 0.75);
    expect(denseSegment[0]).toEqual(sparseSegment[0]);
    expect(denseSegment.at(-1)).toEqual(sparseSegment.at(-1));
    expect(
      extractReferenceStrokeSegment(`M 0 0 L 100 0`, 0.25, 0.75).at(0),
    ).toEqual({ x: 25, y: 0 });
    expect(
      extractReferenceStrokeSegment(`M 0 0 L 100 0`, 0.25, 0.75).at(-1),
    ).toEqual({ x: 75, y: 0 });
  });

  test(`constrains extreme shear without rejecting the whole transform`, () => {
    const result = gradeDeformation(({ x, y }) => ({ x: x + 4 * y, y }));

    expect(result.deformationAlpha).toBeGreaterThan(0);
    expect(result.deformationAlpha).toBeLessThan(1);
    expectTransformJacobianBounds(result);
  });

  test(`constrains excessive anisotropic scaling`, () => {
    const result = gradeDeformation(({ x, y }) => ({ x: 4 * x, y }));

    expect(result.deformationAlpha).toBeGreaterThan(0);
    expect(result.deformationAlpha).toBeLessThan(1);
    expectTransformJacobianBounds(result);
  });

  test(`leaves valid transformations unchanged and varies continuously`, () => {
    const identity = gradeDeformation((point) => point);
    const shearA = gradeDeformation(({ x, y }) => ({ x: x + 3 * y, y }));
    const shearB = gradeDeformation(({ x, y }) => ({ x: x + 3.001 * y, y }));

    expect(identity.deformationAlpha).toBe(1);
    expect(shearA.deformationAlpha).toBeLessThan(1);
    expect(shearB.deformationAlpha).toBeLessThan(1);
    expect(
      Math.abs(shearA.deformationAlpha - shearB.deformationAlpha),
    ).toBeLessThan(0.01);
    for (const [index, pointA] of shearA.transformedPoints.entries()) {
      const pointB = shearB.transformedPoints[index];
      if (pointB == null) {
        throw new Error(`Missing corresponding transformed point`);
      }
      expect(Math.hypot(pointA.x - pointB.x, pointA.y - pointB.y)).toBeLessThan(
        0.01,
      );
    }
    expectTransformJacobianBounds(shearA);
    expectTransformJacobianBounds(shearB);
  });

  test(`constrains TPS fitting and preserves registration diagnostics`, () => {
    const referencePaths = [`M 0 0 L 10 0`, `M 0 10 L 10 10`, `M 5 0 L 5 10`];
    const drawnStrokes = [
      [
        { x: 0, y: 0 },
        { x: 5, y: 1 },
        { x: 10, y: 1 },
      ],
      [
        { x: 0, y: 10 },
        { x: 5, y: 9 },
        { x: 10, y: 10 },
      ],
      [
        { x: 5, y: 0 },
        { x: 6, y: 5 },
        { x: 5, y: 10 },
      ],
    ];
    const result = gradeCharacterShape(drawnStrokes, referencePaths, {
      sampleCount: 8,
    });
    const zeroIterations = gradeCharacterShape(drawnStrokes, referencePaths, {
      sampleCount: 8,
      iterations: 0,
    });
    const roundCoordinate = (value: number): number => {
      const rounded = Number(value.toFixed(6));
      return Object.is(rounded, -0) ? 0 : rounded;
    };

    expect(
      result.transformedPoints.map(({ x, y }) => [
        roundCoordinate(x),
        roundCoordinate(y),
      ]),
    ).toEqual([
      [-1.489473, -1.485844],
      [1.106362, -1.350009],
      [-1.489503, 1.466144],
      [-0.036278, 1.165704],
      [1.435794, 1.449139],
      [-0.057668, -1.5367],
      [0.141481, -0.596658],
      [-0.016337, 1.515647],
    ]);
    expect(result.transformedPoints).not.toEqual(
      zeroIterations.transformedPoints,
    );
    expect(result.deformationAlpha).toBeCloseTo(0.516392, 6);
    expect(result.transform.rotationDegrees).toBeCloseTo(-1.30403, 5);
    expect(Number.isFinite(result.transform.bendingEnergy)).toBe(true);
    expect(Number.isFinite(result.transform.affineDistortion)).toBe(true);
  });

  test(`grades a complex character within the sample limit`, async () => {
    const paths = await characterPathsFor(`饿`);
    const similarReferences = await visuallySimilarReferencesFor(`饿`);
    const drawnStrokes = pointsForPaths(paths);
    const gradingStartedAt = performance.now();
    const result = gradeCharacterShape(drawnStrokes, paths);
    const similarCharacterGrades = gradeSimilarCharacters(
      drawnStrokes,
      similarReferences,
      result.options,
      result.sampleCount,
    );
    const acceptance = evaluateHanziCharacterWritingAcceptance(
      result,
      similarCharacterGrades,
    );
    const accepted = acceptance.finalAccepted;
    recordHandwritingEvaluation({
      example: {
        id: `饿-synthetic-identity`,
        drawnStrokes: encodeShapeContextStrokes(drawnStrokes),
      },
      character: `饿`,
      drawnStrokes,
      referencePaths: paths,
      expectedAcceptance: true,
      actualAcceptance: accepted,
      acceptance,
      geometry: result,
      similarCharacterGrades,
      durationMs: performance.now() - gradingStartedAt,
    });

    expect(result.shapeSimilarity).toBeGreaterThan(0.9);
    expect(result.sampleCount).toBeLessThanOrEqual(80);
    expect(accepted).toBe(true);
  });

  test(`tolerates a small gap in otherwise complete geometry`, () => {
    const paths = [`M 0 0 L 100 0`, `M 50 0 L 50 100`];
    const gapStrokes = [
      ...pointsForPaths([`M 0 0 L 48 0`]),
      ...pointsForPaths([`M 52 0 L 100 0`]),
      ...pointsForPaths([paths[1] ?? ``]),
    ];
    const result = gradeCharacterShape(gapStrokes, paths);

    expect(isHanziCharacterWritingAccepted(result, [])).toBe(true);
  });

  test(`configures sustained tangent mismatch rejection independently`, () => {
    const referencePaths = [`M 0 0 L 100 0`];
    const straight = gradeCharacterShape(
      pointsForPaths([`M 0 0 L 100 0`]),
      referencePaths,
    );
    expect(straight.sustainedTangentMismatchRejection.passed).toBe(true);
    const degenerate = gradeCharacterShape([[]], referencePaths);
    expect(degenerate.sustainedTangentMismatchRejection.passed).toBe(true);
    const malformed = pointsForPaths([`M 0 0 L 20 0 L 20 20 L 20 100`]);
    const briefMismatch = pointsForPaths([`M 0 0 L 30 0 L 31 1 L 100 0`]);
    const reversed = pointsForPaths([`M 100 0 L 0 0`]);

    const enabledMalformed = gradeCharacterShape(malformed, referencePaths);
    expect(enabledMalformed.sustainedTangentMismatchRejection.passed).toBe(
      false,
    );
    expect(
      enabledMalformed.sustainedTangentMismatchRejection.offendingStrokes
        .length,
    ).toBeGreaterThan(0);

    const disabledMalformed = gradeCharacterShape(malformed, referencePaths, {
      sustainedTangentMismatchEnabled: false,
    });
    expect(disabledMalformed.sustainedTangentMismatchRejection.passed).toBe(
      true,
    );

    const brief = gradeCharacterShape(briefMismatch, referencePaths);
    expect(brief.sustainedTangentMismatchRejection.passed).toBe(true);

    const reversedResult = gradeCharacterShape(reversed, referencePaths);
    expect(reversedResult.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: `reversed-stroke` }),
      ]),
    );
    expect(
      reversedResult.sustainedTangentMismatchRejection.offendingStrokes,
    ).toEqual([]);
  });

  test(`uses sustained-region boundaries and filters isolated noise`, () => {
    const exactBoundary = calculateShapeContextSustainedTangentRegions(
      Array.from({ length: 33 }, (_, index) => (index <= 18 ? 45 : 0)),
      45,
      0.05,
    );
    expect(exactBoundary).toHaveLength(1);
    expect(exactBoundary[0]?.lengthFraction).toBeCloseTo(18 / 32);

    const isolatedNoise = calculateShapeContextSustainedTangentRegions(
      [0, 0, 90, 0, 0],
      45,
      0.05,
      5,
    );
    expect(isolatedNoise).toEqual([]);

    const exactDegenerate = calculateShapeContextSustainedTangentRegions(
      [],
      45,
      0.05,
    );
    expect(exactDegenerate).toEqual([]);
  });

  test(`is invariant to translation and uniform scale`, () => {
    const transformed = makeStrokePoints(strokes, ({ x, y }) => ({
      x: x * 3 + 1200,
      y: y * 3 - 800,
    }));

    const baseline = gradeCharacterShape(strokes, reference);
    const changed = gradeCharacterShape(transformed, reference);
    expect(
      Math.abs(changed.shapeSimilarity - baseline.shapeSimilarity),
    ).toBeLessThan(0.03);
  });

  test(`grades 一 across straight, tilted, curved, translated, and scaled strokes`, async () => {
    const referencePaths = await characterPathsFor(`一`);
    const referenceStrokes = pointsForPaths(referencePaths);
    const [referenceStroke] = referenceStrokes;
    if (referenceStroke == null) {
      throw new Error(`Expected 一 to have reference stroke geometry`);
    }
    const minX = Math.min(...referenceStroke.map(({ x }) => x));
    const maxX = Math.max(...referenceStroke.map(({ x }) => x));
    const spanX = maxX - minX;
    const variants = [
      referenceStrokes,
      makeStrokePoints(referenceStrokes, ({ x, y }) => ({
        x: Math.cos(0.04) * x - Math.sin(0.04) * y,
        y: Math.sin(0.04) * x + Math.cos(0.04) * y,
      })),
      referenceStrokes.map((stroke) =>
        stroke.map((point) => ({
          x: point.x,
          y: point.y + 20 * Math.sin(((point.x - minX) / spanX) * Math.PI),
        })),
      ),
      makeStrokePoints(referenceStrokes, ({ x, y }) => ({
        x: x + 1200,
        y: y - 800,
      })),
      makeStrokePoints(referenceStrokes, ({ x, y }) => ({
        x: x * 2.5 - 900,
        y: y * 2.5 + 400,
      })),
    ];

    for (const drawnStrokes of variants) {
      const grade = gradeCharacterShape(drawnStrokes, referencePaths);
      expect(Number.isFinite(grade.shapeSimilarity)).toBe(true);
      expect(grade.shapeSimilarity).toBeGreaterThan(0.55);
      expect(grade.sampleCount).toBeLessThan(64);
    }
  });

  test(`uses a stable similarity fit for collinear stroke geometry`, () => {
    const referencePaths = [`M 100 512 L 924 512`];
    const grade = gradeCharacterShape(
      pointsForPaths(referencePaths),
      referencePaths,
    );

    expect(grade.transform.xWeights.every((weight) => weight === 0)).toBe(true);
    expect(Number.isFinite(grade.shapeSimilarity)).toBe(true);
  });

  test(`keeps 一 grading stable across pointer density and sample count`, async () => {
    const referencePaths = await characterPathsFor(`一`);
    const referenceStroke = pointsForPaths(referencePaths)[0];
    if (referenceStroke == null) {
      throw new Error(`Expected 一 to have reference stroke geometry`);
    }
    const first = referenceStroke[0];
    const last = referenceStroke.at(-1);
    if (first == null || last == null) {
      throw new Error(`Expected stroke endpoints`);
    }
    const denseStroke = Array.from({ length: 101 }, (_, index) => {
      const ratio = index / 100;
      return {
        x: first.x + (last.x - first.x) * ratio,
        y: first.y + (last.y - first.y) * ratio,
      };
    });
    const sparseGrade = gradeCharacterShape([[first, last]], referencePaths);
    const denseGrade = gradeCharacterShape([denseStroke], referencePaths);
    const fixed64Grade = gradeCharacterShape([[first, last]], referencePaths, {
      sampleCount: 64,
    });

    expect(denseGrade.sampleCount).toBe(sparseGrade.sampleCount);
    expect(
      Math.abs(denseGrade.shapeSimilarity - sparseGrade.shapeSimilarity),
    ).toBeLessThan(0.01);
    expect(
      Math.abs(fixed64Grade.shapeSimilarity - sparseGrade.shapeSimilarity),
    ).toBeLessThan(0.05);
    expect(fixed64Grade.sampleCount).toBe(64);

    const candidateReferences = [
      {
        hanzi: hanziCharacterSchema.parse(`二`),
        medianPaths: await characterPathsFor(`二`),
      },
    ];
    const candidates = gradeSimilarCharacters(
      [[first, last]],
      candidateReferences,
      sparseGrade.options,
      sparseGrade.sampleCount,
    );
    expect(candidates[0]?.geometry.sampleCount).toBe(sparseGrade.sampleCount);
  });

  test(`allows small rotations`, () => {
    const radians = (8 * Math.PI) / 180;
    const rotated = makeStrokePoints(strokes, ({ x, y }) => ({
      x: Math.cos(radians) * x - Math.sin(radians) * y,
      y: Math.sin(radians) * x + Math.cos(radians) * y,
    }));

    expect(
      gradeCharacterShape(rotated, reference).shapeSimilarity,
    ).toBeGreaterThan(0.75);
  });

  test(`selects rotation by total stroke-assignment cost`, () => {
    const drawnStrokes = rotateStrokes(strokes, 9);
    const options = {
      maxRotationDegrees: 12,
      rotationSteps: 2,
      sampleCount: 32,
    };
    const candidateDegrees = [-12, -6, 0, 6, 12] as const;
    const candidateResults = candidateDegrees.map((degrees) => {
      const candidate = gradeCharacterShape(
        rotateStrokes(drawnStrokes, degrees),
        reference,
        { ...options, iterations: 0, maxRotationDegrees: 0 },
      );
      return {
        cost:
          candidate.strokeAssignments.reduce(
            (cost, assignment) => cost + assignment.cost,
            0,
          ) +
          (candidate.unmatchedSourceStrokeIndices.length +
            candidate.unmatchedTargetStrokeIndices.length) *
            shapeContextGraderDefaults.unmatchedCost,
        initialMatchingError: candidate.initialMatchingError,
      };
    });
    const candidateCosts = candidateResults.map(({ cost }) => cost);
    const bestCandidateIndex = candidateCosts.indexOf(
      Math.min(...candidateCosts),
    );
    const bestCandidate = candidateResults[bestCandidateIndex];
    if (bestCandidate == null) {
      throw new Error(`Expected a rotation candidate`);
    }

    const result = gradeCharacterShape(drawnStrokes, reference, {
      ...options,
      iterations: 0,
      maxRotationDegrees: 12,
    });
    expect(result.initialMatchingError).toBeCloseTo(
      bestCandidate.initialMatchingError,
      6,
    );
  });

  test(`calculates stroke centroid costs after candidate rotation`, () => {
    const drawnStrokes = rotateStrokes(strokes, 9);
    const fixed = gradeCharacterShape(drawnStrokes, reference, {
      maxRotationDegrees: 0,
      rotationSteps: 2,
      sampleCount: 32,
      iterations: 0,
    });
    const searched = gradeCharacterShape(drawnStrokes, reference, {
      maxRotationDegrees: 12,
      rotationSteps: 2,
      sampleCount: 32,
      iterations: 0,
    });
    const matchedCentroidDistance = (
      geometry: ReturnType<typeof gradeCharacterShape>,
    ) => {
      let total = 0;
      for (const assignment of geometry.strokeAssignments) {
        const pairCost =
          geometry.strokePairCosts[assignment.sourceStrokeIndex]?.[
            assignment.targetStrokeIndex
          ];
        if (pairCost == null) {
          throw new Error(`Expected a cost for each stroke assignment`);
        }
        total += pairCost.centroidDistance;
      }
      return total;
    };

    expect(matchedCentroidDistance(searched)).toBeLessThan(
      matchedCentroidDistance(fixed),
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

    expect(gradeCharacterShape(distorted, reference).shapeCost).toBeGreaterThan(
      exact.shapeCost,
    );
    expect(gradeCharacterShape(missing, reference).shapeCost).toBeGreaterThan(
      exact.shapeCost,
    );
    expect(gradeCharacterShape(extra, reference).shapeCost).toBeGreaterThan(
      exact.shapeCost,
    );
  });

  test(`assigns a higher cost to a completely different geometry`, () => {
    const differentCharacter = [
      `M 100 100 L 500 500`,
      `M 500 100 L 100 500`,
      `M 300 100 L 300 500`,
    ];
    const exactCost = gradeCharacterShape(strokes, reference).shapeCost;
    const differentCost = gradeCharacterShape(
      pointsForPaths(differentCharacter),
      reference,
    ).shapeCost;

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

  test.for([
    [`土`, `士`],
    [`未`, `末`],
    [`己`, `已`],
    [`人`, `入`],
  ] as const)(
    `distinguishes visually similar reference characters: $0 and $1`,
    async ([character, similarCharacter]) => {
      const [expected, similar] = await Promise.all([
        characterPathsFor(character),
        characterPathsFor(similarCharacter),
      ]);
      const sameCost = gradeCharacterShape(
        pointsForPaths(expected),
        expected,
      ).shapeCost;
      const differentCost = gradeCharacterShape(
        pointsForPaths(expected),
        similar,
      ).shapeCost;

      expect(differentCost).toBeGreaterThan(sameCost);
    },
  );

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
      gradeCharacterShape([], []),
    ];

    for (const result of cases) {
      expect(Number.isFinite(result.shapeSimilarity)).toBe(true);
      expect(Number.isFinite(result.shapeCost)).toBe(true);
      expect(result.deformationAlpha).toBeGreaterThanOrEqual(0);
      expect(result.deformationAlpha).toBeLessThanOrEqual(1);
      const contributions = result.weightedScoreContributions;
      expect(result.shapeCost).toBeCloseTo(
        contributions.initialMatchingError +
          contributions.residualMatchingError +
          contributions.missingReferenceStrokePenalty +
          contributions.extraHandwritingStrokePenalty +
          contributions.emptyGeometryPenalty,
        12,
      );
      expect(result.shapeSimilarity).toBeCloseTo(
        Math.exp(-result.shapeCost),
        12,
      );
      expect(result.transform.transform({ x: 0, y: 0 })).toMatchObject({
        x: expect.any(Number),
        y: expect.any(Number),
      });
    }

    expect(
      cases[0]?.weightedScoreContributions.emptyGeometryPenalty,
    ).toBeCloseTo(0.8, 12);
    expect(
      cases[4]?.weightedScoreContributions.emptyGeometryPenalty,
    ).toBeCloseTo(0.8, 12);
    expect(cases[5]?.missingReferenceStrokeFraction).toBe(0);
    expect(cases[5]?.extraHandwritingStrokeFraction).toBe(0);
  });

  test(`keeps endpoints for many short strokes within the sample limit`, () => {
    const manyStrokes = Array.from({ length: 40 }, (_, index) => [
      { x: 0, y: index * 10 },
      { x: 100, y: index * 10 },
    ]);
    const manyPaths = manyStrokes.map(
      ([start, end]) => `M ${start?.x} ${start?.y} L ${end?.x} ${end?.y}`,
    );
    const result = gradeCharacterShape(manyStrokes, manyPaths);

    expect(result.sourcePoints.length).toBe(result.sampleCount);
    expect(result.sampleCount).toBeLessThanOrEqual(256);
    expect(result.sourceStrokes.length).toBe(40);
    expect(result.sourceStrokeSampleCounts.every((count) => count >= 2)).toBe(
      true,
    );
  });

  test(`caps raw handwriting points and stroke count`, () => {
    const longStroke = Array.from(
      { length: maxWritingPointCount * 2 },
      (_, x) => ({ x, y: 0 }),
    );
    const limitedLongStroke = limitWritingStrokes([longStroke]);
    const limitedManyStrokes = limitWritingStrokes(
      Array.from({ length: maxWritingStrokeCount + 1 }, () => [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ]),
    );

    expect(limitedLongStroke[0]).toHaveLength(maxWritingPointCount);
    expect(limitedLongStroke[0]?.[0]).toEqual({ x: 0, y: 0 });
    expect(limitedLongStroke[0]?.at(-1)).toEqual({
      x: maxWritingPointCount * 2 - 1,
      y: 0,
    });
    expect(limitedManyStrokes).toHaveLength(maxWritingStrokeCount);
    expect(
      limitedManyStrokes.reduce((total, stroke) => total + stroke.length, 0),
    ).toBeLessThanOrEqual(maxWritingPointCount);
  });

  test(`bounds default sampling for long reference shapes`, () => {
    const paths = Array.from(
      { length: 30 },
      (_, index) => `M 0 ${index * 10} L 1000 ${index * 10}`,
    );
    const result = gradeCharacterShape(pointsForPaths(paths), paths);

    expect(result.sampleCount).toBeLessThanOrEqual(80);
  });

  test(`keeps 一-1794183317007 correspondences in stroke order`, async () => {
    const example = positiveHandwritingExamples.find(
      ({ id }) => id === `一-1794183317007`,
    );
    if (example == null) {
      throw new Error(`Missing 一-1794183317007 handwriting example`);
    }
    const referencePaths = await characterPathsFor(`一`);
    const drawnStrokes = decodeShapeContextStrokes(example.drawnStrokes);
    const result = gradeCharacterShape(
      drawnStrokes,
      referencePaths,
      example.options,
    );
    const oneIteration = gradeCharacterShape(drawnStrokes, referencePaths, {
      ...example.options,
      iterations: 1,
    });
    const twoIterations = gradeCharacterShape(drawnStrokes, referencePaths, {
      ...example.options,
      iterations: 2,
    });
    const alignment = result.dtwAlignments[0];
    if (alignment == null) {
      throw new Error(`Missing DTW alignment for 一-1794183317007`);
    }

    expect(result.correspondences).toHaveLength(result.sourcePoints.length);
    expect(twoIterations.transformedPoints).not.toEqual(
      oneIteration.transformedPoints,
    );
    expect(alignment.pathLength).toBe(alignment.path.length);
    expect(alignment.costMatrix).toHaveLength(
      alignment.sourcePointIndices.length,
    );
    expect(alignment.costMatrix[0]).toHaveLength(
      alignment.referencePointIndices.length,
    );
    expect(alignment.longestRepeatedIndexRun).toBeGreaterThan(1);
    expect(
      alignment.path.some(
        (point, index) =>
          index > 0 &&
          point.targetIndex === alignment.path[index - 1]?.targetIndex,
      ),
    ).toBe(true);
    expect(
      result.correspondences.map(({ sourceIndex }) => sourceIndex),
    ).toEqual(result.sourcePoints.map((_, index) => index));
    const targetIndices = result.correspondences.map(
      ({ targetIndex }) => targetIndex,
    );
    const isNondecreasing = targetIndices.every(
      (targetIndex, index) =>
        index === 0 || targetIndex >= (targetIndices[index - 1] ?? Infinity),
    );
    const isNonincreasing = targetIndices.every(
      (targetIndex, index) =>
        index === 0 || targetIndex <= (targetIndices[index - 1] ?? -Infinity),
    );
    expect(isNondecreasing || isNonincreasing).toBe(true);

    const acceptance = evaluateHanziCharacterWritingAcceptance(result, []);
    const svg = renderShapeContextGraderDiagnosticSvg({
      fixtureId: example.id,
      targetCharacter: `一`,
      drawnStrokes: decodeShapeContextStrokes(example.drawnStrokes),
      referencePaths,
      geometry: result,
      acceptance,
      contrastiveCandidates: [],
      expectedAcceptance: true,
      acceptanceThreshold: hanziCharacterWritingSimilarityThreshold,
    });
    expect(svg).toContain(`data-dtw-alignment="0-0"`);
    expect(svg).toContain(`data-dtw-proportional-diagonal="forward"`);
    expect(svg).toContain(`data-dtw-path-segment="reference-index"`);
    expect(svg).toContain(`longest repeated-index run`);
  });

  for (const example of [
    ...positiveHandwritingExamples,
    ...negativeHandwritingExamples,
  ].filter(
    ({ expectedIssues, unexpectedIssues }) =>
      (expectedIssues?.length ?? 0) > 0 || (unexpectedIssues?.length ?? 0) > 0,
  )) {
    test(
      `${example.id} independently checks declared writing issues`,
      {
        fails: handwritingDiagnoseMode
          ? false
          : (example.expectedIssues?.some(
              ({ kind }) => kind === `wrong-stroke-order`,
            ) ?? false),
      },
      async () => {
        const character = shapeContextGraderExampleCharacter(example);
        const referencePaths = await characterPathsFor(character);
        const geometry = gradeCharacterShape(
          decodeShapeContextStrokes(example.drawnStrokes),
          referencePaths,
          example.options,
        );
        const expectationStatus = evaluateWritingIssueExpectations(
          geometry.issues,
          example.expectedIssues,
          example.unexpectedIssues,
        );

        expect(
          expectationStatus.allSatisfied,
          `${example.id}: expected issue assertions ${JSON.stringify(
            expectationStatus,
          )}; actual issues ${JSON.stringify(geometry.issues)}`,
        ).toBe(true);
      },
    );
  }

  for (const example of positiveHandwritingExamples) {
    test(
      `${example.id} (example) applies acceptance criteria`,
      { fails: handwritingDiagnoseMode ? false : example.fails },
      async (context) => {
        const character = shapeContextGraderExampleCharacter(example);
        const [referencePaths, similarReferences] = await Promise.all([
          characterPathsFor(character),
          visuallySimilarReferencesFor(character),
        ]);
        expect(referencePaths.length).toBeGreaterThan(0);
        const drawnStrokes = decodeShapeContextStrokes(example.drawnStrokes);
        const gradingStartedAt = performance.now();
        const result = gradeCharacterShape(
          drawnStrokes,
          referencePaths,
          example.options,
        );
        const similarCharacterGrades = gradeSimilarCharacters(
          drawnStrokes,
          similarReferences,
          result.options,
          result.sampleCount,
        );
        const acceptance = evaluateHanziCharacterWritingAcceptance(
          result,
          similarCharacterGrades,
        );
        const accepted = acceptance.finalAccepted;
        if (example.id === `人-1794543326583`) {
          expect(acceptance.primaryShapeThreshold.observedValue).toBeCloseTo(
            0.787,
            4,
          );
          expect(acceptance.primaryShapeThreshold.passed).toBe(true);
          expect(acceptance.contrastiveCheck.ran).toBe(true);
          expect(acceptance.contrastiveCheck.metric).toBe(`shapeSimilarity`);
          expect(acceptance.contrastiveCheck.passed).toBe(true);
          expect(
            acceptance.contrastiveCheck.rejectingCandidateCharacter,
          ).toBeNull();
          const ruComparison = acceptance.contrastiveCheck.candidates.find(
            ({ character: candidate }) => candidate === `入`,
          );
          expect(ruComparison).toEqual(
            expect.objectContaining({
              evaluated: true,
              passed: true,
              observedMargin: expect.any(Number),
            }),
          );
          expect(ruComparison?.observedMargin).toBeCloseTo(0.0700205, 6);
        }
        recordHandwritingEvaluation({
          example,
          character,
          drawnStrokes,
          referencePaths,
          expectedAcceptance: true,
          actualAcceptance: accepted,
          acceptance,
          geometry: result,
          similarCharacterGrades,
          durationMs: performance.now() - gradingStartedAt,
        });
        if (handwritingDiagnoseMode) {
          await annotateShapeContextGraderExample({
            context,
            example,
            character,
            drawnStrokes,
            referencePaths,
            geometry: result,
            similarCharacterGrades,
            acceptance,
            expectedAcceptance: true,
            gradingDurationMs: performance.now() - gradingStartedAt,
          });
        }
        expect(
          similarCharacterGrades.every(
            ({ geometry }) => geometry.sampleCount === result.sampleCount,
          ),
        ).toBe(true);
        expect(accepted).toBe(
          acceptance.strokeCompleteness.passed &&
            result.shapeSimilarity >=
              hanziCharacterWritingSimilarityThreshold &&
            similarCharacterGrades.every(
              ({ geometry }) =>
                result.shapeSimilarity > geometry.shapeSimilarity,
            ),
        );
        expect(acceptance.strokeCompleteness.passed).toBe(true);
        expect(accepted).toBe(true);
      },
    );
  }

  test(`rejects 牛 with its central vertical stroke omitted`, async () => {
    const example = {
      id: `牛-20261019230837`,
      drawnStrokes: `327.7,193;327.5,193;327.2,193.4;327.2,194.7;327.2,197.7;327.2,202.5;327.2,208.5;327.2,214.3;327.2,219;326.8,225;325.5,232.6;323.5,240;320.6,247.1;316.5,254.4;312.4,261.6;307.7,269.4;303.4,276.2;298.2,283.2;291.3,294.2;283.8,306.3;274.8,319;265.7,332.2;256.2,346.4;248,359.1;242.7,367.4;237.5,375.4;232.6,383;229.3,388.6;226.1,394.1;223,398.8;221.2,401.9;219.3,404.7;217.1,407.8;214.7,411.3;212.7,414.4;210.7,417.3;208.4,419.8;207,421.3;206,422.5;205.2,423.4;204.6,424|272.2,317.9;272.4,317.9;273.8,317.9;276.4,317.9;281,317.9;287.5,317.9;294.3,317.9;303.5,317.9;320.7,317.9;341.1,317.9;356.8,317.9;376,317.9;403,317.9;435.2,317.9;471.5,317.9;507.8,317.9;547.1,317.9;586.6,317.9;613.7,317.9;636.5,317.9;661.9,317.9;683.9,317.9;696.1,317.9;703.3,317.9;713.3,317.9;721.6,317.9;728.3,317.9;733.2,317.9;735.7,317.9;737.1,317.9;738.3,317.9;739.2,317.9|165.9,556;165.9,556.2;165.7,556.4;166.4,556.4;169,556.4;174.3,556.4;183.8,556.4;197,555.8;213.5,553.1;234.1,548.8;258.3,543.3;299.5,534.4;333.3,527.9;356.6,524.5;394.1,519.1;437.6,513.8;482.8,511;524.6,509.5;567.3,508.3;606.4,508.1;630.4,508.1;650.4,508.1;673.5,508.1;692.6,508.1;706.2,508.1;714.5,508.1;723.4,508.1;732.4,508.1;739.2,508.1;744.3,508.4;747.7,509.1;749.6,509.4;750.9,509.7;751.8,510;752.3,510.3;752.8,510.5;753.6,510.8;754.7,511.1;755.8,511.3;757.4,511.8;759.7,512.4;762.5,513.2;765.3,513.9;768.2,514.6;771.2,515.4;774.9,516.2;778.4,517;781.8,517.3;785.7,517.7;789.1,518.4;791.7,518.8;794.4,519.1;797.5,519.4;800,519.4;802.1,519.7;804.2,520;805.6,520.1;806.3,520.3;806.9,520.6;807.4,520.6;807.9,520.6;808.4,520.6`,
      options: {
        sampleCount: null,
        sampleSpacing: 0.1,
        radialBins: 5,
        angularBins: 12,
        iterations: 3,
        tpsRegularization: 0.08,
        unmatchedCost: 0.55,
        maxRotationDegrees: 12,
        rotationSteps: 1,
      },
    };
    const referencePaths = await characterPathsFor(`牛`);
    const result = gradeCharacterShape(
      decodeShapeContextStrokes(example.drawnStrokes),
      referencePaths,
      example.options,
    );

    expect(result.unmatchedTargetStrokeIndices.length).toBeGreaterThan(0);
    expect(result.shapeSimilarity).toBeLessThan(
      hanziCharacterWritingSimilarityThreshold,
    );
    expect(isHanziCharacterWritingAccepted(result, [])).toBe(false);
  });

  for (const example of negativeHandwritingExamples) {
    test(
      `rejects negative example ${example.id}`,
      { fails: handwritingDiagnoseMode ? false : example.fails },
      async (context) => {
        const character = shapeContextGraderExampleCharacter(example);
        const [referencePaths, similarReferences] = await Promise.all([
          characterPathsFor(character),
          visuallySimilarReferencesFor(character),
        ]);
        const drawnStrokes = decodeShapeContextStrokes(example.drawnStrokes);
        const gradingStartedAt = performance.now();
        const result = gradeCharacterShape(
          drawnStrokes,
          referencePaths,
          example.options,
        );
        const similarCharacterGrades = gradeSimilarCharacters(
          drawnStrokes,
          similarReferences,
          result.options,
          result.sampleCount,
        );
        const acceptance = evaluateHanziCharacterWritingAcceptance(
          result,
          similarCharacterGrades,
        );
        const accepted = acceptance.finalAccepted;
        if (example.id === `午-20261019194748`) {
          expect(acceptance.primaryShapeThreshold.observedValue).toBeCloseTo(
            0.9214,
            4,
          );
          expect(acceptance.primaryShapeThreshold.passed).toBe(true);
          expect(acceptance.contrastiveCheck.ran).toBe(true);
          expect(acceptance.contrastiveCheck.metric).toBe(`shapeSimilarity`);
          expect(acceptance.contrastiveCheck.passed).toBe(false);
          expect(acceptance.contrastiveCheck.rejectingCandidateCharacter).toBe(
            `牛`,
          );
          expect(acceptance.rejectionCondition).toBe(
            `candidateShapeSimilarityNotLower`,
          );
          const rejectingCandidate =
            acceptance.contrastiveCheck.candidates.find(
              ({ character: candidate }) =>
                candidate ===
                acceptance.contrastiveCheck.rejectingCandidateCharacter,
            );
          expect(rejectingCandidate).toMatchObject({
            evaluated: true,
            passed: false,
            observedMargin: expect.any(Number),
          });
          expect(rejectingCandidate?.observedMargin).toBeLessThanOrEqual(0);
        }
        if (
          example.id === `看-1794183717589` ||
          example.id === `做-1794183743160` ||
          example.id === `做-1794529035833`
        ) {
          expect(acceptance.strokeCompleteness.passed).toBe(false);
          expect(
            acceptance.strokeCompleteness.unmatchedReferenceStrokeCount,
          ).toBeGreaterThan(0);
          expect(acceptance.rejectionCondition).toBe(`missingReferenceStroke`);
        }
        recordHandwritingEvaluation({
          example,
          character,
          drawnStrokes,
          referencePaths,
          expectedAcceptance: false,
          actualAcceptance: accepted,
          acceptance,
          geometry: result,
          similarCharacterGrades,
          durationMs: performance.now() - gradingStartedAt,
        });
        if (handwritingDiagnoseMode) {
          await annotateShapeContextGraderExample({
            context,
            example,
            character,
            drawnStrokes,
            referencePaths,
            geometry: result,
            similarCharacterGrades,
            acceptance,
            expectedAcceptance: false,
            gradingDurationMs: performance.now() - gradingStartedAt,
          });
        }
        expect(
          similarCharacterGrades.every(
            ({ geometry }) => geometry.sampleCount === result.sampleCount,
          ),
        ).toBe(true);
        expect(
          accepted,
          `${example.id}: contrastive grading accepted a negative example`,
        ).toBe(false);
      },
    );
  }

  test(`keeps the registered grid from folding on the 午 contrastive example`, async () => {
    const example = {
      id: `午-20261019194748`,
      drawnStrokes: `366.4,107.6;366.4,107.8;366.4,108.7;366.1,111.1;364.6,115.6;360.1,124.8;353.6,137.3;339.1,161.4;321.4,188.3;307.7,208.1;291.9,230.6;275.5,252.7;263.2,268.6;252.4,282.1;242.7,294.5;233.5,305.8;223.4,317.6;216.7,325.3;211.4,331.3;206,337.3;201.5,341.9;198.9,344.3;197.4,345.5;196.5,346.4;195.9,346.9;195.4,347.2|298.4,238;298.6,238;299.9,238;303.2,238;308.6,238;316.4,238;330.9,238;350.1,238;370.9,238;394.5,238;419.5,238;439.1,238;458.2,238;477.3,238;495.7,239.2;516.8,241.1;535.2,242.6;548.6,243.8;558.9,245;570.2,246.1;579.9,246.8;587.6,247.3;593.6,247.7;598.1,247.7;601.5,247.7;603.4,247.7;604.6,247.7;605.9,247.7;606.8,247.7;607.5,247.7;608,247.7|151.7,514.9;152.8,514.9;158.8,514.9;170.3,514.9;181.7,514.9;198.2,514.9;233.3,513.1;284.6,509.9;322.2,508.5;354.5,507.5;399.9,506.5;448.4,506.5;495,506.4;534.9,506.4;572.9,506.4;595.8,506.4;611,506.4;633.1,506.4;652.6,506.4;669.9,506.4;685.6,506.4;698.9,506.4;709.1,506.4;718.1,506.4;725.1,506.4;730.9,506.4;737,506.4;741.6,506.4;749,506.4;755.3,505.9;759,505.2;764.6,504.9;770,504.5;774.6,504.1;779.5,504;783.7,504;787.8,504;791.3,504;794,503.7;795.8,503.3;796.9,503.3;797.7,503.3;798.2,503.3;798.6,503.3;799,503.3;799.5,503.3;800,503.3;800.5,503.3;801,503.3;801.5,503.3|459.5,128.2;459.5,129.3;459.5,134.4;459.5,144.2;459.5,154.6;459.5,174.1;459.5,206.8;459.5,279.5;459.5,364.7;459.5,436.5;459.5,518.4;459.5,596.4;459.5,647.9;461.7,688.3;463.9,723.4;464.5,743.4;465.9,771.5;467.6,800.9;469.1,823.8;470,838.9;470.8,850.4;471.4,861.5;471.9,869.5;472.4,875.4;472.4,879.4;472.4,882.1;472.4,884.2;472.4,885.4;472.4,885.9;472.4,886.3;472.4,886.7;472.4,887.1;472.4,887.6`,
    };
    const character = shapeContextGraderExampleCharacter(example);
    const [referencePaths, similarReferences] = await Promise.all([
      characterPathsFor(character),
      visuallySimilarReferencesFor(character),
    ]);
    const drawnStrokes = decodeShapeContextStrokes(example.drawnStrokes);
    const targetGrade = gradeCharacterShape(drawnStrokes, referencePaths);
    const similarCharacterGrades = gradeSimilarCharacters(
      drawnStrokes,
      similarReferences,
      targetGrade.options,
      targetGrade.sampleCount,
    );

    expectDebugGridDoesNotFold(targetGrade);
    for (const { geometry } of similarCharacterGrades) {
      expectDebugGridDoesNotFold(geometry);
    }
  });

  test(`round-trips saved examples through JSON and URL fragments`, () => {
    const example = positiveHandwritingExamples.find(
      ({ id }) => id === `十-synthetic-positive`,
    );
    if (example == null) {
      throw new Error(`Expected a grader example`);
    }
    const exampleWithOptions = {
      ...example,
      options: shapeContextGraderDefaults,
    };

    expect(
      encodeShapeContextStrokes(
        decodeShapeContextStrokes(example.drawnStrokes),
      ),
    ).toBe(example.drawnStrokes);
    expect(encodeShapeContextStrokes([[{ x: 1.26, y: 2.04 }]])).toBe(`1.3,2`);
    expect(
      parseShapeContextGraderExampleJson(
        serializeShapeContextGraderExample(exampleWithOptions),
      ),
    ).toEqual(exampleWithOptions);
    expect(shapeContextGraderExampleCharacter(exampleWithOptions)).toBe(`十`);
    expect(
      parseShapeContextGraderExampleFragment(
        shapeContextGraderExampleFragment(exampleWithOptions),
      ),
    ).toEqual(exampleWithOptions);

    const {
      sampleSpacing: _,
      missingReferenceStrokePenaltyWeight: _missingWeight,
      extraHandwritingStrokePenaltyWeight: _extraWeight,
      ...legacyOptions
    } = shapeContextGraderDefaults;
    const legacyExample = {
      ...exampleWithOptions,
      options: { ...legacyOptions, sampleCount: 64 },
    };
    expect(
      parseShapeContextGraderExampleJson(JSON.stringify(legacyExample)).options
        ?.sampleSpacing,
    ).toBe(shapeContextGraderDefaults.sampleSpacing);
    const legacyGraderOptions = parseShapeContextGraderExampleJson(
      JSON.stringify(legacyExample),
    ).options;
    expect(legacyGraderOptions?.missingReferenceStrokePenaltyWeight).toBe(
      shapeContextGraderDefaults.missingReferenceStrokePenaltyWeight,
    );
    expect(legacyGraderOptions?.extraHandwritingStrokePenaltyWeight).toBe(
      shapeContextGraderDefaults.extraHandwritingStrokePenaltyWeight,
    );
  });

  test.for([...positiveHandwritingExamples, ...negativeHandwritingExamples])(
    `stores $id coordinates to one decimal place`,
    ({ drawnStrokes }) => {
      expect(drawnStrokes).not.toMatch(/\d+\.\d{2,}/u);
    },
  );

  test(`keeps handwriting example IDs unique`, () => {
    const examples = [
      ...positiveHandwritingExamples,
      ...negativeHandwritingExamples,
    ];
    expect(new Set(examples.map(({ id }) => id)).size).toBe(examples.length);
  });

  test.for([...positiveHandwritingExamples, ...negativeHandwritingExamples])(
    `validates saved handwriting example $id`,
    ({ id, drawnStrokes, options }) => {
      const parsed = parseShapeContextGraderExampleJson(
        JSON.stringify({ id, drawnStrokes, options }),
      );
      expect(
        encodeShapeContextStrokes(
          decodeShapeContextStrokes(parsed.drawnStrokes),
        ),
      ).toBe(drawnStrokes);
    },
  );

  test(`rejects invalid grader example JSON`, () => {
    const example = positiveHandwritingExamples[0];
    if (example == null) {
      throw new Error(`Expected a grader example`);
    }
    expect(() => parseShapeContextGraderExampleJson(`not json`)).toThrow();
    expect(() =>
      parseShapeContextGraderExampleJson(
        JSON.stringify({
          ...example,
          drawnStrokes: `Infinity,0`,
        }),
      ),
    ).toThrow();
    expect(() => decodeShapeContextStrokes(`1,2;;3,4`)).toThrow();
  });
});
