import { add } from "date-fns/add";
import { interval } from "date-fns/interval";
import type { DeepReadonly } from "ts-essentials";
import type { Question, QuestionFlagType, SrsStateType } from "./model";
import { QuestionFlagKind, SkillKind } from "./model";
import { hanziWordToGlossQuestionOrThrow } from "./questions/hanziWordToGloss";
import { hanziWordToPinyinQuestionOrThrow } from "./questions/hanziWordToPinyin";
import { hanziWordToPinyinFinalQuestionOrThrow } from "./questions/hanziWordToPinyinFinal";
import { hanziWordToPinyinInitialQuestionOrThrow } from "./questions/hanziWordToPinyinInitial";
import { hanziWordToPinyinToneQuestionOrThrow } from "./questions/hanziWordToPinyinTone";
import type { HanziWordSkill, Skill } from "./rizzleSchema";
import type { SkillReviewQueue } from "./skills";
import { skillDueWindow, skillKindFromSkill } from "./skills";

export async function generateQuestionForSkillOrThrow(
  skill: Skill,
): Promise<Question> {
  switch (skillKindFromSkill(skill)) {
    case SkillKind.HanziWordToGloss: {
      skill = skill as HanziWordSkill;
      return await hanziWordToGlossQuestionOrThrow(skill);
    }
    case SkillKind.HanziWordToPinyinTyped: {
      skill = skill as HanziWordSkill;
      return await hanziWordToPinyinQuestionOrThrow(skill);
    }
    case SkillKind.HanziWordToPinyinInitial: {
      skill = skill as HanziWordSkill;
      return await hanziWordToPinyinInitialQuestionOrThrow(skill);
    }
    case SkillKind.HanziWordToPinyinFinal: {
      skill = skill as HanziWordSkill;
      return await hanziWordToPinyinFinalQuestionOrThrow(skill);
    }
    case SkillKind.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      return await hanziWordToPinyinToneQuestionOrThrow(skill);
    }
    case SkillKind.Deprecated_EnglishToRadical:
    case SkillKind.Deprecated_PinyinToRadical:
    case SkillKind.Deprecated_RadicalToEnglish:
    case SkillKind.Deprecated_RadicalToPinyin:
    case SkillKind.Deprecated:
    case SkillKind.GlossToHanziWord:
    case SkillKind.ImageToHanziWord:
    case SkillKind.PinyinFinalAssociation:
    case SkillKind.PinyinInitialAssociation:
    case SkillKind.PinyinToHanziWord: {
      throw new Error(`todo: not implemented`);
    }
  }
}

export function flagForQuestion(
  queueIndex: number,
  reviewQueue: DeepReadonly<SkillReviewQueue>,
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>,
): QuestionFlagType | undefined {
  const { indexRanges, items } = reviewQueue;
  const skill = items[queueIndex]?.skill;
  if (skill === undefined) {
    throw new Error(`No skill at queue index ${queueIndex}`);
  }
  const srsState = skillSrsStates.get(skill);

  // Check if this is a retry item
  if (
    queueIndex >= indexRanges.retry.start &&
    queueIndex < indexRanges.retry.end
  ) {
    return { kind: QuestionFlagKind.Retry };
  }

  // Check if this is a new difficulty item (using index ranges from queue)
  if (
    queueIndex >= indexRanges.newDifficulty.start &&
    queueIndex < indexRanges.newDifficulty.end
  ) {
    return { kind: QuestionFlagKind.NewDifficulty };
  }

  // Check if this is a new content item (using index ranges from queue)
  if (
    queueIndex >= indexRanges.newContent.start &&
    queueIndex < indexRanges.newContent.end
  ) {
    return { kind: QuestionFlagKind.NewSkill };
  }

  // Check for overdue items
  if (
    queueIndex >= indexRanges.overdue.start &&
    queueIndex < indexRanges.overdue.end
  ) {
    if (!srsState) {
      throw new Error(`Overdue item must have srsState`);
    }
    const now = new Date();
    const overDueDate = add(srsState.nextReviewAt, skillDueWindow);
    return {
      kind: QuestionFlagKind.Overdue,
      interval: interval(overDueDate.getTime(), now),
    };
  }

  // No flag needed for other items (due, reactive, not-due)
  return undefined;
}
