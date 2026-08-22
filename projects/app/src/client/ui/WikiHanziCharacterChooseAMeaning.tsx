import type { HanziCharacter, HanziWord } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import type { PropsWithChildren } from "react";
import { Pressable, Text, View } from "react-native";
import { useDb } from "./hooks/useDb";
import { tv } from "tailwind-variants";
import "@/global.css";

export function WikiHanziCharacterChooseAMeaning({
  hanzi,
}: {
  hanzi: HanziCharacter;
}) {
  const db = useDb();

  const { data: dictionaryEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionaryCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .orderBy(({ entry }) => entry.order, `asc`)
        .select(({ entry }) => ({
          hanzi: entry.hanzi,
          hanziWord: entry.hanziWord,
          gloss: entry.gloss,
          pinyin: entry.pinyin,
        })),
    [db.dictionaryCollection, hanzi],
  );

  const [selectedMeaning, setSelectedMeaning] = useState<HanziWord>();

  return (
    <View className="gap-2">
      <View>
        <Text className="flex-1 font-sans text-sm/normal font-semibold text-muted-fg uppercase">
          Choose a meaning
        </Text>
      </View>
      <View className="gap-3">
        {dictionaryEntries.map((entry) => (
          <ToggleButton
            key={entry.hanziWord}
            pressed={selectedMeaning === entry.hanziWord}
            onPressedChanged={() => {
              setSelectedMeaning(entry.hanziWord);
            }}
            className="flex-row items-center gap-2 rounded-lg bg-muted px-3 py-2"
          >
            <View className="gap-1">
              <Text className="font-sans text-xl/normal font-semibold text-fg">
                {entry.pinyin?.[0]}
              </Text>
              <Text className="font-sans text-lg/normal font-normal text-fg">
                {entry.gloss.join(`, `)}
              </Text>
            </View>
          </ToggleButton>
        ))}
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
  base: `rounded-lg bg-muted px-3 py-2`,
  variants: {
    pressed: {
      true: `outline-2 outline-blue`,
      false: `hover:outline-2 hover:outline-muted-fg/43`,
    },
  },
});
