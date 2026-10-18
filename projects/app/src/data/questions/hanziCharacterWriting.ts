import type {
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
import type { ShapeContextGrade } from "@/util/shapeContextGrader";
import type { WritingStrokePoint } from "@/util/writingStrokeGrader";
import type { Rating } from "@/util/fsrs";

export const hanziCharacterWritingSimilarityThreshold = 0.72;

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

export interface HanziCharacterWritingQuestionGrade {
  correct: boolean;
  rating: Rating;
  skillRatings: UnsavedSkillRating[];
  failure: `shape` | null;
  geometry: ShapeContextGrade;
}

export function gradeHanziCharacterWritingQuestion(
  question: HanziCharacterWritingQuestion,
  drawnStrokes: readonly (readonly WritingStrokePoint[])[],
  medianPaths: readonly string[],
  durationMs: number,
): HanziCharacterWritingQuestionGrade {
  const geometry = gradeCharacterShape(drawnStrokes, medianPaths);
  const correct =
    geometry.similarity >= hanziCharacterWritingSimilarityThreshold;

  const skillRating = computeSkillRating({
    skill: question.skill,
    correct,
    durationMs,
    writingStrokeCount: medianPaths.length,
  });

  return {
    correct,
    rating: skillRating.rating,
    skillRatings: [skillRating],
    failure: correct ? null : `shape`,
    geometry,
  };
}
