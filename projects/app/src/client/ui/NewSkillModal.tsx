import { useHanziWordMeaning } from "@/client/query";
import { HanziWordSkill, Skill, SkillType } from "@/data/model";
import { hanziFromHanziWord, splitCharacters } from "@/dictionary/dictionary";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton2 } from "./RectButton2";

export const NewSkillModal = ({ skill }: { skill: Skill }) => {
  const [isModalVisible, setIsModalVisible] = useState(true);

  return isModalVisible ? (
    <PageSheetModal
      disableBackgroundDismiss
      onDismiss={() => {
        setIsModalVisible(false);
      }}
    >
      {({ dismiss }) => {
        switch (skill.type) {
          case SkillType.HanziWordToEnglish: {
            return (
              <NewHanziToEnglishSkillContent skill={skill} dismiss={dismiss} />
            );
          }
          case SkillType.HanziWordToPinyinInitial:
          case SkillType.HanziWordToPinyinFinal:
          case SkillType.HanziWordToPinyinTone:
          case SkillType.EnglishToHanziWord:
          case SkillType.PinyinToHanziWord:
          case SkillType.ImageToHanziWord:
          case SkillType.PinyinInitialAssociation:
          case SkillType.PinyinFinalAssociation:
          case SkillType.Deprecated: {
            return (
              <ContainerWithContinueButton onContinue={dismiss}>
                <Text>Not implemented</Text>
              </ContainerWithContinueButton>
            );
          }
        }
      }}
    </PageSheetModal>
  ) : null;
};

const NewHanziToEnglishSkillContent = ({
  skill,
  dismiss,
}: {
  skill: HanziWordSkill;
  dismiss: () => void;
}) => {
  const hanziWord = skill.hanziWord;
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);

  const characters = useMemo(
    (): string[] => splitCharacters(hanziFromHanziWord(hanziWord)),
    [hanziWord],
  );

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
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
                <Text className="text-center font-karla text-lg text-primary-11">
                  {hanziWordSkillData.data.glossHint}
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </ContainerWithContinueButton>
  );
};

const ContainerWithContinueButton = ({
  children,
  onContinue,
}: {
  children: React.ReactNode;
  onContinue: () => void;
}) => {
  return (
    <>
      <ScrollView className="flex-1" contentContainerClassName="px-4 py-4">
        {children}
      </ScrollView>

      <View className="border-t-2 border-primary-5 px-4 py-4 mb-safe">
        <RectButton2
          variant="filled"
          accent
          textClassName="py-1 px-2"
          onPress={onContinue}
        >
          Continue
        </RectButton2>
      </View>
    </>
  );
};
