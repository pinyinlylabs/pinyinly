import { Skill, SkillType } from "@/data/model";
import {
  hanziFromHanziWord,
  lookupHanziWord,
  splitCharacters,
} from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton2 } from "./RectButton2";

export const NewSkillModal = ({ skill }: { skill: Skill }) => {
  const hanziWord =
    skill.type === SkillType.HanziWordToEnglish ? skill.hanziWord : null;

  const [isModalVisible, setIsModalVisible] = useState(true);

  const hanziWordSkillData = useQuery({
    queryKey: [`NewSkillModal`, skill],
    queryFn: async () => {
      if (hanziWord != null) {
        return await lookupHanziWord(hanziWord);
      }

      return null;
    },
  });

  const pinyin = hanziWordSkillData.data?.pinyin?.[0];

  const charactersWithPinyin = useMemo((): [string, string][] | undefined => {
    if (hanziWord != null && pinyin != null) {
      const characters = splitCharacters(hanziFromHanziWord(hanziWord));
      const pinyins = pinyin.split(` `);
      if (characters.length !== pinyins.length) {
        console.error(`characters.length !== pinyins.length for ${hanziWord}`);
      }

      return characters.map((c, i) => [c, pinyins[i] ?? ``]);
    }
  }, [hanziWord, pinyin]);

  return isModalVisible ? (
    <PageSheetModal
      backdropColor="primary-3"
      disableBackgroundDismiss
      onDismiss={() => {
        setIsModalVisible(false);
      }}
    >
      {({ dismiss }) => (
        <>
          <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
            {hanziWord == null || hanziWordSkillData.data == null ? (
              <Text className="text-text">Not implemented</Text>
            ) : (
              <>
                <View className="success-theme flex-row items-center gap-2 self-center">
                  <Image
                    source={require(`@/assets/icons/plant-filled.svg`)}
                    className="my-[-0px] h-[24px] w-[24px] flex-shrink text-accent-10"
                    tintColor="currentColor"
                  />
                  <Text className="text-md font-bold uppercase text-accent-10">
                    New Word
                  </Text>
                </View>

                <View className="my-4 gap-4">
                  <View className="items-center gap-2">
                    <View className="flex-row gap-1">
                      {charactersWithPinyin?.map(([character, pinyin]) => (
                        <View key={character} className="items-center">
                          <Text className="text-[20px] text-primary-9">
                            {pinyin}
                          </Text>
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

                  <View className="gap-1">
                    <Text className="font-karla font-medium uppercase text-primary-9">
                      Definition
                    </Text>
                    <Text className="font-karla text-text">
                      {hanziWordSkillData.data.definition}
                    </Text>
                  </View>

                  {hanziWordSkillData.data.gloss.length === 1 ? null : (
                    <View className="gap-1">
                      <Text className="font-karla font-medium uppercase text-primary-9">
                        Synonyms
                      </Text>
                      <Text className="font-karla text-text">
                        {hanziWordSkillData.data.gloss.slice(1).join(`, `)}
                      </Text>
                    </View>
                  )}
                </View>
              </>
            )}
          </ScrollView>

          <View className="border-t-2 border-primary-5 px-4 py-4 mb-safe">
            <RectButton2
              variant="filled"
              accent
              textClassName="py-1 px-2"
              onPress={dismiss}
            >
              Continue
            </RectButton2>
          </View>
        </>
      )}
    </PageSheetModal>
  ) : null;
};
