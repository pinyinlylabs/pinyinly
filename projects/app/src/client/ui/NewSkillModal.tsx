import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import { SkillKind } from "@/data/model";
import type { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import { hanziWordFromSkill, skillKindFromSkill } from "@/data/skills";
import {
  hanziCharsFromHanziWord,
  hanziFromHanziWord,
} from "@/dictionary/dictionary";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { IconImage } from "./IconImage";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton2 } from "./RectButton2";
import { WikiHanziInterpretationPanel } from "./WikiHanziInterpretationPanel";

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
        switch (skillKindFromSkill(skill)) {
          case SkillKind.HanziWordToGloss: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToGlossSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillKind.HanziWordToPinyin: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToPinyinSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillKind.HanziWordToPinyinFinal: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToPinyinFinalSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillKind.HanziWordToPinyinInitial: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToPinyinInitialSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillKind.HanziWordToPinyinTone: {
            skill = skill as HanziWordSkill;
            return (
              <NewHanziWordToPinyinToneSkillContent
                skill={skill}
                dismiss={dismiss}
              />
            );
          }
          case SkillKind.Deprecated_EnglishToRadical:
          case SkillKind.Deprecated_PinyinToRadical:
          case SkillKind.Deprecated_RadicalToEnglish:
          case SkillKind.Deprecated_RadicalToPinyin:
          case SkillKind.Deprecated:
          case SkillKind.GlossToHanziWord:
          case SkillKind.ImageToHanziWord:
          case SkillKind.PinyinFinalAssociation:
          case SkillKind.PinyinInitialAssociation:
          case SkillKind.PinyinToHanziWord: {
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
  const hanzi = hanziFromHanziWord(hanziWord);
  const hanziChars = hanziCharsFromHanziWord(hanziWord);

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-foreground">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <IconImage
                className="text-accent-10"
                source={require(`@/assets/icons/plant-filled.svg`)}
              />
              <Text className="font-bold uppercase text-accent-10">
                New Word
              </Text>
            </View>

            <View className="items-center gap-2">
              <View className="flex-row gap-1">
                {hanziChars.map((character) => (
                  <View key={character} className="items-center">
                    <Text className="rounded-xl bg-primary-6 px-2 py-1 text-[60px] text-foreground">
                      {character}
                    </Text>
                  </View>
                ))}
              </View>

              <Text className="text-4xl font-bold text-primary-12">
                {hanziWordSkillData.data.gloss[0]}
              </Text>
            </View>

            <WikiHanziInterpretationPanel hanzi={hanzi} />
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
  const hanziChars = hanziCharsFromHanziWord(hanziWord);

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-foreground">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <IconImage
                className="text-accent-10"
                source={require(`@/assets/icons/plant-filled.svg`)}
              />
              <Text className="font-bold uppercase text-accent-10">
                New Pinyin
              </Text>
            </View>

            <View className="items-center gap-2">
              <View className="flex-row gap-1">
                {hanziChars.map((character) => (
                  <View key={character} className="items-center">
                    <Text className="rounded-xl bg-primary-6 px-2 py-1 text-[60px] text-foreground">
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
  const hanziChars = hanziCharsFromHanziWord(hanziWord);

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-foreground">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <IconImage
                className="text-accent-10"
                source={require(`@/assets/icons/plant-filled.svg`)}
              />
              <Text className="font-bold uppercase text-accent-10">
                New Pinyin Initial
              </Text>
            </View>

            <View className="items-center gap-2">
              <View className="flex-row gap-1">
                {hanziChars.map((character) => (
                  <View key={character} className="items-center">
                    <Text className="rounded-xl bg-primary-6 px-2 py-1 text-[60px] text-foreground">
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
    (): string[] => hanziCharsFromHanziWord(hanziWord),
    [hanziWord],
  );

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-foreground">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <IconImage
                className="text-accent-10"
                source={require(`@/assets/icons/plant-filled.svg`)}
              />
              <Text className="font-bold uppercase text-accent-10">
                New Pinyin Final
              </Text>
            </View>

            <View className="items-center gap-2">
              <View className="flex-row gap-1">
                {characters.map((character) => (
                  <View key={character} className="items-center">
                    <Text className="rounded-xl bg-primary-6 px-2 py-1 text-[60px] text-foreground">
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
    (): string[] => hanziCharsFromHanziWord(hanziWord),
    [hanziWord],
  );

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-foreground">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="success-theme flex-row items-center gap-2 self-center">
              <IconImage
                className="text-accent-10"
                source={require(`@/assets/icons/plant-filled.svg`)}
              />
              <Text className="font-bold uppercase text-accent-10">
                New Pinyin Tone
              </Text>
            </View>

            <View className="items-center gap-2">
              <View className="flex-row gap-1">
                {characters.map((character) => (
                  <View key={character} className="items-center">
                    <Text className="rounded-xl bg-primary-6 px-2 py-1 text-[60px] text-foreground">
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

      <View className="accent-theme2 border-t-2 border-primary-5 p-4 mb-safe">
        <RectButton2
          variant="filled"
          textClassName="py-1 px-2"
          onPress={onContinue}
        >
          Continue
        </RectButton2>
      </View>
    </>
  );
};
