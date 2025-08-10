/* eslint-disable react/display-name */
import { hanziWordMeaningQuery } from "@/client/query";
import { SkillKind } from "@/data/model";
import type { HanziWordSkill, Skill } from "@/data/rizzleSchema";
import { hanziWordFromSkill, skillKindFromSkill } from "@/data/skills";
import {
  hanziFromHanziWord,
  hanziGraphemesFromHanziWord,
} from "@/dictionary/dictionary";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { IconImage } from "./IconImage";
import type { PageSheetChild } from "./PageSheetModal";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { WikiHanziInterpretationPanel } from "./WikiHanziInterpretationPanel";

export const NewSkillModal = ({
  skill: anySkill,
  passivePresentation,
  devUiSnapshotMode,
}: {
  skill: Skill;
  passivePresentation?: boolean;
  devUiSnapshotMode?: boolean;
}) => {
  const [pageSheetChild, setPageSheetChild] = useState(
    (): PageSheetChild | null => {
      switch (skillKindFromSkill(anySkill)) {
        case SkillKind.HanziWordToGloss: {
          const skill = anySkill as HanziWordSkill;
          return ({ dismiss }) => (
            <NewHanziWordToGlossSkillContent skill={skill} dismiss={dismiss} />
          );
        }
        case SkillKind.HanziWordToPinyin: {
          const skill = anySkill as HanziWordSkill;
          return ({ dismiss }) => (
            <NewHanziWordToPinyinSkillContent skill={skill} dismiss={dismiss} />
          );
        }
        case SkillKind.HanziWordToPinyinInitial: {
          const skill = anySkill as HanziWordSkill;
          return ({ dismiss }) => (
            <NewHanziWordToPinyinInitialSkillContent
              skill={skill}
              dismiss={dismiss}
            />
          );
        }
        case SkillKind.HanziWordToPinyinTone:
        case SkillKind.HanziWordToPinyinFinal:
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
          return null;
        }
      }
    },
  );

  return pageSheetChild ? (
    <PageSheetModal
      disableBackgroundDismiss
      onDismiss={() => {
        setPageSheetChild(null);
      }}
      passivePresentation={passivePresentation}
      devUiSnapshotMode={devUiSnapshotMode}
    >
      {pageSheetChild}
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
  const hanziWordSkillData = useQuery(hanziWordMeaningQuery(hanziWord));
  const hanzi = hanziFromHanziWord(hanziWord);
  const hanziGraphemes = hanziGraphemesFromHanziWord(hanziWord);

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-fg">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="theme-success flex-row items-center gap-2 self-center">
              <IconImage source={require(`@/assets/icons/plant-filled.svg`)} />
              <Text className="font-bold uppercase text-fg">New Word</Text>
            </View>

            <View className="items-center gap-2">
              <View className="flex-row gap-1">
                {hanziGraphemes.map((grapheme) => (
                  <View key={grapheme} className="items-center">
                    <Text className="rounded-xl bg-bg-loud px-2 py-1 text-[60px] text-fg">
                      {grapheme}
                    </Text>
                  </View>
                ))}
              </View>

              <Text className="text-4xl font-bold text-fg">
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
  const hanziWordSkillData = useQuery(hanziWordMeaningQuery(hanziWord));
  const hanziGraphemes = hanziGraphemesFromHanziWord(hanziWord);

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-fg">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="theme-success flex-row items-center gap-2 self-center">
              <IconImage source={require(`@/assets/icons/plant-filled.svg`)} />
              <Text className="font-bold uppercase text-fg">New Pinyin</Text>
            </View>

            <View className="items-center gap-2">
              <View className="flex-row gap-1">
                {hanziGraphemes.map((grapheme) => (
                  <View key={grapheme} className="items-center">
                    <Text className="rounded-xl bg-bg-loud px-2 py-1 text-[60px] text-fg">
                      {grapheme}
                    </Text>
                  </View>
                ))}
              </View>

              <Text className="text-4xl font-bold text-fg">
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
  const hanziWordSkillData = useQuery(hanziWordMeaningQuery(hanziWord));
  const hanziGraphemes = hanziGraphemesFromHanziWord(hanziWord);

  return (
    <ContainerWithContinueButton onContinue={dismiss}>
      {hanziWordSkillData.data == null ? (
        <Text className="text-fg">Not implemented</Text>
      ) : (
        <>
          <View className="mb-8 gap-8">
            <View className="theme-success flex-row items-center gap-2 self-center">
              <IconImage source={require(`@/assets/icons/plant-filled.svg`)} />
              <Text className="font-bold uppercase text-fg">
                New Pinyin Initial
              </Text>
            </View>

            <View className="items-center gap-2">
              <View className="flex-row gap-1">
                {hanziGraphemes.map((grapheme) => (
                  <View key={grapheme} className="items-center">
                    <Text className="rounded-xl bg-bg-loud px-2 py-1 text-[60px] text-fg">
                      {grapheme}
                    </Text>
                  </View>
                ))}
              </View>

              <Text className="text-4xl font-bold text-fg">
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

      <View className="theme-accent border-t-2 border-bg-loud p-4 mb-safe">
        <RectButton
          variant="filled"
          textClassName="py-1 px-2"
          onPress={onContinue}
        >
          Continue
        </RectButton>
      </View>
    </>
  );
};
