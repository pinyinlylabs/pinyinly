import type {
  HanziCharacter,
  HanziCharacterWritingQuestion,
  HanziCharacterWritingSkill,
} from "#data/model.ts";
import { pinyinTextSchema, QuestionKind } from "#data/model.ts";
import {
  createHanziCharacterWritingRatingReportJson,
  evaluateHanziCharacterWritingAcceptance,
  gradeHanziCharacterWritingQuestion,
  hanziCharacterWritingSimilarityThreshold,
  isHanziCharacterWritingAccepted,
} from "#data/questions/hanziCharacterWriting.ts";
import { Rating } from "#util/fsrs.ts";
import {
  decodeShapeContextStrokes,
  parseShapeContextGraderExampleJson,
  shapeContextGraderExampleCharacter,
} from "#util/shapeContextGraderExample.ts";
import { describe, expect, test } from "vitest";

const question: HanziCharacterWritingQuestion = {
  kind: QuestionKind.HanziCharacterWriting,
  skill: `hwr:好` as HanziCharacterWritingSkill,
  hanzi: `好` as HanziCharacter,
  gloss: `good`,
  pinyin: pinyinTextSchema.parse(`hǎo`),
  flag: null,
};

describe(`gradeHanziCharacterWritingQuestion`, () => {
  const expectedPath = `M 100 100 L 500 100`;

  test(`accepts matching strokes when submitted`, () => {
    const result = gradeHanziCharacterWritingQuestion(
      question,
      [
        [
          { x: 100, y: 100 },
          { x: 500, y: 100 },
        ],
      ],
      [expectedPath],
      1000,
    );

    expect(result).toMatchObject({
      correct: true,
      failure: null,
    });
    expect(result.rating).not.toBe(Rating.Again);
  });

  test(`rejects unmatched reference strokes without a stroke-count rule`, () => {
    const result = gradeHanziCharacterWritingQuestion(
      question,
      [
        [
          { x: 100, y: 100 },
          { x: 500, y: 100 },
        ],
      ],
      [expectedPath, expectedPath],
      1000,
    );

    expect(result.geometry.unmatchedTargetStrokeIndices).toHaveLength(1);
    expect(result).toMatchObject({
      correct: false,
      failure: `stroke-segmentation`,
      rating: Rating.Again,
    });
  });

  test(`rejects a shape that matches a similar character equally well`, () => {
    const result = gradeHanziCharacterWritingQuestion(
      question,
      [
        [
          { x: 100, y: 100 },
          { x: 500, y: 100 },
        ],
      ],
      [expectedPath],
      1000,
      [{ hanzi: `牛` as HanziCharacter, medianPaths: [expectedPath] }],
    );

    expect(result.geometry.shapeSimilarity).toBeGreaterThanOrEqual(
      hanziCharacterWritingSimilarityThreshold,
    );
    expect(result).toMatchObject({
      correct: false,
      failure: `contrastive`,
      rating: Rating.Again,
    });
  });

  test(`uses shape similarity for threshold and contrastive grading`, () => {
    const geometry = gradeHanziCharacterWritingQuestion(
      question,
      [
        [
          { x: 100, y: 100 },
          { x: 500, y: 100 },
        ],
      ],
      [expectedPath],
      1000,
    ).geometry;
    const targetGeometry = {
      ...geometry,
      shapeSimilarity: 0.8,
    };
    const moreSimilarGeometry = {
      ...geometry,
      shapeSimilarity: 0.9,
    };
    const lessSimilarGeometry = {
      ...geometry,
      shapeSimilarity: 0.7,
    };

    expect(isHanziCharacterWritingAccepted(targetGeometry, [])).toBe(true);
    expect(
      isHanziCharacterWritingAccepted(targetGeometry, [
        { hanzi: `牛` as HanziCharacter, geometry: moreSimilarGeometry },
      ]),
    ).toBe(false);
    expect(
      isHanziCharacterWritingAccepted(targetGeometry, [
        { hanzi: `牛` as HanziCharacter, geometry: lessSimilarGeometry },
      ]),
    ).toBe(true);
  });

  test(`uses the standard quiz speed rating thresholds`, () => {
    const strokes = Array.from({ length: 4 }, () => [
      { x: 100, y: 100 },
      { x: 500, y: 100 },
    ]);
    const medianPaths = Array.from({ length: 4 }, () => expectedPath);

    expect(
      gradeHanziCharacterWritingQuestion(question, strokes, medianPaths, 4999)
        .rating,
    ).toBe(Rating.Easy);
    expect(
      gradeHanziCharacterWritingQuestion(question, strokes, medianPaths, 5000)
        .rating,
    ).toBe(Rating.Good);
    expect(
      gradeHanziCharacterWritingQuestion(question, strokes, medianPaths, 9999)
        .rating,
    ).toBe(Rating.Good);
    expect(
      gradeHanziCharacterWritingQuestion(question, strokes, medianPaths, 10_000)
        .rating,
    ).toBe(Rating.Hard);
  });

  test(`rejects empty geometry when reference strokes remain unmatched`, () => {
    const result = gradeHanziCharacterWritingQuestion(
      question,
      [],
      [expectedPath],
      1000,
    );

    expect(result).toMatchObject({
      correct: false,
      failure: `stroke-segmentation`,
      rating: Rating.Again,
    });
  });

  test(`ignores stroke direction when comparing visual shape`, () => {
    const result = gradeHanziCharacterWritingQuestion(
      question,
      [
        [
          { x: 500, y: 100 },
          { x: 100, y: 100 },
        ],
      ],
      [expectedPath],
      1000,
    );

    expect(result).toMatchObject({
      correct: true,
      failure: null,
    });
  });

  test(`serializes a report in the shared writing debug example format`, () => {
    const drawnStrokes = [
      [
        { x: 100, y: 100 },
        { x: 500, y: 100 },
      ],
    ];
    const rating = gradeHanziCharacterWritingQuestion(
      question,
      drawnStrokes,
      [expectedPath],
      1000,
    );

    const report = parseShapeContextGraderExampleJson(
      createHanziCharacterWritingRatingReportJson({
        question,
        rating,
        drawnStrokes,
      }),
    );

    expect(shapeContextGraderExampleCharacter(report)).toBe(question.hanzi);
    expect(decodeShapeContextStrokes(report.drawnStrokes)).toEqual(
      drawnStrokes,
    );
    expect(report.options).toEqual(rating.geometry.options);
  });

  test(`serializes a reported false negative in the shared debug format`, () => {
    const drawnStrokes = [
      [
        { x: 100, y: 100 },
        { x: 500, y: 100 },
      ],
    ];
    const rating = gradeHanziCharacterWritingQuestion(
      question,
      drawnStrokes,
      [expectedPath],
      1000,
      [{ hanzi: `牛` as HanziCharacter, medianPaths: [expectedPath] }],
    );
    const report = parseShapeContextGraderExampleJson(
      createHanziCharacterWritingRatingReportJson({
        question,
        rating,
        drawnStrokes,
      }),
    );

    expect(shapeContextGraderExampleCharacter(report)).toBe(question.hanzi);
    expect(decodeShapeContextStrokes(report.drawnStrokes)).toEqual(
      drawnStrokes,
    );
  });

  test(`instruments contrastive short-circuit and no-candidate decisions`, () => {
    const geometry = gradeHanziCharacterWritingQuestion(
      question,
      [
        [
          { x: 100, y: 100 },
          { x: 500, y: 100 },
        ],
      ],
      [expectedPath],
      1000,
    ).geometry;
    const targetGeometry = {
      ...geometry,
      shapeSimilarity: 0.8,
    };
    const noCandidates = evaluateHanziCharacterWritingAcceptance(
      targetGeometry,
      [],
    );
    expect(noCandidates).toMatchObject({
      primaryShapeThreshold: { passed: true },
      sustainedTangentMismatchCheck: {
        enabled: expect.any(Boolean),
        passed: true,
      },
      contrastiveCheck: {
        ran: true,
        passed: true,
        observedMargin: null,
        candidates: [],
      },
      strokeCompleteness: {
        passed: true,
        referenceStrokeCount: 1,
        matchedReferenceStrokeCount: 1,
        unmatchedReferenceStrokeCount: 0,
        unmatchedReferenceStrokeIndices: [],
      },
      finalAccepted: true,
    });

    const decision = evaluateHanziCharacterWritingAcceptance(targetGeometry, [
      {
        hanzi: `牛` as HanziCharacter,
        geometry: {
          ...targetGeometry,
          shapeSimilarity: 0.75,
        },
      },
      {
        hanzi: `入` as HanziCharacter,
        geometry: {
          ...targetGeometry,
          shapeSimilarity: 0.8,
        },
      },
      {
        hanzi: `午` as HanziCharacter,
        geometry: {
          ...targetGeometry,
          shapeSimilarity: 0.7,
        },
      },
    ]);
    expect(decision.contrastiveCheck).toMatchObject({
      ran: true,
      passed: false,
      metric: `shapeSimilarity`,
      requiredMargin: 0,
      observedMargin: 0,
      rejectingCandidateCharacter: `入`,
      candidates: [
        { evaluated: true, observedMargin: expect.any(Number), passed: true },
        { evaluated: true, observedMargin: 0, passed: false },
        { evaluated: false, observedMargin: null, passed: null },
      ],
    });
    expect(decision.contrastiveCheck.candidates[0]?.observedMargin).toBeCloseTo(
      0.05,
    );
    expect(decision.rejectionCondition).toBe(
      `candidateShapeSimilarityNotLower`,
    );
    const skipped = evaluateHanziCharacterWritingAcceptance(
      { ...targetGeometry, shapeSimilarity: 0.71 },
      [
        {
          hanzi: `牛` as HanziCharacter,
          geometry: targetGeometry,
        },
      ],
    );
    expect(skipped).toMatchObject({
      primaryShapeThreshold: { passed: false },
      contrastiveCheck: {
        ran: false,
        passed: null,
        skippedReason: `primaryShapeThresholdFailed`,
        candidates: [{ evaluated: false, passed: null }],
      },
      finalAccepted: false,
      rejectionCondition: `primaryShapeThresholdFailed`,
    });

    const sustainedMismatch = {
      ...targetGeometry,
      sustainedTangentMismatchRejection: {
        enabled: true,
        passed: false,
        thresholdDegrees: 45,
        minimumLengthFraction: 0.5625,
        noiseLengthFraction: 0.05,
        tangentWindowFraction: 0.1,
        offendingStrokes: [
          {
            handwritingStrokeIndex: 0,
            referenceStrokeIndex: 0,
            direction: `forward` as const,
            longestSustainedMismatchFraction: 0.5625,
            regions: [
              {
                startFraction: 0,
                endFraction: 0.5625,
                lengthFraction: 0.5625,
                mismatchSampleCount: 19,
                isolatedSpike: false,
              },
            ],
          },
        ],
      },
    };
    const sustainedDecision = evaluateHanziCharacterWritingAcceptance(
      sustainedMismatch,
      [],
    );
    expect(sustainedDecision).toMatchObject({
      sustainedTangentMismatchCheck: {
        enabled: true,
        passed: false,
        thresholdDegrees: 45,
        minimumLengthFraction: 0.5625,
        tangentWindowFraction: 0.1,
      },
      finalAccepted: false,
      rejectionCondition: `sustainedTangentMismatch`,
    });
  });
});
