import { useHanziWikiEntry } from "@/client/hooks/useHanziWikiEntry";
import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import { splitHanziText } from "@/data/hanzi";
import type { HanziWord } from "@/data/model";
import { hanziFromHanziWord } from "@/dictionary/dictionary";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { HanziWordRefText } from "./HanziWordRefText";
import { Hhhmark } from "./Hhhmark";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton2 } from "./RectButton2";

export const WikiHanziWordModal = ({
  hanziWord,
  onDismiss,
}: {
  hanziWord: HanziWord;
  onDismiss: () => void;
}) => {
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);
  const hanzi = hanziFromHanziWord(hanziWord);
  const wikiEntry = useHanziWikiEntry(hanzi);

  const characters = useMemo(
    (): string[] => splitHanziText(hanziFromHanziWord(hanziWord)),
    [hanziWord],
  );

  return (
    <PageSheetModal onDismiss={onDismiss}>
      {({ dismiss }) =>
        hanziWordSkillData.data == null ? null : (
          <>
            <ScrollView
              className="flex-1"
              contentContainerClassName="px-4 py-4"
            >
              <View className="gap-4">
                <View className="flex-row items-center gap-2">
                  <View className="flex-row gap-1">
                    {characters.map((character) => (
                      <View key={character} className="items-start">
                        <Text className="font-karla text-[60px] text-text">
                          {character}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {hanziWordSkillData.data.pinyin == null ? null : (
                    <Text className="font-karla text-2xl text-text/50">
                      {hanziWordSkillData.data.pinyin.join(`, `)}
                    </Text>
                  )}
                </View>

                <View className="gap-1">
                  <Text className="font-karla text-xl text-text">
                    {hanziWordSkillData.data.gloss.join(`, `)}
                  </Text>
                  <Hhhmark
                    source={hanziWordSkillData.data.definition}
                    context="caption"
                  />
                </View>

                {wikiEntry.data?.components == null ? null : (
                  <View className="gap-1">
                    <Text className="font-karla text-xs uppercase text-primary-10">
                      Interpretation
                    </Text>
                    <View className="gap-4 rounded-xl bg-primary-5 p-4">
                      {wikiEntry.data.components.map((component, i) => {
                        return (
                          <View key={i} className="flex-column gap-1">
                            <Text className="hhh-text-body">
                              {component.title ??
                                (component.hanziWord == null ? null : (
                                  <HanziWordRefText
                                    hanziWord={component.hanziWord}
                                    context="body"
                                  />
                                )) ??
                                `???`}
                            </Text>
                            <Text className="hhh-text-caption">
                              {component.description}
                            </Text>
                          </View>
                        );
                      })}

                      {hanziWordSkillData.data.glossHint == null ? null : (
                        <>
                          <View className="h-[1px] w-full bg-primary-8" />
                          <Hhhmark
                            source={hanziWordSkillData.data.glossHint}
                            context="body"
                          />
                        </>
                      )}

                      {wikiEntry.data.interpretation == null ? null : (
                        <>
                          <View className="h-[1px] w-full bg-primary-8" />
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
                    <Text className="text-xs uppercase text-primary-10">
                      Visually Similar
                    </Text>

                    <View className="flex-row flex-wrap gap-2 text-text">
                      {wikiEntry.data.visuallySimilar.map((hanzi, i) => (
                        <Text key={i}>{hanzi}</Text>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>

            <View className="border-t-2 border-primary-5 px-4 py-4 mb-safe">
              <RectButton2
                textClassName="px-2 py-1"
                variant="filled"
                accent
                onPress={dismiss}
              >
                Close
              </RectButton2>
            </View>
          </>
        )
      }
    </PageSheetModal>
  );
};

// eslint-disable-next-line import/no-default-export
export default WikiHanziWordModal;
