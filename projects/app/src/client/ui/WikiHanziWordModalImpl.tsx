import { useHanziWikiEntry } from "@/client/hooks/useHanziWikiEntry";
import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { splitHanziText } from "@/data/hanzi";
import type { HanziWord } from "@/data/model";
import { hanziWordSkillKinds } from "@/data/model";
import { pinyinPronunciationDisplayText } from "@/data/pinyin";
import type { Skill, SkillRating, SkillState } from "@/data/rizzleSchema";
import {
  hanziWordSkill,
  skillKindFromSkill,
  skillKindToShorthand,
} from "@/data/skills";
import { hanziFromHanziWord, lookupHanzi } from "@/dictionary/dictionary";
import { Fragment, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { DevLozenge } from "./DevLozenge";
import { HanziWordRefText } from "./HanziWordRefText";
import { Hhhmark } from "./Hhhmark";
import { RectButton } from "./RectButton";
import { useRizzleQueryPaged } from "./ReplicacheContext";

export function WikiHanziWordModalImpl({
  hanziWord,
  onDismiss,
}: {
  hanziWord: HanziWord;
  onDismiss: () => void;
}) {
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);
  const hanzi = hanziFromHanziWord(hanziWord);
  const wikiEntry = useHanziWikiEntry(hanzi);

  const characters = useMemo(
    (): string[] => splitHanziText(hanziFromHanziWord(hanziWord)),
    [hanziWord],
  );

  const skills = useMemo(() => {
    return hanziWordSkillKinds.map((skillType) =>
      hanziWordSkill(skillType, hanziWord),
    );
  }, [hanziWord]);

  const otherMeaningsQuery = useLocalQuery({
    queryKey: [WikiHanziWordModalImpl.name, `otherMeanings`, hanziWord],
    queryFn: async () => {
      const res = await lookupHanzi(hanzi);
      return res.filter(([otherHanziWord]) => otherHanziWord !== hanziWord);
    },
  });

  const skillStatesQuery = useRizzleQueryPaged(
    [WikiHanziWordModalImpl.name, `skillStates`, hanziWord],
    async (r) => {
      const skillStates = await r.replicache.query(async (tx) => {
        const skillStates: [Skill, SkillState | null | undefined][] = [];
        for (const skill of skills) {
          const skillState = await r.query.skillState.get(tx, { skill });
          skillStates.push([skill, skillState]);
        }
        return skillStates;
      });

      return skillStates;
    },
  );

  const skillRatingsQuery = useRizzleQueryPaged(
    [WikiHanziWordModalImpl.name, `skillRatings`, hanziWord],
    async (r) => {
      const skillRatings: [
        Skill,
        [string, SkillRating][] | null | undefined,
      ][] = [];
      for (const skill of skills) {
        const ratings = await r.queryPaged.skillRating.bySkill(skill).toArray();
        skillRatings.push([skill, ratings]);
      }
      return new Map(skillRatings.map(([skill, ratings]) => [skill, ratings]));
    },
  );

  return hanziWordSkillData.data == null ? null : (
    <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 gap-4"
      >
        <View className="flex-row items-center gap-2">
          <View className="flex-row gap-1">
            {characters.map((character) => (
              <View key={character} className="items-start">
                <Text className="font-karla text-[60px] text-fg">
                  {character}
                </Text>
              </View>
            ))}
          </View>

          {hanziWordSkillData.data.pinyin == null ? null : (
            <Text className="font-karla text-2xl text-fg/50">
              {hanziWordSkillData.data.pinyin
                .map((x) => pinyinPronunciationDisplayText(x))
                .join(`, `)}
            </Text>
          )}
        </View>

        <View className="gap-1">
          <Text className="font-karla text-2xl text-fg">
            {hanziWordSkillData.data.gloss.join(`, `)}
            {otherMeaningsQuery.data == null ||
            otherMeaningsQuery.data.length === 0 ? null : (
              <Text className="hhh-body-caption">
                ; also
                {otherMeaningsQuery.data.map(([otherHanziWord], i) => (
                  <Fragment key={otherHanziWord}>
                    {i > 0 ? `; ` : ` `}
                    <HanziWordRefText
                      context="caption"
                      showHanzi={false}
                      hanziWord={otherHanziWord}
                    />
                  </Fragment>
                ))}
              </Text>
            )}
          </Text>
          <Hhhmark
            source={hanziWordSkillData.data.definition}
            context="caption"
          />
        </View>

        {wikiEntry.data?.components == null ? null : (
          <View className="gap-1">
            <Text className="font-karla text-xs uppercase text-caption">
              Interpretation
            </Text>
            <View className="gap-4 rounded-xl bg-bg-1 p-4">
              {wikiEntry.data.components.map((component, i) => {
                return (
                  <View key={i} className="gap-1">
                    <Text className="hhh-body">
                      {component.title ??
                        (component.hanziWord == null ? null : (
                          <HanziWordRefText
                            hanziWord={component.hanziWord}
                            context="body"
                          />
                        )) ??
                        `???`}
                    </Text>
                    {component.description == null ? null : (
                      <Hhhmark
                        source={component.description}
                        context="caption"
                      />
                    )}
                  </View>
                );
              })}

              {hanziWordSkillData.data.glossHint == null ? null : (
                <>
                  <View className="h-px w-full bg-bg-1" />
                  <Hhhmark
                    source={hanziWordSkillData.data.glossHint}
                    context="body"
                  />
                </>
              )}

              {wikiEntry.data.interpretation == null ? null : (
                <>
                  <View className="h-px w-full bg-bg-1" />
                  <Hhhmark
                    source={wikiEntry.data.interpretation}
                    context="body"
                  />
                </>
              )}
            </View>
          </View>
        )}

        {wikiEntry.data?.visuallySimilar == null ? null : (
          <View className="gap-1 font-karla">
            <Text className="text-xs uppercase text-fg/90">
              Visually Similar
            </Text>

            <View className="flex-row flex-wrap gap-2 text-fg">
              {wikiEntry.data.visuallySimilar.map((hanzi, i) => (
                <Text key={i}>{hanzi}</Text>
              ))}
            </View>
          </View>
        )}

        {!__DEV__ || skillStatesQuery.data == null ? null : (
          <View className="gap-1 font-karla">
            <Text className="text-xs uppercase text-fg/90">
              Skills <DevLozenge />
            </Text>
            <View className="gap-2 text-fg">
              {skillStatesQuery.data.map(([skill, skillState], i) => (
                <View key={i} className="flex-row items-center gap-2">
                  <Text className="hhh-body">
                    {skillKindToShorthand(skillKindFromSkill(skill))}
                  </Text>
                  <Text className="hhh-body">
                    <Text className="hhh-body-caption">Stability:</Text>
                    {` `}
                    {skillState?.srs.stability == null
                      ? `null`
                      : skillState.srs.stability.toFixed(2)}
                  </Text>
                  <Text className="hhh-body">
                    <Text className="hhh-body-caption">Difficulty:</Text>
                    {` `}
                    {skillState?.srs.difficulty == null
                      ? `null`
                      : skillState.srs.difficulty.toFixed(2)}
                  </Text>
                  {(() => {
                    const ratings = skillRatingsQuery.data?.get(skill);

                    return ratings == null || ratings.length === 0 ? null : (
                      <Text>({ratings.length} reviews)</Text>
                    );
                  })()}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View className="theme-accent border-t-2 border-bg-1 p-4 mb-safe">
        <RectButton variant="filled" onPress={onDismiss}>
          Close
        </RectButton>
      </View>
    </>
  );
}
