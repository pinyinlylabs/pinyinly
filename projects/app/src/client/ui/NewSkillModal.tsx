import { Skill, SkillType } from "@/data/model";
import { hanziFromHanziWord, lookupHanziWord } from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { Text, View } from "react-native";
import { Modal } from "./Modal";
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

  return (
    <Modal
      visible={isModalVisible}
      onRequestClose={() => {
        setIsModalVisible(false);
      }}
    >
      <View className="max-h-[400px] w-[500px] flex-1 grow rounded-lg bg-primary-3 px-4 py-4">
        {hanziWord == null || hanziWordSkillData.data == null ? (
          <Text className="text-text">Not implemented</Text>
        ) : (
          <>
            <View className="success-theme flex-row items-center gap-2">
              <Image
                source={require(`@/assets/icons/plant-filled.svg`)}
                className="h-[48px] w-[48px] flex-shrink text-accent-10"
                tintColor="currentColor"
              />
              <Text className="font-karla text-2xl font-bold uppercase tracking-tighter text-accent-10">
                New Word
              </Text>
            </View>

            <View className="flex-column my-4 gap-4">
              <View className="flex-row items-center">
                <Text className="text-2xl text-text">
                  {hanziFromHanziWord(hanziWord)}
                  {` `}
                </Text>
                <Text className="text-lg font-bold text-text">
                  ({hanziWordSkillData.data.pinyin?.[0]?.split(` `).join(``)}
                  {`, `}
                  {hanziWordSkillData.data.gloss[0]})
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

        <View className="flex-1" />

        <View className="">
          <RectButton2
            variant="filled"
            accent
            textClassName="py-1 px-2"
            onPress={() => {
              setIsModalVisible(false);
            }}
          >
            Continue
          </RectButton2>
        </View>
      </View>
    </Modal>
  );
};
