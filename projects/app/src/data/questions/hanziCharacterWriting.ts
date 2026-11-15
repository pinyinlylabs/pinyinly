import type {
  HanziCharacter,
  HanziCharacterWritingQuestion,
  HanziCharacterWritingSkill,
  QuestionFlagType,
  UnsavedSkillRating,
  Dictionary,
} from "@/data/model";
import { QuestionKind } from "@/data/model";
import {
  computeSkillRating,
  hanziCharacterFromWritingSkill,
} from "@/data/skills";
import { isHanziCharacter } from "@/data/hanzi";
import { loadDictionary } from "@/dictionary";
import { invariant } from "@pinyinly/lib/invariant";
import { gradeCharacterShape } from "@/util/shapeContextGrader";
import {
  encodeShapeContextStrokes,
  serializeShapeContextGraderExample,
} from "@/util/shapeContextGraderExample";
import type {
  ShapeContextGrade,
  ShapeContextOptions,
  WritingStrokePoint,
} from "@/util/shapeContextGrader";
import type { Rating } from "@/util/fsrs";

export const hanziCharacterWritingSimilarityThreshold = 0.72;

export interface SimilarCharacterReference {
  hanzi: HanziCharacter;
  medianPaths: readonly string[];
}

export interface SimilarCharacterGrade {
  hanzi: HanziCharacter;
  geometry: ShapeContextGrade;
}

export interface HanziCharacterWritingAcceptanceDecision {
  primaryShapeThreshold: {
    metric: `shapeSimilarity`;
    comparisonOperator: `>=`;
    observedValue: number;
    requiredValue: number;
    passed: boolean;
  };
  strokeCompleteness: {
    passed: boolean;
    referenceStrokeCount: number;
    matchedReferenceStrokeCount: number;
    unmatchedReferenceStrokeCount: number;
    unmatchedReferenceStrokeIndices: number[];
  };
  contrastiveCheck: {
    ran: boolean;
    passed: boolean | null;
    metric: `shapeSimilarity`;
    comparisonOperator: `>`;
    requiredMargin: 0;
    observedMargin: number | null;
    rejectingCandidateCharacter: string | null;
    skippedReason: `primaryShapeThresholdFailed` | null;
    candidates: Array<{
      index: number;
      character: string;
      evaluated: boolean;
      observedMargin: number | null;
      passed: boolean | null;
    }>;
  };
  finalAccepted: boolean;
  rejectionCondition:
    | `missingReferenceStroke`
    | `primaryShapeThresholdFailed`
    | `candidateShapeSimilarityNotLower`
    | null;
}

export function evaluateHanziCharacterWritingAcceptance(
  geometry: ShapeContextGrade,
  similarCharacterGrades: readonly SimilarCharacterGrade[],
): HanziCharacterWritingAcceptanceDecision {
  const primaryPassed =
    geometry.shapeSimilarity >= hanziCharacterWritingSimilarityThreshold;
  const unmatchedReferenceStrokeIndices = [
    ...geometry.unmatchedTargetStrokeIndices,
  ];
  const referenceStrokesComplete = unmatchedReferenceStrokeIndices.length === 0;
  const referenceStrokeCount = geometry.targetStrokes.length;
  const candidates: HanziCharacterWritingAcceptanceDecision[`contrastiveCheck`][`candidates`] =
    similarCharacterGrades.map(({ hanzi }, index) => ({
      index,
      character: hanzi,
      evaluated: false,
      observedMargin: null,
      passed: null,
    }));
  let contrastivePassed: boolean | null = null;
  let observedMargin: number | null = null;
  let rejectingCandidateCharacter: string | null = null;

  if (primaryPassed) {
    contrastivePassed = true;
    for (const [
      index,
      { geometry: similarGeometry },
    ] of similarCharacterGrades.entries()) {
      const candidate = candidates[index];
      if (candidate == null) {
        throw new Error(`Missing contrastive candidate diagnostic`);
      }
      const margin = geometry.shapeSimilarity - similarGeometry.shapeSimilarity;
      const passed = geometry.shapeSimilarity > similarGeometry.shapeSimilarity;
      candidate.evaluated = true;
      candidate.observedMargin = margin;
      candidate.passed = passed;
      observedMargin =
        observedMargin == null ? margin : Math.min(observedMargin, margin);

      if (!passed) {
        contrastivePassed = false;
        rejectingCandidateCharacter = candidate.character;
        break;
      }
    }
  }

  const rejectionCondition = referenceStrokesComplete
    ? primaryPassed
      ? contrastivePassed === false
        ? `candidateShapeSimilarityNotLower`
        : null
      : `primaryShapeThresholdFailed`
    : `missingReferenceStroke`;

  return {
    primaryShapeThreshold: {
      metric: `shapeSimilarity`,
      comparisonOperator: `>=`,
      observedValue: geometry.shapeSimilarity,
      requiredValue: hanziCharacterWritingSimilarityThreshold,
      passed: primaryPassed,
    },
    strokeCompleteness: {
      passed: referenceStrokesComplete,
      referenceStrokeCount,
      matchedReferenceStrokeCount:
        referenceStrokeCount - unmatchedReferenceStrokeIndices.length,
      unmatchedReferenceStrokeCount: unmatchedReferenceStrokeIndices.length,
      unmatchedReferenceStrokeIndices,
    },
    contrastiveCheck: {
      ran: primaryPassed,
      passed: contrastivePassed,
      metric: `shapeSimilarity`,
      comparisonOperator: `>`,
      requiredMargin: 0,
      observedMargin,
      rejectingCandidateCharacter,
      skippedReason: primaryPassed ? null : `primaryShapeThresholdFailed`,
      candidates,
    },
    finalAccepted:
      referenceStrokesComplete && primaryPassed && contrastivePassed === true,
    rejectionCondition,
  };
}

