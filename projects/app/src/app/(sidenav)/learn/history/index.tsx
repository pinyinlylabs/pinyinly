import { targetSkillsReviewQueue } from "@/client/query";
import { useRizzleQueryPaged } from "@/client/ui/ReplicacheContext";
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
  skillTypeFromSkill,
  skillTypeToShorthand,
} from "@/data/skills";
import {
  emptyArray,
  inverseSortComparator,
  sortComparatorDate,
} from "@/util/collections";
import { Rating } from "@/util/fsrs";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

export default function HistoryPage() {
  const data2Query = useRizzleQueryPaged(
    [HistoryPage.name, `targetSkillsReviewQueue`],
    (r) => targetSkillsReviewQueue(r),
  );

  const skillRatingsQuery = useRizzleQueryPaged(
    [HistoryPage.name, `skillRatings`],
    async (r) => {
      const res = await r.queryPaged.skillRating.byCreatedAt().toArray();
      return res.reverse();
    },
  );

  const hanziGlossMistakesQuery = useRizzleQueryPaged(
    [HistoryPage.name, `hanziGlossMistakesQuery`],
    async (r) => {
      return await r.queryPaged.hanziGlossMistake.byCreatedAt().toArray();
    },
  );

  const hanziPinyinMistakesQuery = useRizzleQueryPaged(
    [HistoryPage.name, `hanziPinyinMistakesQuery`],
    async (r) => {
      return await r.queryPaged.hanziPinyinMistake.byCreatedAt().toArray();
    },
  );

  const allMistakes = useMemo(() => {
    return [
      ...(hanziGlossMistakesQuery.data ?? emptyArray),
      ...(hanziPinyinMistakesQuery.data ?? emptyArray),
    ].sort(
      inverseSortComparator(
        sortComparatorDate(([, mistake]) => mistake.createdAt),
      ),
    );
  }, [hanziGlossMistakesQuery.data, hanziPinyinMistakesQuery.data]);

  return (
    <ScrollView contentContainerClassName="py-safe-offset-4 px-safe-or-4 items-center">
      <View className="max-w-[600px] gap-4">
        <View className="flex-row gap-2">
          <View className="flex-1 items-center gap-[10px]">
            <Text className="text-xl text-text">available queue</Text>

            {data2Query.data?.available.map((skill, i) => (
              <View key={i} className="flex-col items-center">
                <Text className="hhh-text-body">{skillParam(skill)}</Text>
                <Text className="hhh-text-caption">
                  {skillTypeToShorthand(skillTypeFromSkill(skill))}
                </Text>
              </View>
            ))}
          </View>

          <View>
            <Text className="self-center text-xl text-text">mistakes</Text>
            {allMistakes.map(([_key, value], i) => (
              <View key={i}>
                <Text className="text-text">
                  {value.hanzi} ❌{` `}
                  {`gloss` in value ? value.gloss : value.pinyin}
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
                      : value.rating === Rating.Hard
                        ? `🟠`
                        : value.rating === Rating.Good
                          ? `🟡`
                          : // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                            value.rating === Rating.Easy
                            ? `🟢`
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
  switch (skillTypeFromSkill(skill)) {
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
      return skillTypeToShorthand(skillTypeFromSkill(skill));
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
      return hanziWordFromSkill(skill);
    }
  }
};
