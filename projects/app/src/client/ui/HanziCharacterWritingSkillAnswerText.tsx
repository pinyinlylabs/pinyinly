import type { HanziCharacterWritingSkill } from "@/data/model";
import { hanziCharacterFromWritingSkill } from "@/data/skills";
import { Text } from "@/client/ui/Text";
import { HanziLink } from "./HanziLink";

export const HanziCharacterWritingSkillAnswerText = ({
  skill,
}: {
  skill: HanziCharacterWritingSkill;
}) => {
  const hanzi = hanziCharacterFromWritingSkill(skill);

  return (
    <Text className="pyly-body-2xl">
      <HanziLink hanzi={hanzi}>{hanzi}</HanziLink>
    </Text>
  );
};
