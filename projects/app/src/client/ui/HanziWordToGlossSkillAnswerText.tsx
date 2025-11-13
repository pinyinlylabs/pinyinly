import type { HanziWordSkill } from "@/data/rizzleSchema";
import { hanziWordFromSkill } from "@/data/skills";
import { Text } from "react-native";
import { Pylymark } from "./Pylymark";

export const HanziWordToGlossSkillAnswerText = ({
  skill,
}: {
  skill: HanziWordSkill;
}) => {
  const hanziWord = hanziWordFromSkill(skill);

  return (
    <>
      <Text className="pyly-body-2xl">
        <Pylymark source={`{${hanziWord}}`} />
      </Text>
    </>
  );
};
