import { useHanziWordHint } from "@/client/hooks/useHanziWordHint";
import { getWikiCharacterData } from "@/client/wiki";
import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziText, HanziWord } from "@/data/model";
import {
  buildHanziWord,
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

  // Get available hints (stories) for this meaning
  const availableHints =
    characterData?.mnemonic?.stories?.filter(
      (story) => story.gloss.toLowerCase() === meaningKey.toLowerCase(),
    ) ?? [];

  // If no hints match the meaningKey exactly, show all hints
  const hintsToShow =
    availableHints.length > 0
      ? availableHints
      : (characterData?.mnemonic?.stories ?? []);

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

  const primaryGloss = meaning?.gloss[0] ?? meaningKey;
  const alternativeGlosses = meaning?.gloss.slice(1) ?? [];

  return (
    <ScrollView className="flex-1 bg-bg">
      <View className="gap-6 p-4">
        {/* Header */}
        <View className="items-center gap-2">
          <Text className="text-6xl text-fg">{hanzi}</Text>
          <View className="items-center gap-1">
            <Text className="text-2xl font-bold text-fg">{primaryGloss}</Text>
            {alternativeGlosses.length > 0 && (
              <Text className="text-base text-fg-dim">
                {alternativeGlosses.join(`, `)}
              </Text>
            )}
          </View>
        </View>

        {/* Components lozenge */}
        {components.length > 0 && (
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            <View className="flex-row items-center gap-2 rounded-full bg-fg-bg10 px-3 py-1.5">
              <Text className="text-sm font-medium text-fg-dim">
                Components
              </Text>
              <Text className="text-sm text-fg">
                {components
                  .map((c) =>
                    c.hanzi == null
                      ? `(${c.label})`
                      : `${c.hanzi} (${c.label})`,
                  )
                  .join(`, `)}
              </Text>
            </View>
          </View>
        )}

        {/* Hints section */}
        <View className="gap-3">
          <Text className="pyly-body-subheading">Select a hint</Text>

          {hintsToShow.length === 0 ? (
            <View
              className={`
                items-center gap-2 rounded-xl border-2 border-dashed border-fg/20 px-4 py-6
              `}
            >
              <IconImage
                size={32}
                source={require(`@/assets/icons/puzzle.svg`)}
                className="text-fg-dim"
              />
              <Text className="text-center text-fg-dim">
                No hints available for this character
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {hintsToShow.map((hint, index) => {
                const isSelected = selectedHint === hint.story;
                const hintMeaningKey = hint.gloss.toLowerCase();
                return (
                  <HintOption
                    key={index}
                    gloss={hint.gloss}
                    story={hint.story}
                    isSelected={isSelected}
                    onPress={() => {
                      setHint(
                        buildHanziWord(hanzi, hintMeaningKey),
                        hint.story,
                      );
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

        {/* Current selection preview */}
        {selectedHint != null && (
          <View className="gap-2">
            <Text className="pyly-body-subheading">Current hint</Text>
            <View className="rounded-lg bg-fg-bg5 p-4">
              <Text className="pyly-body">
                <Pylymark source={selectedHint} />
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function HintOption({
  gloss,
  story,
  isSelected,
  onPress,
}: {
  gloss: string;
  story: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View className={hintOptionClass({ isSelected })}>
        <View className="flex-row items-center gap-2">
          <View
            className={`
              size-5 items-center justify-center rounded-full border-2

              ${isSelected ? `border-cyan bg-cyan` : `border-fg-bg25`}
            `}
          >
            {isSelected && (
              <IconImage
                size={12}
                source={require(`@/assets/icons/check.svg`)}
                className="text-bg"
              />
            )}
          </View>
          <Text className="pyly-bold">{gloss}</Text>
        </View>
        <View className="pl-7">
          <Text className="pyly-body">
            <Pylymark source={story} />
          </Text>
        </View>
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
function loadWikiCharacterData(hanzi: string) {
  return getWikiCharacterData(hanzi as HanziText) ?? Promise.resolve(null);
}
