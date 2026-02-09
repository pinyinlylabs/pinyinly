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
import { AddCustomHintModal } from "./AddCustomHintModal";
import { AllHintsModal } from "./AllHintsModal";
import { AssetImage } from "./AssetImage";
import { HanziHintOption } from "./HanziHintOption";
import { useHanziWordHintOverrides } from "./HanziWordHintProvider";
import { IconImage } from "./IconImage";
import { ImageUploadButton } from "./ImageUploadButton";
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

  const { setHintOverrides, clearHintOverrides } = useHanziWordHint();
  const hintOverrides = useHanziWordHintOverrides(hanziWord);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  // Limit visible hints to 3
  const VISIBLE_HINT_LIMIT = 3;
  const totalHintCount = hintsToShow.length;
  const hasMoreHints = totalHintCount > VISIBLE_HINT_LIMIT;
  const visiblePresetHints = hintsToShow.slice(0, VISIBLE_HINT_LIMIT);

  const selectedHint = hintOverrides.hint;
  const overrideMatchesPreset =
    selectedHint != null &&
    hintsToShow.some((hint) => hint.hint === selectedHint);
  const showOverrideCard = selectedHint != null && !overrideMatchesPreset;

  const presetImageAssetIds = Array.from(
    new Set(hintsToShow.flatMap((hint) => hint.imageAssetIds ?? [])),
  );

  const selectedHintImageId = hintOverrides.selectedHintImageId;
  const imageIdsToShow =
    selectedHintImageId != null &&
    !presetImageAssetIds.includes(selectedHintImageId)
      ? [selectedHintImageId, ...presetImageAssetIds]
      : presetImageAssetIds;

  const handleSelectHintImage = (assetId: string) => {
    setHintOverrides(hanziWord, { selectedHintImageId: assetId });
  };

  const handleAddCustomImage = (assetId: string) => {
    setHintOverrides(hanziWord, { selectedHintImageId: assetId });
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
  const fallbackHint = hintsToShow[0];
  const initialHint = hintOverrides.hint ?? fallbackHint?.hint ?? ``;
  const initialExplanation =
    hintOverrides.explanation ?? fallbackHint?.explanation ?? ``;

  let imageSection: ReactNode;
  if (selectedHintImageId == null && imageIdsToShow.length === 0) {
    imageSection = (
      <HintImageEmptyState
        title="No images available"
        description="Upload a custom image to use here."
        action={
          <ImageUploadButton
            onUploadComplete={handleAddCustomImage}
            buttonText="Add image"
          />
        }
      />
    );
  } else {
    imageSection = (
      <View className="gap-3">
        {selectedHintImageId == null ? (
          <HintImageEmptyState
            title="Select an image"
            description="Pick an image below or upload your own."
            action={
              <ImageUploadButton
                onUploadComplete={handleAddCustomImage}
                buttonText="Add image"
              />
            }
          />
        ) : (
          <HintImagePreview assetId={selectedHintImageId} />
        )}

        {imageIdsToShow.length > 0 && (
          <View className="flex-row flex-wrap gap-2">
            {imageIdsToShow.map((assetId) => {
              const isSelected = assetId === selectedHintImageId;
              const isCustomImage =
                isSelected && !presetImageAssetIds.includes(assetId);
              return (
                <Pressable
                  key={assetId}
                  onPress={() => {
                    handleSelectHintImage(assetId);
                  }}
                >
                  <HintImageTile
                    assetId={assetId}
                    isSelected={isSelected}
                    label={isCustomImage ? `You` : undefined}
                  />
                </Pressable>
              );
            })}
          </View>
        )}

        <ImageUploadButton
          onUploadComplete={handleAddCustomImage}
          buttonText="Add image"
        />
      </View>
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

        {hintsToShow.length === 0 && !showOverrideCard ? (
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
            {showOverrideCard && (
              <HanziHintOption
                hint={selectedHint ?? ``}
                explanation={hintOverrides.explanation}
                imageIds={
                  hintOverrides.selectedHintImageId == null
                    ? null
                    : [hintOverrides.selectedHintImageId]
                }
                isSelected
                isUser
                onPress={() => {
                  setIsModalOpen(true);
                }}
                onEdit={() => {
                  setIsModalOpen(true);
                }}
                onDelete={() => {
                  clearHintOverrides(hanziWord);
                }}
              />
            )}

            {/* Preset hints (limited) */}
            {visiblePresetHints.map((h, index) => {
              const isSelected = selectedHint === h.hint;
              const hintHanziWord = buildHanziWord(hanzi, h.meaningKey);
              return (
                <HanziHintOption
                  key={`preset-${index}`}
                  hint={h.hint}
                  explanation={h.explanation}
                  imageIds={h.imageAssetIds ?? null}
                  isSelected={isSelected}
                  onPress={() => {
                    setHintOverrides(hintHanziWord, {
                      hint: h.hint,
                      explanation: h.explanation ?? null,
                      selectedHintImageId: h.imageAssetIds?.[0] ?? null,
                    });
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
            setIsModalOpen(true);
          }}
        >
          <Text className="text-fg">Edit hint text</Text>
        </RectButton>

        {/* Clear selection button */}
        {hintOverrides.hasOverrides && (
          <View className="mt-2">
            <RectButton
              variant="bare"
              onPress={() => {
                clearHintOverrides(hanziWord);
              }}
            >
              Clear overrides
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

      {/* Hint override modal */}
      {isModalOpen && (
        <AddCustomHintModal
          onDismiss={() => {
            setIsModalOpen(false);
          }}
          onSave={(hint, explanation) => {
            setHintOverrides(hanziWord, {
              hint,
              explanation: explanation ?? null,
            });
            setIsModalOpen(false);
          }}
          initialHint={initialHint}
          initialExplanation={initialExplanation}
        />
      )}

      {/* All hints modal */}
      {showAllHintsModal && (
        <AllHintsModal
          hanzi={hanzi}
          onDismiss={() => {
            setShowAllHintsModal(false);
          }}
          presetHints={hintsToShow.map((hint) => ({
            hint: hint.hint,
            explanation: hint.explanation,
            imageIds: hint.imageAssetIds ?? null,
            meaningKey: hint.meaningKey,
          }))}
          selectedHint={selectedHint}
          onSelectPresetHint={(hintHanziWord, hint) => {
            const presetHint = hintsToShow.find(
              (candidate) => candidate.hint === hint,
            );
            setHintOverrides(hintHanziWord, {
              hint,
              explanation: presetHint?.explanation ?? null,
              selectedHintImageId: presetHint?.imageAssetIds?.[0] ?? null,
            });
          }}
        />
      )}
    </ScrollView>
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
