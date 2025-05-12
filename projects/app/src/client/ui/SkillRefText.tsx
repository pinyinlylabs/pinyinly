import { SkillType } from "@/data/model";
import type {
  DeprecatedSkill,
  HanziWordSkill,
  PinyinFinalAssociationSkill,
  PinyinInitialAssociationSkill,
  Skill,
} from "@/data/rizzleSchema";
import {
  finalFromPinyinFinalAssociationSkill,
  hanziWordFromSkill,
  initialFromPinyinInitialAssociationSkill,
  skillTypeFromSkill,
  skillTypeToShorthand,
} from "@/data/skills";
import { Text } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";

export const SkillRefText = ({
  skill,
  context,
}: {
  skill: Skill;
  context: `body` | `caption`;
}) => {
  switch (skillTypeFromSkill(skill)) {
    case SkillType.PinyinFinalAssociation: {
      skill = skill as PinyinFinalAssociationSkill;
      return <Text>-{finalFromPinyinFinalAssociationSkill(skill)}</Text>;
    }
    case SkillType.PinyinInitialAssociation: {
      skill = skill as PinyinInitialAssociationSkill;
      return <Text>{initialFromPinyinInitialAssociationSkill(skill)}-</Text>;
    }
    case SkillType.Deprecated_RadicalToEnglish:
    case SkillType.Deprecated_EnglishToRadical:
    case SkillType.Deprecated_RadicalToPinyin:
    case SkillType.Deprecated_PinyinToRadical:
    case SkillType.Deprecated: {
      skill = skill as DeprecatedSkill;
      return <Text>{skillTypeToShorthand(skillTypeFromSkill(skill))}</Text>;
    }
    case SkillType.HanziWordToGloss:
    case SkillType.HanziWordToPinyin:
    case SkillType.HanziWordToPinyinInitial:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.GlossToHanziWord:
    case SkillType.PinyinToHanziWord:
    case SkillType.ImageToHanziWord: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      return <HanziWordRefText hanziWord={hanziWord} context={context} />;
    }
  }
};
