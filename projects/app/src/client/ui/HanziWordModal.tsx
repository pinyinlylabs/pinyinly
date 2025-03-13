import { useHanziWordMeaning } from "@/client/query";
import { HanziWord } from "@/data/model";
import { hanziFromHanziWord, splitCharacters } from "@/dictionary/dictionary";
import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton2 } from "./RectButton2";

export const HanziWordModal = ({
  hanziWord,
  onDismiss,
}: {
  hanziWord: HanziWord;
  onDismiss: () => void;
}) => {
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);

  const characters = useMemo(
    (): string[] => splitCharacters(hanziFromHanziWord(hanziWord)),
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
                <View className="items-center gap-2">
                  <View className="flex-row gap-1">
                    {characters.map((character) => (
                      <View key={character} className="items-center">
                        <Text className="rounded-xl bg-primary-6 px-2 py-1 text-[60px] text-text">
                          {character}
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text className="text-4xl font-bold text-primary-12">
                    {hanziWordSkillData.data.gloss[0]}
                  </Text>
                </View>

                {hanziWordSkillData.data.glossHint == null ? null : (
                  <View className="gap-1">
                    <Text className="text-xs uppercase text-primary-10">
                      Hint
                    </Text>
                    <Text className="text-md font-karla text-text">
                      {hanziWordSkillData.data.glossHint}
                    </Text>
                  </View>
                )}

                {hanziWordSkillData.data.pinyin == null ? null : (
                  <View className="gap-1">
                    <Text className="text-xs uppercase text-primary-10">
                      Pinyin
                    </Text>
                    <Text className="text-md font-karla text-text">
                      {hanziWordSkillData.data.pinyin.join(`, `)}
                    </Text>
                  </View>
                )}

                {hanziWordSkillData.data.gloss.length === 1 ? null : (
                  <View className="gap-1">
                    <Text className="text-xs uppercase text-primary-10">
                      Gloss
                    </Text>
                    <Text className="text-md font-karla text-text">
                      {hanziWordSkillData.data.gloss.join(`, `)}
                    </Text>
                  </View>
                )}

                <View className="gap-1">
                  <Text className="text-xs uppercase text-primary-10">
                    Definition
                  </Text>
                  <Text className="text-md font-karla text-text">
                    {hanziWordSkillData.data.definition}
                  </Text>
                </View>
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
