import type { Question } from "./model";
import { SkillKind } from "./model";
import { hanziWordToGlossQuestionOrThrow } from "./questions/hanziWordToGloss";
import { hanziWordToPinyinQuestionOrThrow } from "./questions/hanziWordToPinyin";
import { hanziWordToPinyinFinalQuestionOrThrow } from "./questions/hanziWordToPinyinFinal";
import { hanziWordToPinyinInitialQuestionOrThrow } from "./questions/hanziWordToPinyinInitial";
import { hanziWordToPinyinToneQuestionOrThrow } from "./questions/hanziWordToPinyinTone";
import type { HanziWordSkill, Skill } from "./rizzleSchema";
import { skillKindFromSkill } from "./skills";

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
