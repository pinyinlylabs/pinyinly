import { fsrsIsForgotten } from "@/util/fsrs";
import { add } from "date-fns/add";
import { interval } from "date-fns/interval";
import type { Question, QuestionFlagType, SrsStateType } from "./model";
import { QuestionFlagKind, SkillKind, SrsKind } from "./model";
import { hanziWordToGlossQuestionOrThrow } from "./questions/hanziWordToGloss";
import { hanziWordToPinyinQuestionOrThrow } from "./questions/hanziWordToPinyin";
import { hanziWordToPinyinFinalQuestionOrThrow } from "./questions/hanziWordToPinyinFinal";
import { hanziWordToPinyinInitialQuestionOrThrow } from "./questions/hanziWordToPinyinInitial";
import { hanziWordToPinyinToneQuestionOrThrow } from "./questions/hanziWordToPinyinTone";
import type { HanziWordSkill, Skill } from "./rizzleSchema";
import {
  isHarderDifficultyStyleSkillKind,
  skillDueWindow,
  skillKindFromSkill,
} from "./skills";

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

export function flagForQuestion(state: {
  skillKind: SkillKind;
  isInRetryQueue: boolean;
  srsState: SrsStateType | undefined;
}): QuestionFlagType | undefined {
  if (state.isInRetryQueue) {
    return { kind: QuestionFlagKind.Retry };
  }

  if (!state.srsState || isForgotten(state.srsState)) {
    // Instead of saying "New Skill" when it's just a harder version of an
    // existing skill, say "New Difficulty" instead.
    const isNewDifficulty = isHarderDifficultyStyleSkillKind(state.skillKind);

    return {
      kind: isNewDifficulty
        ? QuestionFlagKind.NewDifficulty
        : QuestionFlagKind.NewSkill,
    };
  }

  const now = new Date();
  const overDueDate = add(state.srsState.nextReviewAt, skillDueWindow);

  if (now >= overDueDate) {
    return {
      kind: QuestionFlagKind.Overdue,
      interval: interval(overDueDate.getTime(), now),
    };
  }
}

function isForgotten(srsState: SrsStateType) {
  switch (srsState.kind) {
    case SrsKind.FsrsFourPointFive: {
      return fsrsIsForgotten(srsState);
    }
    case SrsKind.Mock: {
      return false;
    }
  }
}
