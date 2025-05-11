import { useHanziWikiEntry } from "@/client/hooks/useHanziWikiEntry";
import { useHanziWordMeaning } from "@/client/hooks/useHanziWordMeaning";
import { splitHanziText } from "@/data/hanzi";
import type { HanziWord } from "@/data/model";
import { glossOrThrow, hanziFromHanziWord } from "@/dictionary/dictionary";
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { GlossHint } from "./GlossHint";
import { Hhhmark } from "./Hhhmark";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton2 } from "./RectButton2";
import type { PropsOf } from "./types";

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
                  <Text className="font-karla text-sm text-text/50">
                    <Hhhmark source={hanziWordSkillData.data.definition} />
                  </Text>
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
                            <Text className="font-karla text-text">
                              {component.title ??
                                (component.hanziWord == null ? null : (
                                  <HanziWordRefText
                                    hanziWord={component.hanziWord}
                                  />
                                )) ??
                                `???`}
                            </Text>
                            <Text className="font-karla text-sm text-text/50">
                              {component.description}
                            </Text>
                          </View>
                        );
                      })}

                      {hanziWordSkillData.data.glossHint == null ? null : (
                        <>
                          <View className="h-[1px] w-full bg-primary-8" />
                          <GlossHint
                            glossHint={hanziWordSkillData.data.glossHint}
                            headlineClassName="font-karla text-text"
                            explanationClassName="font-karla text-text opacity-80"
                          />
                        </>
                      )}
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

const RefText = (props: Omit<PropsOf<typeof Text>, `className`>) => (
  <Text
    className="underline decoration-text/50 decoration-dashed decoration-[1.5px] underline-offset-[6px]"
    {...props}
  />
);

export const HanziWordRefText = ({ hanziWord }: { hanziWord: HanziWord }) => {
  const meaning = useHanziWordMeaning(hanziWord);
  const [showWiki, setShowWiki] = useState(false);
  const gloss =
    meaning.data == null || meaning.data.gloss.length === 0
      ? null
      : glossOrThrow(hanziWord, meaning.data);

  return (
    <>
      <RefText
        onPress={() => {
          setShowWiki(true);
        }}
      >
        {`${hanziFromHanziWord(hanziWord)}${gloss == null ? `` : ` ${gloss}`}`}
      </RefText>
      {showWiki ? (
        <WikiHanziWordModal
          hanziWord={hanziWord}
          onDismiss={() => {
            setShowWiki(false);
          }}
        />
      ) : null}
    </>
  );
};
