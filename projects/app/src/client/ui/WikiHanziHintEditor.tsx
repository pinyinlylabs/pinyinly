import { useHanziWordHint } from "@/client/hooks/useHanziWordHint";
import { getWikiCharacterData } from "@/client/wiki";
import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziWord } from "@/data/model";
import {
  glossOrThrow,
  hanziFromHanziWord,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { use, useEffect, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { AllHintsModal } from "./AllHintsModal";
import { AssetImage } from "./AssetImage";
import { useHanziWordHintOverrides } from "./HanziWordHintProvider";
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

  const { setHintOverrides, clearHintOverrides } = useHanziWordHint();
  const hintOverrides = useHanziWordHintOverrides(hanziWord);

  const [showHintGalleryModal, setShowHintGalleryModal] = useState(false);

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

  const selectedHint = hintOverrides.hint;
  const currentPresetHint =
    selectedHint == null
      ? null
      : (hintsToShow.find((hint) => hint.hint === selectedHint) ?? null);
  const isCurrentHintCustom =
    selectedHint == null ? false : currentPresetHint == null;

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
  const currentHintText = selectedHint ?? fallbackHint?.hint ?? ``;
  let currentHintExplanation = currentPresetHint?.explanation;
  currentHintExplanation ??=
    selectedHint == null
      ? fallbackHint?.explanation
      : hintOverrides.explanation;
  let currentHintImageIds: readonly string[] | null = null;
  if (selectedHintImageId == null) {
    currentHintImageIds =
      currentPresetHint?.imageAssetIds ?? fallbackHint?.imageAssetIds ?? null;
  } else {
    currentHintImageIds = [selectedHintImageId];
  }
  const hasCurrentHint = currentHintText.length > 0;
  const canOpenGallery = hintsToShow.length > 0;

  const [isEditingHint, setIsEditingHint] = useState(false);
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [isHintHovered, setIsHintHovered] = useState(false);
  const [isExplanationHovered, setIsExplanationHovered] = useState(false);
  const [draftHint, setDraftHint] = useState(currentHintText);
  const [draftExplanation, setDraftExplanation] = useState(
    currentHintExplanation ?? ``,
  );
  const skipHintBlurSaveRef = useRef(false);
  const skipExplanationBlurSaveRef = useRef(false);

  useEffect(() => {
    if (!isEditingHint) {
      setDraftHint(currentHintText);
    }
  }, [currentHintText, isEditingHint]);

  useEffect(() => {
    if (!isEditingExplanation) {
      setDraftExplanation(currentHintExplanation ?? ``);
    }
  }, [currentHintExplanation, isEditingExplanation]);

  const handleSaveEdits = () => {
    const nextHint = draftHint.trim();
    const nextExplanation = draftExplanation.trim();
    setHintOverrides(hanziWord, {
      hint: nextHint,
      explanation: nextExplanation.length === 0 ? null : nextExplanation,
    });
  };

  const confirmDiscardChanges = (onDiscard: () => void) => {
    Alert.alert(
      `Discard changes?`,
      `You have unsaved edits that will be lost.`,
      [
        {
          text: `Keep editing`,
          style: `cancel`,
        },
        {
          text: `Discard`,
          style: `destructive`,
          onPress: onDiscard,
        },
      ],
    );
  };

  const cancelHintEdit = () => {
    const isDirty = draftHint !== currentHintText;
    const discard = () => {
      skipHintBlurSaveRef.current = true;
      setDraftHint(currentHintText);
      setIsEditingHint(false);
    };

    if (isDirty) {
      confirmDiscardChanges(discard);
      return;
    }

    discard();
  };

  const cancelExplanationEdit = () => {
    const currentExplanation = currentHintExplanation ?? ``;
    const isDirty = draftExplanation !== currentExplanation;
    const discard = () => {
      skipExplanationBlurSaveRef.current = true;
      setDraftExplanation(currentExplanation);
      setIsEditingExplanation(false);
    };

    if (isDirty) {
      confirmDiscardChanges(discard);
      return;
    }

    discard();
  };

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

        <View className="gap-3">
          <View className="gap-2">
            <Text className="text-[13px] font-medium text-fg-dim">
              Current hint
            </Text>
            <View className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3">
              {isCurrentHintCustom ? (
                <View className="flex-row items-center gap-2">
                  <View className="rounded-full bg-purple/20 px-2 py-0.5">
                    <Text className="text-[11px] font-medium text-purple">
                      Your hint
                    </Text>
                  </View>
                  <View className="flex-1" />
                  <Pressable
                    onPress={() => {
                      clearHintOverrides(hanziWord);
                    }}
                    hitSlop={8}
                  >
                    <IconImage size={16} icon="close" className="text-fg-dim" />
                  </Pressable>
                </View>
              ) : null}

              {isEditingHint ? (
                <TextInput
                  autoFocus
                  value={draftHint}
                  onChangeText={setDraftHint}
                  onBlur={() => {
                    if (skipHintBlurSaveRef.current) {
                      skipHintBlurSaveRef.current = false;
                      return;
                    }
                    setIsEditingHint(false);
                    handleSaveEdits();
                  }}
                  onKeyPress={(event) => {
                    if (event.nativeEvent.key === `Enter`) {
                      event.preventDefault();
                      skipHintBlurSaveRef.current = true;
                      setIsEditingHint(false);
                      handleSaveEdits();
                    }
                    if (event.nativeEvent.key === `Escape`) {
                      event.preventDefault();
                      cancelHintEdit();
                    }
                  }}
                  placeholder="Add a hint"
                  className={`
                    pyly-body-input rounded-lg bg-bg-high px-3 py-2 text-[14px] font-semibold
                    text-fg-loud
                  `}
                />
              ) : (
                <Pressable
                  onPress={() => {
                    setIsEditingHint(true);
                  }}
                  onHoverIn={() => {
                    setIsHintHovered(true);
                  }}
                  onHoverOut={() => {
                    setIsHintHovered(false);
                  }}
                >
                  <View
                    className={
                      isHintHovered
                        ? `rounded-md bg-fg-bg10 px-2 py-1`
                        : `px-2 py-1`
                    }
                  >
                    <Text
                      className={
                        currentHintText.length > 0
                          ? `pyly-body text-[14px] font-semibold text-fg-loud`
                          : `pyly-body text-[14px] font-semibold text-fg-dim`
                      }
                    >
                      {currentHintText.length > 0 ? (
                        <Pylymark source={currentHintText} />
                      ) : (
                        `Add a hint`
                      )}
                    </Text>
                  </View>
                </Pressable>
              )}

              {isEditingExplanation ? (
                <TextInput
                  autoFocus
                  multiline
                  value={draftExplanation}
                  onChangeText={setDraftExplanation}
                  onBlur={() => {
                    if (skipExplanationBlurSaveRef.current) {
                      skipExplanationBlurSaveRef.current = false;
                      return;
                    }
                    setIsEditingExplanation(false);
                    handleSaveEdits();
                  }}
                  onKeyPress={(event) => {
                    const isShiftPressed =
                      (event.nativeEvent as { shiftKey?: boolean }).shiftKey ===
                      true;
                    if (
                      event.nativeEvent.key === `Enter` &&
                      isShiftPressed === false
                    ) {
                      event.preventDefault();
                      skipExplanationBlurSaveRef.current = true;
                      setIsEditingExplanation(false);
                      handleSaveEdits();
                    }
                    if (event.nativeEvent.key === `Escape`) {
                      event.preventDefault();
                      cancelExplanationEdit();
                    }
                  }}
                  placeholder="Add an explanation"
                  className="rounded-lg bg-bg-high px-3 py-2 text-[14px] text-fg"
                />
              ) : (
                <Pressable
                  onPress={() => {
                    setIsEditingExplanation(true);
                  }}
                  onHoverIn={() => {
                    setIsExplanationHovered(true);
                  }}
                  onHoverOut={() => {
                    setIsExplanationHovered(false);
                  }}
                >
                  <View
                    className={
                      isExplanationHovered
                        ? `rounded-md bg-fg-bg10 px-2 py-1`
                        : `px-2 py-1`
                    }
                  >
                    <Text
                      className={
                        currentHintExplanation == null ||
                        currentHintExplanation.length === 0
                          ? `pyly-body text-[14px] text-fg-dim`
                          : `pyly-body text-[14px] text-fg`
                      }
                    >
                      {currentHintExplanation == null ||
                      currentHintExplanation.length === 0 ? (
                        `Add an explanation`
                      ) : (
                        <Pylymark source={currentHintExplanation} />
                      )}
                    </Text>
                  </View>
                </Pressable>
              )}

              {currentHintImageIds != null && currentHintImageIds.length > 0 ? (
                <View className="mt-2">
                  <CurrentHintImageRow imageIds={currentHintImageIds} />
                </View>
              ) : null}
            </View>
          </View>

          <RectButton
            variant="outline"
            onPress={() => {
              setShowHintGalleryModal(true);
            }}
            disabled={!canOpenGallery}
          >
            <Text className="text-fg">Hint gallery</Text>
          </RectButton>
          {canOpenGallery ? null : (
            <Text className="text-[13px] text-fg-dim">
              No system hints available for this character
            </Text>
          )}
        </View>

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

      {/* All hints modal */}
      {showHintGalleryModal && (
        <AllHintsModal
          hanzi={hanzi}
          onDismiss={() => {
            setShowHintGalleryModal(false);
          }}
          presetHints={hintsToShow.map((hint) => ({
            hint: hint.hint,
            explanation: hint.explanation,
            imageIds: hint.imageAssetIds ?? null,
            meaningKey: hint.meaningKey,
          }))}
          currentHint={
            hasCurrentHint
              ? {
                  hint: currentHintText,
                  explanation: currentHintExplanation,
                  imageIds: currentHintImageIds,
                }
              : null
          }
          onSavePresetHint={(hintHanziWord, presetHint) => {
            setHintOverrides(hintHanziWord, {
              hint: presetHint.hint,
              explanation: presetHint.explanation ?? null,
              selectedHintImageId: presetHint.imageIds?.[0] ?? null,
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

function CurrentHintImageRow({ imageIds }: { imageIds: readonly string[] }) {
  return (
    <View className="flex-row flex-wrap gap-2">
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
