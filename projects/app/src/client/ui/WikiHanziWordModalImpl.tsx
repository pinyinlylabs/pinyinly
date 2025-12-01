import { useLookupHanziWord } from "@/client/hooks/useLookupHanziWord";
import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import {
  hanziWordOtherMeaningsQuery,
  hanziWordSkillRatingsQuery,
  hanziWordSkillStatesQuery,
} from "@/client/query";
import { splitHanziText } from "@/data/hanzi";
import type { HanziWord } from "@/data/model";
import { pinyinPronunciationDisplayText } from "@/data/pinyin";
import { skillKindFromSkill, skillKindToShorthand } from "@/data/skills";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";
import { ScrollView, Text, View } from "react-native";
import { DevLozenge } from "./DevLozenge";
import { HanziWordRefText } from "./HanziWordRefText";
import { RectButton } from "./RectButton";

export function WikiHanziWordModalImpl({
  hanziWord,
  onDismiss,
}: {
  hanziWord: HanziWord;
  onDismiss: () => void;
}) {
  const hanziWordMeaning = useLookupHanziWord(hanziWord);
  const otherMeaningsQuery = useQuery(hanziWordOtherMeaningsQuery(hanziWord));

  const graphemes = splitHanziText(hanziFromHanziWord(hanziWord));

  const r = useReplicache();
  const skillStatesQuery = useRizzleQueryPaged(
    hanziWordSkillStatesQuery(r, hanziWord),
  );
  const skillRatingsQuery = useRizzleQueryPaged(
    hanziWordSkillRatingsQuery(r, hanziWord),
  );

  return hanziWordMeaning == null ? null : (
    <>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-4 gap-4"
      >
        <View className="flex-row items-center gap-2">
          <View className="flex-row gap-1">
            {graphemes.map((grapheme) => (
              <View key={grapheme} className="items-start">
                <Text className="font-sans text-[60px] text-fg">
                  {grapheme}
                </Text>
              </View>
            ))}
          </View>

          {hanziWordMeaning.pinyin == null ? null : (
            <Text className="font-sans text-2xl text-fg/50">
              {hanziWordMeaning.pinyin
                .map((x) => pinyinPronunciationDisplayText(x))
                .join(`, `)}
            </Text>
          )}
        </View>

        <View className="gap-1">
          <Text className="font-sans text-2xl text-fg">
            {hanziWordMeaning.gloss.join(`, `)}
            {otherMeaningsQuery.data == null ||
            otherMeaningsQuery.data.length === 0 ? null : (
              <Text className="pyly-body-caption">
                ; also
                {otherMeaningsQuery.data.map(([otherHanziWord], i) => (
                  <Fragment key={otherHanziWord}>
                    {i > 0 ? `; ` : ` `}
                    <HanziWordRefText
                      showHanzi={false}
                      hanziWord={otherHanziWord}
                    />
                  </Fragment>
                ))}
              </Text>
            )}
          </Text>
        </View>

        {!__DEV__ || skillStatesQuery.data == null ? null : (
          <View className="gap-1 font-sans">
            <Text className="text-xs uppercase text-fg/90">
              Skills <DevLozenge />
            </Text>
            <View className="gap-2 text-fg">
              {skillStatesQuery.data.map(([skill, skillState], i) => (
                <View key={i} className="flex-row items-center gap-2">
                  <Text className="pyly-body">
                    {skillKindToShorthand(skillKindFromSkill(skill))}
                  </Text>
                  <Text className="pyly-body">
                    <Text className="pyly-body-caption">Stability:</Text>
                    {` `}
                    {skillState?.srs.stability == null
                      ? `null`
                      : skillState.srs.stability.toFixed(2)}
                  </Text>
                  <Text className="pyly-body">
                    <Text className="pyly-body-caption">Difficulty:</Text>
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

      <View className="theme-accent border-t-2 border-bg-loud p-4 mb-safe">
        <RectButton variant="filled" onPress={onDismiss}>
          Close
        </RectButton>
      </View>
    </>
  );
}
