import type {
  HanziCharacter,
  HanziWord,
  Skill,
  SrsStateType,
} from "@/data/model";
import { wikiPayloadQuery } from "@/client/query";
import { useQuery } from "@tanstack/react-query";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { PropsWithChildren } from "react";
import { Pressable } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "./View";
import { useDb } from "./hooks/useDb";
import { tv } from "tailwind-variants";
import { WikiExampleSentence } from "./WikiExampleSentence";
import { WikiHanziProgressLozenge } from "./WikiHanziProgressLozenge";
import { HskLozengeWithTooltip } from "./HskLozengeWithTooltip";

export function WikiHanziCharacterChooseAMeaning({
  hanzi,
  hanziWord: selectedMeaning,
  onHanziWordChanged,
  skillSrsStates,
}: {
  hanzi: HanziCharacter;
  hanziWord: HanziWord | null;
  onHanziWordChanged: (hanziWord: HanziWord) => void;
  skillSrsStates: ReadonlyMap<Skill, SrsStateType>;
}) {
  const db = useDb();

  const { data: dictionaryEntries } = useLiveQuery({
    query: (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .orderBy(({ entry }) => entry.order, `asc`)
        .select(({ entry }) => ({
          hanzi: entry.hanzi,
          hanziWord: entry.hanziWord,
          gloss: entry.gloss,
          pinyin: entry.pinyin,
          hsk: entry.hsk,
          hskFirstAppearance: entry.hskFirstAppearance,
        })),
  });
  const { data: wikiPayload } = useQuery(wikiPayloadQuery(hanzi));

  return (
    <View className="gap-2">
      <View>
        <Text className="flex-1 font-sans text-sm/normal font-bold uppercase">
          Choose a meaning
        </Text>
      </View>
      <View className="gap-3">
        {dictionaryEntries.map((entry) => {
          const exampleSentence = wikiPayload?.curriculumMeaningExamples?.find(
            ({ id }) => id === entry.hanziWord,
          )?.exampleSentence;

          return (
            <ToggleButton
              key={entry.hanziWord}
              pressed={selectedMeaning === entry.hanziWord}
              onPressedChanged={() => {
                onHanziWordChanged(entry.hanziWord);
              }}
              className="flex-col items-stretch gap-2 px-3 py-2"
            >
              <View className="gap-1">
                <Text className="font-sans text-xl/normal font-semibold">
                  {entry.pinyin?.[0]}
                </Text>
                <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: selectedMeaning === entry.hanziWord,
                    }}
                    aria-checked={selectedMeaning === entry.hanziWord}
                    className="min-w-0 shrink"
                    onPress={(event) => {
                      event.stopPropagation();
                      onHanziWordChanged(entry.hanziWord);
                    }}
                  >
                    <Text className="font-sans text-lg/normal font-normal">
                      {entry.gloss.join(`, `)}
                    </Text>
                  </Pressable>
                  {entry.hsk == null &&
                  entry.hskFirstAppearance == null ? null : (
                    <HskLozengeWithTooltip
                      entries={[
                        {
                          hsk: entry.hsk,
                          hskFirstAppearance: entry.hskFirstAppearance,
                        },
                      ]}
                      size="md"
                    />
                  )}
                  <WikiHanziProgressLozenge
                    hanziWord={entry.hanziWord}
                    skillSrsStates={skillSrsStates}
                    hasPinyin={entry.pinyin?.[0] != null}
                  />
                </View>
                {exampleSentence == null ? null : (
                  <WikiExampleSentence exampleSentence={exampleSentence} />
                )}
              </View>
            </ToggleButton>
          );
        })}
      </View>
    </View>
  );
}

export function ToggleButton({
  pressed,
  onPressedChanged,
  className,
  children,
}: PropsWithChildren<{
  pressed: boolean;
  onPressedChanged: (pressed: boolean) => void;
  className?: string;
}>) {
  return (
    <Pressable
      accessible={false}
      focusable={false}
      className={toggleButtonClass({ pressed, className })}
      onPress={() => {
        onPressedChanged(!pressed);
      }}
    >
      {children}
    </Pressable>
  );
}

const toggleButtonClass = tv({
  base: `
    rounded-lg bg-muted px-3 py-2

    hover:bg-muted-fg/20
  `,
  variants: {
    pressed: {
      true: `outline-2 outline-blue`,
      false: ``,
    },
  },
});
