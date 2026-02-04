import { useHanziWordHint } from "@/client/hooks/useHanziWordHint";
import { getWikiCharacterData } from "@/client/wiki";
import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziText, HanziWord } from "@/data/model";
import {
  buildHanziWord,
  glossOrThrow,
  hanziFromHanziWord,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import { use } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { IconImage } from "./IconImage";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";

interface WikiHanziHintEditorProps {
  hanziWord: HanziWord;
}

export function WikiHanziHintEditor({ hanziWord }: WikiHanziHintEditorProps) {
  const hanzi = hanziFromHanziWord(hanziWord);
  const meaningKey = meaningKeyFromHanziWord(hanziWord);

  const dictionary = use(loadDictionary());
  const meaning = dictionary.lookupHanziWord(hanziWord);

  // Load character data
  const characterData = use(loadWikiCharacterData(hanzi));

  const { getHint, setHint, clearHint } = useHanziWordHint();
  const selectedHint = getHint(hanziWord);

  // Get available hints for this meaning
  const availableHints =
    characterData?.mnemonic?.hints?.filter(
      (h) => h.meaningKey.toLowerCase() === meaningKey.toLowerCase(),
    ) ?? [];

  // If no hints match the meaningKey exactly, show all hints
  const hintsToShow =
    availableHints.length > 0
      ? availableHints
      : (characterData?.mnemonic?.hints ?? []);

  // Get components for the lozenge
  const components: { hanzi: string | undefined; label: string }[] = [];
  if (characterData?.mnemonic) {
    for (const visualComponent of walkIdsNodeLeafs(
      characterData.mnemonic.components,
    )) {
      const label =
        visualComponent.label ??
        (visualComponent.hanzi == null
          ? null
          : dictionary
              .lookupHanzi(visualComponent.hanzi)
              .map(([, m]) => m.gloss[0])
              .join(` / `));
      if (label != null && label !== ``) {
        components.push({
          hanzi: visualComponent.hanzi,
          label,
        });
      }
    }
  }

  const primaryGloss = glossOrThrow(hanziWord, meaning);
  const alternativeGlosses = meaning?.gloss.slice(1) ?? [];

  return (
    <ScrollView className="flex-1 bg-bg">
      {/* Header */}
      <View className="gap-3 bg-bg-high p-4">
        <View className="flex-row items-baseline gap-2.5">
          <Text className="text-[19px] font-semibold text-fg-loud">
            {hanzi}
          </Text>
          <Text className="text-[16px] font-medium text-fg-loud">
            {primaryGloss}
          </Text>
          {alternativeGlosses.map((gloss, index) => (
            <Text
              key={index}
              className="text-[16px] font-medium text-fg-dim"
            >
              {gloss}
            </Text>
          ))}
        </View>

        {/* Components lozenge */}
        {components.length > 0 && (
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="rounded-full bg-fg-bg15 px-2 py-0.5">
              <Text className="text-[13px] text-fg">Components</Text>
            </View>
            <Text className="text-[15px] text-fg-loud">
              {components
                .map((c) =>
                  c.hanzi == null
                    ? `(${c.label})`
                    : `${c.hanzi} (${c.label})`,
                )
                .join(`, `)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="gap-4 p-4">
        {/* Hints section */}
        <View className="gap-1">
          <Text className="pyly-body-subheading">Choose a hint</Text>
          <Text className="text-[14px] text-fg-dim">
            Pick a hint that works for your brain
          </Text>
        </View>

        {hintsToShow.length === 0 ? (
          <View className={`
            items-center gap-2 rounded-xl border-2 border-dashed border-fg/20 px-4 py-6
          `}>
            <IconImage
              size={32}
              source={require(`../../assets/icons/puzzle.svg`)}
              className="text-fg-dim"
            />
            <Text className="text-center text-fg-dim">
              No hints available for this character
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {hintsToShow.map((h, index) => {
              const isSelected = selectedHint === h.hint;
              const hintMeaningKey = h.meaningKey.toLowerCase();
              const hintHanziWord = buildHanziWord(hanzi, hintMeaningKey);
              return (
                <HintOption
                  key={index}
                  hint={h.hint}
                  explanation={h.explanation}
                  isSelected={isSelected}
                  onPress={() => {
                    setHint(hintHanziWord, h.hint);
                  }}
                />
              );
            })}
          </View>
        )}

        {/* Clear selection button */}
        {selectedHint != null && (
          <View className="mt-2">
            <RectButton
              variant="bare"
              onPress={() => {
                clearHint(hanziWord);
              }}
            >
              Clear selection
            </RectButton>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function HintOption({
  hint,
  explanation,
  isSelected,
  onPress,
}: {
  hint: string;
  explanation: string | undefined;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View className={hintOptionClass({ isSelected })}>
        <Text className="text-[14px] font-semibold text-fg-loud">
          <Pylymark source={hint} />
        </Text>
        {explanation != null && (
          <Text className="text-[14px] text-fg">
            <Pylymark source={explanation} />
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const hintOptionClass = tv({
  base: `gap-1 rounded-lg border-2 p-3`,
  variants: {
    isSelected: {
      true: `border-cyan bg-cyan/10`,
      false: `border-fg-bg10 bg-fg-bg5`,
    },
  },
});

// Loader for wiki character data
async function loadWikiCharacterData(hanzi: HanziText) {
  return (await getWikiCharacterData(hanzi)) ?? null;
}
