import { hsk1SkillReview } from "@/client/query";
import {
  useReplicache,
  useRizzleQueryPaged,
} from "@/client/ui/ReplicacheContext";
import { SkillType } from "@/data/model";
import {
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
  skillType,
  skillTypeToShorthand,
} from "@/data/skills";
import { Rating } from "@/util/fsrs";
import { useQuery } from "@tanstack/react-query";
import { ScrollView, Text, View } from "react-native";

export default function HistoryPage() {
  const r = useReplicache();

  const data2Query = useQuery({
    queryKey: [HistoryPage.name, `hsk1SkillReview`],
    queryFn: async () => {
      return await hsk1SkillReview(r);
    },
  });

  const skillRatingsQuery = useRizzleQueryPaged(
    [HistoryPage.name, `skillRatings`],
    async (r) => {
      const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
      return res.reverse();
    },
  );

  return (
    <ScrollView contentContainerClassName="py-safe-offset-4 px-safe-or-4 items-center">
      <View className="max-w-[600px] gap-4">
        <View className="flex-row gap-2">
          <View className="flex-1 items-center gap-[10px]">
            <Text className="text-xl text-text">upcoming2</Text>

            {data2Query.data?.map((skill, i) => (
              <View key={i} className="flex-col items-center">
                <Text className="hhh-text-body">{skillParam(skill)}</Text>
                <Text className="hhh-text-caption">
                  {skillTypeToShorthand(skillType(skill))}
                </Text>
              </View>
            ))}
          </View>

          <View>
            <Text className="self-center text-xl text-text">history</Text>

            {skillRatingsQuery.data?.map(([_key, value], i) => {
              const { skill, createdAt } = value;
              return (
                <View key={i}>
                  <Text className="text-text">
                    {value.rating === Rating.Again
                      ? `❌`
                      : value.rating === Rating.Good
                        ? `✅`
                        : value.rating}
                    {` `}
                    {skillParam(skill)}: {createdAt.toISOString()}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const skillParam = (skill: Skill): string => {
  switch (skillType(skill)) {
    case SkillType.PinyinFinalAssociation: {
      skill = skill as PinyinFinalAssociationSkill;
      return `-${finalFromPinyinFinalAssociationSkill(skill)}`;
    }
    case SkillType.PinyinInitialAssociation: {
      skill = skill as PinyinInitialAssociationSkill;
      return `${initialFromPinyinInitialAssociationSkill(skill)}-`;
    }
    case SkillType.Deprecated_RadicalToEnglish:
    case SkillType.Deprecated_EnglishToRadical:
    case SkillType.Deprecated_RadicalToPinyin:
    case SkillType.Deprecated_PinyinToRadical:
    case SkillType.Deprecated: {
      skill = skill as DeprecatedSkill;
      return skillTypeToShorthand(skillType(skill));
    }
    case SkillType.HanziWordToEnglish:
    case SkillType.HanziWordToPinyinInitial:
    case SkillType.HanziWordToPinyinFinal:
    case SkillType.HanziWordToPinyinTone:
    case SkillType.EnglishToHanziWord:
    case SkillType.PinyinToHanziWord:
    case SkillType.ImageToHanziWord: {
      skill = skill as HanziWordSkill;
      return hanziWordFromSkill(skill);
    }
  }
};