export function isHanziCharacterWritingAccepted(
  geometry: ShapeContextGrade,
  similarCharacterGrades: readonly SimilarCharacterGrade[],
): boolean {
  return evaluateHanziCharacterWritingAcceptance(
    geometry,
    similarCharacterGrades,
  ).finalAccepted;
}

export function gradeSimilarCharacters(
  drawnStrokes: readonly (readonly WritingStrokePoint[])[],
  similarCharacterReferences: readonly SimilarCharacterReference[],
  options?: Partial<ShapeContextOptions>,
  sampleCount?: number,
): SimilarCharacterGrade[] {
  return similarCharacterReferences.map(({ hanzi, medianPaths }) => ({
    hanzi,
    geometry: gradeCharacterShape(
      drawnStrokes,
      medianPaths,
      options,
      sampleCount,
    ),
  }));
}

export async function hanziCharacterWritingQuestionOrThrow(
  skill: HanziCharacterWritingSkill,
  flag: QuestionFlagType | null,
  dictionary?: Dictionary,
): Promise<HanziCharacterWritingQuestion> {
  const hanzi = hanziCharacterFromWritingSkill(skill);
  invariant(isHanziCharacter(hanzi), `writing skill must be for one character`);

  const dictionaryData = dictionary ?? (await loadDictionary());
  const meaning = dictionaryData
    .lookupHanzi(hanzi)
    .find(([, item]) => item.gloss[0] != null && item.pinyin?.[0] != null)?.[1];
  invariant(
    meaning?.gloss[0] != null && meaning.pinyin?.[0] != null,
    `character ${hanzi} must have a gloss and pinyin for writing practice`,
  );

  return {
    kind: QuestionKind.HanziCharacterWriting,
    skill,
    hanzi,
    gloss: meaning.gloss[0],
    pinyin: meaning.pinyin[0],
    flag,
  };
}

export interface HanziCharacterWritingQuestionRating {
  correct: boolean;
  rating: Rating;
  skillRatings: UnsavedSkillRating[];
  failure: `shape` | `stroke-segmentation` | `contrastive` | null;
  geometry: ShapeContextGrade;
  similarCharacterGrades: SimilarCharacterGrade[];
}

export function createHanziCharacterWritingRatingReportJson({
  question,
  rating,
  drawnStrokes,
}: {
  question: HanziCharacterWritingQuestion;
  rating: HanziCharacterWritingQuestionRating;
  drawnStrokes: readonly (readonly WritingStrokePoint[])[];
}): string {
  return serializeShapeContextGraderExample({
    id: `${question.hanzi}-${Date.now()}`,
    drawnStrokes: encodeShapeContextStrokes(drawnStrokes),
    options: rating.geometry.options,
  });
}

export function gradeHanziCharacterWritingQuestion(
  question: HanziCharacterWritingQuestion,
  drawnStrokes: readonly (readonly WritingStrokePoint[])[],
  medianPaths: readonly string[],
  durationMs: number,
  similarCharacterReferences: readonly SimilarCharacterReference[] = [],
): HanziCharacterWritingQuestionRating {
  const geometry = gradeCharacterShape(drawnStrokes, medianPaths);
  const similarCharacterGrades = gradeSimilarCharacters(
    drawnStrokes,
    similarCharacterReferences,
    geometry.options,
    geometry.sampleCount,
  );
  const correct = isHanziCharacterWritingAccepted(
    geometry,
    similarCharacterGrades,
  );

  const skillRating = computeSkillRating({
    skill: question.skill,
    correct,
    durationMs,
  });

  return {
    correct,
    rating: skillRating.rating,
    skillRatings: [skillRating],
    failure: correct
      ? null
      : geometry.unmatchedTargetStrokeIndices.length > 0
        ? `stroke-segmentation`
        : geometry.shapeSimilarity < hanziCharacterWritingSimilarityThreshold
          ? `shape`
          : `contrastive`,
    geometry,
    similarCharacterGrades,
  };
}
