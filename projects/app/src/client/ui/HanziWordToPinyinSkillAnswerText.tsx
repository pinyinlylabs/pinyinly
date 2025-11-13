import type { HanziWordSkill } from "@/data/rizzleSchema";
import { hanziWordFromSkill } from "@/data/skills";
import { Text } from "react-native";
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
