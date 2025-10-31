import { SkillKind } from "@/data/model";
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
  skillKindFromSkill,
  skillKindToShorthand,
} from "@/data/skills";
import { Text } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";

export const SkillRefText = ({ skill }: { skill: Skill }) => {
  switch (skillKindFromSkill(skill)) {
    case SkillKind.PinyinFinalAssociation: {
      skill = skill as PinyinFinalAssociationSkill;
      return <Text>-{finalFromPinyinFinalAssociationSkill(skill)}</Text>;
    }
    case SkillKind.PinyinInitialAssociation: {
      skill = skill as PinyinInitialAssociationSkill;
      return <Text>{initialFromPinyinInitialAssociationSkill(skill)}-</Text>;
    }
    case SkillKind.Deprecated_RadicalToEnglish:
    case SkillKind.Deprecated_EnglishToRadical:
    case SkillKind.Deprecated_RadicalToPinyin:
    case SkillKind.Deprecated_PinyinToRadical:
    case SkillKind.Deprecated: {
      skill = skill as DeprecatedSkill;
      return <Text>{skillKindToShorthand(skillKindFromSkill(skill))}</Text>;
    }
    case SkillKind.HanziWordToPinyinTyped: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      return (
        <HanziWordRefText hanziWord={hanziWord} gloss={false} showPinyin />
      );
    }
    case SkillKind.HanziWordToPinyinInitial: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      return (
        <>
          <HanziWordRefText hanziWord={hanziWord} gloss={false} showPinyin />
          <Text className="pyly-body-caption"> (initial)</Text>
        </>
      );
    }
    case SkillKind.HanziWordToPinyinFinal: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      return (
        <>
          <HanziWordRefText hanziWord={hanziWord} gloss={false} showPinyin />
          <Text className="pyly-body-caption"> (final)</Text>
        </>
      );
    }
    case SkillKind.HanziWordToPinyinTone: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      return (
        <>
          <HanziWordRefText hanziWord={hanziWord} gloss={false} showPinyin />
          <Text className="pyly-body-caption"> (tone)</Text>
        </>
      );
    }
    case SkillKind.GlossToHanziWord:
    case SkillKind.PinyinToHanziWord:
    case SkillKind.ImageToHanziWord:
    case SkillKind.HanziWordToGloss: {
      skill = skill as HanziWordSkill;
      const hanziWord = hanziWordFromSkill(skill);
      return <HanziWordRefText hanziWord={hanziWord} />;
    }
  }
};
