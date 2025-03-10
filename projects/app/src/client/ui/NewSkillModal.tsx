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
      <View className="rounded-lg bg-primary-3">
        {hanziWord == null || hanziWordSkillData.data == null ? (
          <Text className="text-text">Not implemented</Text>
        ) : (
          <>
            <View className="success-theme mx-2 flex-row items-center gap-2 self-center py-4">
              <Image
                source={require(`@/assets/icons/plant-filled.svg`)}
                className="h-[48px] w-[48px] flex-shrink text-accent-10"
                tintColor="currentColor"
              />
              <Text className="font-karla text-2xl font-bold uppercase tracking-tighter text-accent-10">
                New Word
              </Text>
            </View>
            <View className="flex-column mx-4 gap-1">
              <Text className="center text-center text-2xl text-text">
                {hanziFromHanziWord(hanziWord)}
                {` `}
                <Text className="text-lg text-primary-9">
                  {hanziWordSkillData.data.pinyin?.[0]?.split(` `).join(``)}
                  {` `}
                  {hanziWordSkillData.data.gloss[0]}
                </Text>
              </Text>
              <Text className="text-center text-text">
                {hanziWordSkillData.data.definition}
              </Text>
            </View>
          </>
        )}

        <View className="mx-4 my-4">
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
