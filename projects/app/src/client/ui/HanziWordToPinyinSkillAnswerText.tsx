import type { HanziWordSkill } from "@/data/model";
import { hanziWordFromSkill } from "@/data/skills";
import { Text } from "@/client/ui/Text";
import { HanziWordRefText } from "./HanziWordRefText";

export const HanziWordToPinyinSkillAnswerText = ({
  skill,
}: {
  skill: HanziWordSkill;
}) => {
  const hanziWord = hanziWordFromSkill(skill);

  return (
    <Text className="pyly-body-2xl">
      <HanziWordRefText hanziWord={hanziWord} showPinyin gloss={false} />
    </Text>
  );
};
