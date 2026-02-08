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
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { use, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { AddCustomHintModal } from "./AddCustomHintModal";
import { AllHintsModal } from "./AllHintsModal";
import { AssetImage } from "./AssetImage";
import {
  useCustomHints,
  useSelectedHint,
  useSelectedHintSelection,
} from "./HanziWordHintProvider";
import { IconImage } from "./IconImage";
import { ImageUploadButton } from "./ImageUploadButton";
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

  const selectedHintSelection = useSelectedHintSelection(hanziWord);
  const selectedPresetHint =
    selectedHintSelection?.kind === `preset`
      ? hintsToShow.find(
          (hint) => hint.hint === selectedHintSelection.selectedHintId,
        )
      : undefined;
  const selectedCustomHint =
    selectedHintSelection?.kind === `custom`
      ? customHints.find(
          (hint) => hint.customHintId === selectedHintSelection.selectedHintId,
        )
      : undefined;

  const selectedPresetImageId =
    selectedPresetHint == null
      ? undefined
      : (selectedHintSelection?.selectedHintImageId ??
        selectedPresetHint.imageAssetIds?.[0]);
  const selectedCustomImageId =
    selectedCustomHint == null
      ? undefined
      : resolvePrimaryImageId(
          selectedCustomHint.imageIds,
          selectedCustomHint.primaryImageId,
        );

  const presetImageAssetIds = selectedPresetHint?.imageAssetIds ?? [];
  const customImageIds = selectedCustomHint?.imageIds ?? [];
  const hasSelectedPresetHint = selectedPresetHint != null;
  const hasSelectedCustomHint = selectedCustomHint != null;

  const handleSelectPresetImage = (assetId: string) => {
    if (selectedPresetHint == null) {
      return;
    }
    const hintHanziWord = buildHanziWord(hanzi, selectedPresetHint.meaningKey);
    setHint(hintHanziWord, {
      kind: `preset`,
      hint: selectedPresetHint.hint,
      selectedHintImageId: assetId,
    });
  };

  const handleSelectCustomPrimaryImage = (assetId: string) => {
    if (selectedCustomHint == null) {
      return;
    }
    if (selectedCustomHint.imageIds == null) {
      return;
    }
    void updateCustomHint(
      selectedCustomHint.customHintId,
      hanziWord,
      selectedCustomHint.hint,
      selectedCustomHint.explanation,
      [...selectedCustomHint.imageIds],
      assetId,
    );
  };

  const handleAddCustomImage = (assetId: string) => {
    if (selectedCustomHint == null) {
      return;
    }
    const nextImageIds = [...(selectedCustomHint.imageIds ?? []), assetId];
    const nextPrimaryImageId = selectedCustomHint.primaryImageId ?? assetId;
    void updateCustomHint(
      selectedCustomHint.customHintId,
      hanziWord,
      selectedCustomHint.hint,
      selectedCustomHint.explanation,
      nextImageIds,
      nextPrimaryImageId,
    );
  };

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

  let imageSection: ReactNode;
  if (selectedHintSelection == null) {
    imageSection = (
      <HintImageEmptyState
        title="Select a hint to choose an image"
        description="Pick a hint above to see its images."
      />
    );
  } else if (hasSelectedPresetHint) {
    imageSection = (
      <View className="gap-3">
        {selectedPresetImageId == null ? (
          <HintImageEmptyState
            title="No images for this hint"
            description="Customize this hint to add your own image."
            action={
              <RectButton
                variant="outline"
                onPress={() => {
                  setEditingCustomHintId(null);
                  setIsModalOpen(true);
                }}
              >
                Customize hint
              </RectButton>
            }
          />
        ) : (
          <HintImagePreview assetId={selectedPresetImageId} />
        )}

        {presetImageAssetIds.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {presetImageAssetIds.map((assetId) => {
              const isSelected = assetId === selectedPresetImageId;
              return (
                <Pressable
                  key={assetId}
                  onPress={() => {
                    handleSelectPresetImage(assetId);
                  }}
                >
                  <HintImageTile assetId={assetId} isSelected={isSelected} />
                </Pressable>
              );
            })}
          </View>
        )}

        {presetImageAssetIds.length > 0 && (
          <RectButton
            variant="outline"
            onPress={() => {
              setEditingCustomHintId(null);
              setIsModalOpen(true);
            }}
          >
            Use your own image
          </RectButton>
        )}
      </View>
    );
  } else if (hasSelectedCustomHint) {
    imageSection = (
      <View className="gap-3">
        {selectedCustomImageId == null ? (
          <HintImageEmptyState
            title="No images for this hint"
            description="Upload a custom image to use here."
            action={
              <ImageUploadButton
                onUploadComplete={handleAddCustomImage}
                buttonText="Add image"
              />
            }
          />
        ) : (
          <HintImagePreview assetId={selectedCustomImageId} />
        )}

        {customImageIds.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {customImageIds.map((assetId) => {
              const isSelected = assetId === selectedCustomImageId;
              return (
                <Pressable
                  key={assetId}
                  onPress={() => {
                    handleSelectCustomPrimaryImage(assetId);
                  }}
                >
                  <HintImageTile assetId={assetId} isSelected={isSelected} />
                </Pressable>
              );
            })}
          </View>
        )}
        {customImageIds.length > 0 && (
          <ImageUploadButton
            onUploadComplete={handleAddCustomImage}
            buttonText="Add image"
          />
        )}
      </View>
    );
  } else {
    imageSection = (
      <HintImageEmptyState
        title="Select a hint to choose an image"
        description="Pick a hint above to see its images."
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-bg">
      {/* Header */}
      <View className="gap-3 bg-bg-high p-4">
        <View className="flex-row items-center gap-2">
          <Link href={`/wiki/${encodeURIComponent(hanzi)}`}>
            <Text className="text-[13px] font-medium text-fg-dim">{hanzi}</Text>
          </Link>
          <Text className="text-[13px] text-fg-dim">/</Text>
          <Text className="text-[13px] text-fg-dim">Edit</Text>
        </View>
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
                  imageIds={h.imageAssetIds}
                  isSelected={isSelected}
                  onPress={() => {
                    setHint(hintHanziWord, {
                      kind: `preset`,
                      hint: h.hint,
                      selectedHintImageId: h.imageAssetIds?.[0] ?? null,
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
                      selectedHintImageId: null,
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
          <Text className="text-fg">Create your own hint</Text>
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

        {/* Image selection section */}
        <View className="gap-1 pt-2">
          <Text className="pyly-body-subheading">Choose an image</Text>
          <Text className="text-[14px] text-fg-dim">
            Pick the image that should appear on the wiki page
          </Text>
        </View>

        {imageSection}
      </View>

      {/* Custom hint modal */}
      {isModalOpen && (
        <AddCustomHintModal
          onDismiss={() => {
            setIsModalOpen(false);
            setEditingCustomHintId(null);
          }}
          onSave={(hint, explanation, imageIds, primaryImageId) => {
            if (editingCustomHintId === null) {
              void addCustomHint(
                hanziWord,
                hint,
                explanation,
                imageIds,
                primaryImageId,
              );
            } else {
              void updateCustomHint(
                editingCustomHintId,
                hanziWord,
                hint,
                explanation,
                imageIds,
                primaryImageId,
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
          initialPrimaryImageId={
            editingCustomHintId === null
              ? undefined
              : customHints.find((h) => h.customHintId === editingCustomHintId)
                  ?.primaryImageId
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
            const presetHint = hintsToShow.find(
              (candidate) => candidate.hint === hint,
            );
            setHint(hintHanziWord, {
              kind: `preset`,
              hint,
              selectedHintImageId: presetHint?.imageAssetIds?.[0] ?? null,
            });
          }}
          onSelectCustomHint={(customHintId, hint) => {
            setHint(hanziWord, {
              kind: `custom`,
              hint,
              customHintId,
              selectedHintImageId: null,
            });
          }}
          onSelectCustomHintPrimaryImage={(customHintId, primaryImageId) => {
            const hint = customHints.find(
              (candidate) => candidate.customHintId === customHintId,
            );
            if (hint?.imageIds == null || hint.imageIds.length === 0) {
              return;
            }
            void updateCustomHint(
              customHintId,
              hanziWord,
              hint.hint,
              hint.explanation,
              [...hint.imageIds],
              primaryImageId,
            );
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
  imageIds,
  isSelected,
  onPress,
}: {
  hint: string;
  explanation: string | undefined;
  imageIds: readonly string[] | undefined;
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
        <HintThumbnailRow imageIds={imageIds} />
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
        <HintThumbnailRow imageIds={imageIds} />
      </View>
    </Pressable>
  );
}

function HintThumbnailRow({
  imageIds,
}: {
  imageIds: readonly string[] | undefined;
}) {
  if (imageIds == null || imageIds.length === 0) {
    return null;
  }

  return (
    <View className="mt-2 flex-row flex-wrap gap-2">
      {imageIds.slice(0, 3).map((assetId) => (
        <View key={assetId} className="relative">
          <View className="size-14 overflow-hidden rounded-md border border-fg/10">
            <AssetImage assetId={assetId} className="size-full" />
          </View>
        </View>
      ))}
    </View>
  );
}

function HintImagePreview({ assetId }: { assetId: string }) {
  return (
    <View className="h-[200px] w-full overflow-hidden rounded-lg border border-fg/10 bg-fg-bg5">
      <AssetImage assetId={assetId} className="size-full" />
    </View>
  );
}

function HintImageTile({
  assetId,
  isSelected,
  label,
}: {
  assetId: string;
  isSelected: boolean;
  label?: string;
}) {
  return (
    <View className="relative size-16">
      <View className="size-16 overflow-hidden rounded-md bg-fg-bg5">
        <AssetImage assetId={assetId} className="size-full" />
      </View>
      <View
        className={
          isSelected
            ? `absolute inset-0 rounded-md border-2 border-cyan`
            : `absolute inset-0 rounded-md border border-fg/10`
        }
        pointerEvents="none"
      />
      {label != null && (
        <View className="absolute left-1 top-1 rounded-full bg-cyan/90 px-1.5 py-0.5">
          <Text className="text-[9px] font-semibold text-bg">{label}</Text>
        </View>
      )}
    </View>
  );
}

function HintImageEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center gap-2 rounded-xl border-2 border-dashed border-fg/20 px-4 py-6">
      <IconImage size={32} icon="puzzle" className="text-fg-dim" />
      <Text className="text-center text-fg-dim">{title}</Text>
      {description == null ? null : (
        <Text className="text-center text-[13px] text-fg-dim">
          {description}
        </Text>
      )}
      {action}
    </View>
  );
}

function resolvePrimaryImageId(
  imageIds: readonly string[] | undefined,
  primaryImageId: string | undefined,
): string | undefined {
  if (imageIds == null || imageIds.length === 0) {
    return undefined;
  }
  if (primaryImageId != null && imageIds.includes(primaryImageId)) {
    return primaryImageId;
  }
  return imageIds[0];
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
