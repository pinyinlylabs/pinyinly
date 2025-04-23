import { useHanziWordMeaning } from "@/client/hooks";
import { SkillType } from "@/data/model";
import { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import { hanziWordFromSkill, skillTypeFromSkill } from "@/data/skills";
import { hanziFromHanziWord, splitHanziText } from "@/dictionary/dictionary";
import { Image } from "expo-image";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { GlossHint } from "./GlossHint";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton2 } from "./RectButton2";

export const NewSkillModal = ({
  skill,
  passivePresentation,
}: {
  skill: Skill;
  passivePresentation?: boolean;
}) => {
  const [isModalVisible, setIsModalVisible] = useState(true);

  return isModalVisible ? (
    <PageSheetModal
      disableBackgroundDismiss
      onDismiss={() => {
        setIsModalVisible(false);
      }}
      passivePresentation={passivePresentation}
    >
      {({ dismiss }) => {
        switch (skillTypeFromSkill(skill)) {
          case SkillType.HanziWordToGloss: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToGlossSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillType.HanziWordToPinyin: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToPinyinSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillType.HanziWordToPinyinFinal: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToPinyinFinalSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillType.HanziWordToPinyinInitial: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToPinyinInitialSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillType.HanziWordToPinyinTone: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToPinyinToneSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillType.Deprecated_EnglishToRadical:
          case SkillType.Deprecated_PinyinToRadical:
          case SkillType.Deprecated_RadicalToEnglish:
          case SkillType.Deprecated_RadicalToPinyin:
          case SkillType.Deprecated:
          case SkillType.GlossToHanziWord:
          case SkillType.ImageToHanziWord:
          case SkillType.PinyinFinalAssociation:
          case SkillType.PinyinInitialAssociation:
          case SkillType.PinyinToHanziWord: {
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

const NewHanziWordToGlossSkillContent = ({
  skill,
  dismiss,
}: {
  skill: HanziWordSkill;
  dismiss: () => void;
}) => {
  const hanziWord = hanziWordFromSkill(skill);
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);

  const characters = useMemo(
    (): string[] => splitHanziText(hanziFromHanziWord(hanziWord)),
    [hanziWord],
  );

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-text">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
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
              <GlossHint
                glossHint={hanziWordSkillData.data.glossHint}
                headlineClassName="flex-column text-center font-karla text-2xl text-primary-11"
                explanationClassName="flex-column text-center font-karla text-lg leading-normal text-primary-10"
              />
            )}
          </View>
        </>
      )}
    </ContainerWithContinueButton>
  );
};

const NewHanziWordToPinyinSkillContent = ({
  skill,
  dismiss,
}: {
  skill: HanziWordSkill;
  dismiss: () => void;
}) => {
  const hanziWord = hanziWordFromSkill(skill);
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);

  const characters = useMemo(
    (): string[] => splitHanziText(hanziFromHanziWord(hanziWord)),
    [hanziWord],
  );

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-text">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <Image
                source={require(`@/assets/icons/plant-filled.svg`)}
                className="my-[-0px] h-[24px] w-[24px] flex-shrink text-accent-10"
                tintColor="currentColor"
              />
              <Text className="text-md font-bold uppercase text-accent-10">
                New Pinyin
              </Text>
            </View>

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
                {hanziWordSkillData.data.pinyin?.[0]}
              </Text>
            </View>
          </View>
        </>
      )}
    </ContainerWithContinueButton>
  );
};

const NewHanziWordToPinyinInitialSkillContent = ({
  skill,
  dismiss,
}: {
  skill: HanziWordSkill;
  dismiss: () => void;
}) => {
  const hanziWord = hanziWordFromSkill(skill);
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);

  const characters = useMemo(
    (): string[] => splitHanziText(hanziFromHanziWord(hanziWord)),
    [hanziWord],
  );

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-text">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <Image
                source={require(`@/assets/icons/plant-filled.svg`)}
                className="my-[-0px] h-[24px] w-[24px] flex-shrink text-accent-10"
                tintColor="currentColor"
              />
              <Text className="text-md font-bold uppercase text-accent-10">
                New Pinyin Initial
              </Text>
            </View>

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
                {hanziWordSkillData.data.pinyin?.[0]}
              </Text>
            </View>
          </View>
        </>
      )}
    </ContainerWithContinueButton>
  );
};

const NewHanziWordToPinyinFinalSkillContent = ({
  skill,
  dismiss,
}: {
  skill: HanziWordSkill;
  dismiss: () => void;
}) => {
  const hanziWord = hanziWordFromSkill(skill);
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);

  const characters = useMemo(
    (): string[] => splitHanziText(hanziFromHanziWord(hanziWord)),
    [hanziWord],
  );

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-text">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <Image
                source={require(`@/assets/icons/plant-filled.svg`)}
                className="my-[-0px] h-[24px] w-[24px] flex-shrink text-accent-10"
                tintColor="currentColor"
              />
              <Text className="text-md font-bold uppercase text-accent-10">
                New Pinyin Final
              </Text>
            </View>

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
                {hanziWordSkillData.data.pinyin?.[0]}
              </Text>
            </View>
          </View>
        </>
      )}
    </ContainerWithContinueButton>
  );
};

const NewHanziWordToPinyinToneSkillContent = ({
  skill,
  dismiss,
}: {
  skill: HanziWordSkill;
  dismiss: () => void;
}) => {
  const hanziWord = hanziWordFromSkill(skill);
  const hanziWordSkillData = useHanziWordMeaning(hanziWord);

  const characters = useMemo(
    (): string[] => splitHanziText(hanziFromHanziWord(hanziWord)),
    [hanziWord],
  );

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-text">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <Image
                source={require(`@/assets/icons/plant-filled.svg`)}
                className="my-[-0px] h-[24px] w-[24px] flex-shrink text-accent-10"
                tintColor="currentColor"
              />
              <Text className="text-md font-bold uppercase text-accent-10">
                New Pinyin Tone
              </Text>
            </View>

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
                {hanziWordSkillData.data.pinyin?.[0]}
              </Text>
            </View>
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
