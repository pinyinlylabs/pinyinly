import type {
  HanziWordSkill,
  HanziWordToGlossTypedSkill,
  Question,
  QuestionFlagType,
  Skill,
} from "./model";
import { SkillKind } from "./model";
import { hanziWordToGlossQuestionOrThrow } from "./questions/hanziWordToGloss";
import { hanziWordToGlossTypedQuestionOrThrow } from "./questions/hanziWordToGlossTyped";
import { hanziWordToPinyinFinalQuestionOrThrow } from "./questions/hanziWordToPinyinFinal";
import { hanziWordToPinyinInitialQuestionOrThrow } from "./questions/hanziWordToPinyinInitial";
import { hanziWordToPinyinToneQuestionOrThrow } from "./questions/hanziWordToPinyinTone";
import { hanziWordToPinyinTypedQuestionOrThrow } from "./questions/hanziWordToPinyinTyped";
import { skillKindFromSkill } from "./skills";

export async function generateQuestionForSkillOrThrow(
  skill: Skill,
  flag: QuestionFlagType | null,
): Promise<Question> {
  switch (skillKindFromSkill(skill)) {
    case SkillKind.HanziWordToGloss: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      return hanziWordToGlossQuestionOrThrow(skill, flag);
    }
    case SkillKind.HanziWordToGlossTyped: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordToGlossTypedSkill;
      return hanziWordToGlossTypedQuestionOrThrow(skill, flag);
    }
    case SkillKind.HanziWordToPinyinTyped: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      return hanziWordToPinyinTypedQuestionOrThrow(skill, flag);
    }
    case SkillKind.HanziWordToPinyinInitial: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      return hanziWordToPinyinInitialQuestionOrThrow(skill, flag);
    }
    case SkillKind.HanziWordToPinyinFinal: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      return hanziWordToPinyinFinalQuestionOrThrow(skill, flag);
    }
    case SkillKind.HanziWordToPinyinTone: {
      // oxlint-disable-next-line typescript/no-unnecessary-type-assertion
      skill = skill as HanziWordSkill;
      return hanziWordToPinyinToneQuestionOrThrow(skill, flag);
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
