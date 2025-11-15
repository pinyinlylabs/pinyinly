import { SkillKind } from "@/data/model";
import type { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import { skillKindFromSkill } from "@/data/skills";
import { HanziWordToGlossSkillAnswerText } from "./HanziWordToGlossSkillAnswerText";
import { HanziWordToPinyinSkillAnswerText } from "./HanziWordToPinyinSkillAnswerText";

export const SkillAnswerText = ({ skill }: { skill: Skill }) => {
  switch (skillKindFromSkill(skill)) {
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
      throw new Error(
        `ShowSkillAnswer not implemented for ${skillKindFromSkill(skill)}`,
      );
    }
    case SkillKind.HanziWordToGlossTyped:
    case SkillKind.HanziWordToGloss: {
      skill = skill as HanziWordSkill;
      return <HanziWordToGlossSkillAnswerText skill={skill} />;
    }
    case SkillKind.HanziWordToPinyinTyped:
    case SkillKind.HanziWordToPinyinFinal:
    case SkillKind.HanziWordToPinyinInitial:
    case SkillKind.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      return <HanziWordToPinyinSkillAnswerText skill={skill} />;
    }
  }
};
