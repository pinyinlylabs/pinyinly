import { useHanziWordHint } from "@/client/hooks/useHanziWordHint";
import { getWikiCharacterData } from "@/client/wiki";
import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziWord } from "@/data/model";
import {
  buildHanziWord,
  glossOrThrow,
  hanziFromHanziWord,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import { use, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { AddCustomHintModal } from "./AddCustomHintModal";
import { AllHintsModal } from "./AllHintsModal";
import { AssetImage } from "./AssetImage";
import { useCustomHints, useSelectedHint } from "./HanziWordHintProvider";
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
  const characterData = use(getWikiCharacterData(hanzi)) ?? null;

  const {
    setHint,
    clearHint,
    addCustomHint,
    updateCustomHint,
    removeCustomHint,
  } = useHanziWordHint();
  const selectedHint = useSelectedHint(hanziWord);
  const customHints = useCustomHints(hanziWord);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomHintId, setEditingCustomHintId] = useState<string | null>(
    null,
  );
  const [showAllHintsModal, setShowAllHintsModal] = useState(false);

  // Get available hints for this meaning
  const availableHints =
    characterData?.mnemonic?.hints?.filter(
      (h) => h.meaningKey === meaningKey,
    ) ?? [];

  // If no hints match the meaningKey exactly, show all hints
  const hintsToShow =
    availableHints.length > 0
      ? availableHints
      : (characterData?.mnemonic?.hints ?? []);

  // Limit visible hints to 3 (combined preset + custom)
  const VISIBLE_HINT_LIMIT = 3;
  const totalHintCount = hintsToShow.length + customHints.length;
  const hasMoreHints = totalHintCount > VISIBLE_HINT_LIMIT;

  // Calculate how many preset vs custom hints to show
  const visiblePresetCount = Math.min(hintsToShow.length, VISIBLE_HINT_LIMIT);
  const visibleCustomCount = Math.min(
    customHints.length,
    VISIBLE_HINT_LIMIT - visiblePresetCount,
  );
  const visiblePresetHints = hintsToShow.slice(0, visiblePresetCount);
  const visibleCustomHints = customHints.slice(0, visibleCustomCount);

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
            <Text key={index} className="text-[16px] font-medium text-fg-dim">
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
                  c.hanzi == null ? `(${c.label})` : `${c.hanzi} (${c.label})`,
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

        {hintsToShow.length === 0 && customHints.length === 0 ? (
          <View
            className={`items-center gap-2 rounded-xl border-2 border-dashed border-fg/20 px-4 py-6`}
          >
            <IconImage size={32} icon="puzzle" className="text-fg-dim" />
            <Text className="text-center text-fg-dim">
              No hints available for this character
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {/* Preset hints (limited) */}
            {visiblePresetHints.map((h, index) => {
              const isSelected = selectedHint === h.hint;
              const hintHanziWord = buildHanziWord(hanzi, h.meaningKey);
              return (
                <HintOption
                  key={`preset-${index}`}
                  hint={h.hint}
                  explanation={h.explanation}
                  isSelected={isSelected}
                  onPress={() => {
                    setHint(hintHanziWord, {
                      kind: `preset`,
                      hint: h.hint,
                    });
                  }}
                />
              );
            })}

            {/* Custom hints (limited) */}
            {visibleCustomHints.map((h) => {
              const isSelected = selectedHint === h.hint;
              return (
                <CustomHintOption
                  key={`custom-${h.customHintId}`}
                  hint={h.hint}
                  explanation={h.explanation}
                  imageIds={h.imageIds}
                  isSelected={isSelected}
                  onPress={() => {
                    setHint(hanziWord, {
                      kind: `custom`,
                      hint: h.hint,
                      customHintId: h.customHintId,
                    });
                  }}
                  onEdit={() => {
                    setEditingCustomHintId(h.customHintId);
                    setIsModalOpen(true);
                  }}
                  onDelete={() => {
                    // Clear selection if this hint was selected
                    if (selectedHint === h.hint) {
                      clearHint(hanziWord);
                    }
                    void removeCustomHint(h.customHintId, hanziWord);
                  }}
                />
              );
            })}

            {/* See more button */}
            {hasMoreHints && (
              <RectButton
                variant="bare"
                onPress={() => {
                  setShowAllHintsModal(true);
                }}
              >
                See all {totalHintCount} hints
              </RectButton>
            )}
          </View>
        )}

        {/* Create your own button */}
        <RectButton
          variant="outline"
          onPress={() => {
            setEditingCustomHintId(null);
            setIsModalOpen(true);
          }}
        >
          <Text>Create your own hint</Text>
        </RectButton>

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

      {/* Custom hint modal */}
      {isModalOpen && (
        <AddCustomHintModal
          onDismiss={() => {
            setIsModalOpen(false);
            setEditingCustomHintId(null);
          }}
          onSave={(hint, explanation, imageIds) => {
            if (editingCustomHintId === null) {
              void addCustomHint(hanziWord, hint, explanation, imageIds);
            } else {
              void updateCustomHint(
                editingCustomHintId,
                hanziWord,
                hint,
                explanation,
                imageIds,
              );
            }
            setIsModalOpen(false);
            setEditingCustomHintId(null);
          }}
          initialHint={
            editingCustomHintId === null
              ? undefined
              : customHints.find((h) => h.customHintId === editingCustomHintId)
                  ?.hint
          }
          initialExplanation={
            editingCustomHintId === null
              ? undefined
              : customHints.find((h) => h.customHintId === editingCustomHintId)
                  ?.explanation
          }
          initialImageIds={
            editingCustomHintId === null
              ? undefined
              : customHints.find((h) => h.customHintId === editingCustomHintId)
                  ?.imageIds
          }
        />
      )}

      {/* All hints modal */}
      {showAllHintsModal && (
        <AllHintsModal
          hanzi={hanzi}
          onDismiss={() => {
            setShowAllHintsModal(false);
          }}
          presetHints={hintsToShow}
          customHints={customHints}
          selectedHint={selectedHint}
          onSelectPresetHint={(hintHanziWord, hint) => {
            setHint(hintHanziWord, {
              kind: `preset`,
              hint,
            });
          }}
          onSelectCustomHint={(customHintId, hint) => {
            setHint(hanziWord, {
              kind: `custom`,
              hint,
              customHintId,
            });
          }}
          onEditCustomHint={(customHintId) => {
            setEditingCustomHintId(customHintId);
            setIsModalOpen(true);
          }}
          onDeleteCustomHint={(customHintId) => {
            // Clear selection if this hint was selected
            const hint = customHints.find(
              (h) => h.customHintId === customHintId,
            );
            if (selectedHint === hint?.hint) {
              clearHint(hanziWord);
            }
            void removeCustomHint(customHintId, hanziWord);
          }}
        />
      )}
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

function CustomHintOption({
  hint,
  explanation,
  imageIds,
  isSelected,
  onPress,
  onEdit,
  onDelete,
}: {
  hint: string;
  explanation: string | undefined;
  imageIds: readonly string[] | undefined;
  isSelected: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <View className={hintOptionClass({ isSelected })}>
        {/* Your hint badge */}
        <View className="mb-1 flex-row items-center gap-2">
          <View className="rounded-full bg-purple/20 px-2 py-0.5">
            <Text className="text-[11px] font-medium text-purple">
              Your hint
            </Text>
          </View>
          <View className="flex-1" />
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            hitSlop={8}
          >
            <IconImage size={16} icon="puzzle" className="text-fg-dim" />
          </Pressable>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            hitSlop={8}
          >
            <IconImage size={16} icon="close" className="text-fg-dim" />
          </Pressable>
        </View>
        <Text className="text-[14px] font-semibold text-fg-loud">
          <Pylymark source={hint} />
        </Text>
        {explanation != null && (
          <Text className="text-[14px] text-fg">
            <Pylymark source={explanation} />
          </Text>
        )}
        {imageIds != null && imageIds.length > 0 && (
          <View className="mt-2 flex-row flex-wrap gap-2">
            {imageIds.slice(0, 3).map((assetId) => (
              <View
                key={assetId}
                className="size-14 overflow-hidden rounded-md border border-fg/10"
              >
                <AssetImage assetId={assetId} className="size-full" />
              </View>
            ))}
          </View>
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
