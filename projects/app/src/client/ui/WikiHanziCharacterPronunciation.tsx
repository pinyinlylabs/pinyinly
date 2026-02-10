import { useHanziPronunciationHint } from "@/client/hooks/useHanziPronunciationHint";
import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import { pinyinSoundsQuery } from "@/client/query";
import type { HanziText, PinyinUnit } from "@/data/model";
import { normalizePinyinUnitForHintKey, splitPinyinUnit } from "@/data/pinyin";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import {
  hanziPronunciationHintImageSetting,
  useHanziPronunciationHintOverrides,
} from "./HanziPronunciationHintProvider";
import { ThreeSplitLinesDown } from "./ThreeSplitLinesDown";
import { AssetImage } from "./AssetImage";
import { IconImage } from "./IconImage";
import { ImagePasteDropZone } from "./ImagePasteDropZone";
import { Pylymark } from "./Pylymark";
import { useUserSettingHistory } from "@/client/hooks/useUserSetting";

export function WikiHanziCharacterPronunciation({
  hanzi,
  pinyinUnit,
  gloss,
}: {
  gloss: string;
  hanzi: HanziText;
  pinyinUnit: PinyinUnit;
}) {
  const splitPinyin = splitPinyinUnit(pinyinUnit);
  const r = useReplicache();
  const { data: pinyinSounds } = useRizzleQueryPaged(pinyinSoundsQuery(r));

  const initialPinyinSound =
    splitPinyin == null ? null : pinyinSounds?.get(splitPinyin.initialSoundId);
  const finalPinyinSound =
    splitPinyin == null ? null : pinyinSounds?.get(splitPinyin.finalSoundId);
  const tonePinyinSound =
    splitPinyin == null ? null : pinyinSounds?.get(splitPinyin.toneSoundId);

  const { setHintOverrides } = useHanziPronunciationHint();
  const hintOverrides = useHanziPronunciationHintOverrides(hanzi, pinyinUnit);
  const hintImageHistory = useUserSettingHistory(
    hanziPronunciationHintImageSetting,
    {
      hanzi,
      pinyin: normalizePinyinUnitForHintKey(pinyinUnit),
    },
  );

  const [isEditingHint, setIsEditingHint] = useState(false);
  const [isEditingExplanation, setIsEditingExplanation] = useState(false);
  const [isHintHovered, setIsHintHovered] = useState(false);
  const [isExplanationHovered, setIsExplanationHovered] = useState(false);
  const [draftHint, setDraftHint] = useState(hintOverrides.hint ?? ``);
  const [draftExplanation, setDraftExplanation] = useState(
    hintOverrides.explanation ?? ``,
  );
  const skipHintBlurSaveRef = useRef(false);
  const skipExplanationBlurSaveRef = useRef(false);

  useEffect(() => {
    if (!isEditingHint) {
      setDraftHint(hintOverrides.hint ?? ``);
    }
  }, [hintOverrides.hint, isEditingHint]);

  useEffect(() => {
    if (!isEditingExplanation) {
      setDraftExplanation(hintOverrides.explanation ?? ``);
    }
  }, [hintOverrides.explanation, isEditingExplanation]);

  const handleSaveEdits = () => {
    const nextHint = draftHint.trim();
    const nextExplanation = draftExplanation.trim();
    setHintOverrides(hanzi, pinyinUnit, {
      hint: nextHint.length === 0 ? null : nextHint,
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
    const currentHint = hintOverrides.hint ?? ``;
    const isDirty = draftHint !== currentHint;
    const discard = () => {
      skipHintBlurSaveRef.current = true;
      setDraftHint(currentHint);
      setIsEditingHint(false);
    };

    if (isDirty) {
      confirmDiscardChanges(discard);
      return;
    }

    discard();
  };

  const cancelExplanationEdit = () => {
    const currentExplanation = hintOverrides.explanation ?? ``;
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

  const historyImageAssetIds: string[] = [];
  const seenHistoryImageAssetIds = new Set<string>();
  for (const entry of [...hintImageHistory.entries].reverse()) {
    const assetId = entry.value?.t;
    if (typeof assetId !== `string` || assetId.length === 0) {
      continue;
    }
    if (seenHistoryImageAssetIds.has(assetId)) {
      continue;
    }
    seenHistoryImageAssetIds.add(assetId);
    historyImageAssetIds.push(assetId);
  }

  const selectedHintImageId = hintOverrides.selectedHintImageId;
  const imageIdsToShow = Array.from(
    new Set(
      selectedHintImageId == null
        ? historyImageAssetIds
        : [selectedHintImageId, ...historyImageAssetIds],
    ),
  );

  const [hoveredHintImageId, setHoveredHintImageId] = useState<string | null>(
    null,
  );

  const handleSelectHintImage = (assetId: string) => {
    setHintOverrides(hanzi, pinyinUnit, { selectedHintImageId: assetId });
  };

  const handleAddCustomImage = (assetId: string) => {
    setHintOverrides(hanzi, pinyinUnit, { selectedHintImageId: assetId });
  };

  const handleUploadError = (error: string) => {
    console.error(`Upload error:`, error);
  };

  const previewHintImageId = hoveredHintImageId ?? selectedHintImageId ?? null;

  return (
    <View className="mt-4 gap-2">
      <View className="mx-4">
        <Text className="pyly-body-subheading">Remember the pronunciation</Text>
      </View>

      <View className="mx-4 rounded-lg bg-fg/5">
        <View className="gap-4 p-4">
          <Text className="pyly-body">
            <Text className="pyly-bold">{hanzi}</Text> is pronounced
            {` `}
            <Text className="pyly-bold">{pinyinUnit}</Text>.
          </Text>

          <Text className="pyly-body">
            Use a story about &ldquo;
            <Text className="pyly-bold">{gloss}</Text>
            &rdquo; to remember the initial, the final, and the tone of
            {` `}
            <Text className="pyly-bold">{pinyinUnit}</Text>.
          </Text>
        </View>

        {splitPinyin == null ? null : (
          <View className="gap-4 p-4">
            <View className="">
              <Text className="pyly-body text-center">
                <Text className="pyly-bold">{pinyinUnit}</Text>
              </Text>
              <View className="px-[15%] py-2">
                <ThreeSplitLinesDown className="h-[10px] w-full" />
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {splitPinyin.initialSoundId}
                  </Text>
                  {initialPinyinSound == null ? null : (
                    <ArrowToSoundName>
                      {initialPinyinSound.name}
                    </ArrowToSoundName>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {splitPinyin.finalSoundId}
                  </Text>
                  {finalPinyinSound == null ? null : (
                    <ArrowToSoundName>{finalPinyinSound.name}</ArrowToSoundName>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {splitPinyin.tone}
                    <Text className="align-super text-[10px]">
                      {ordinalSuffix(splitPinyin.tone)}
                    </Text>
                  </Text>
                  {tonePinyinSound == null ? null : (
                    <ArrowToSoundName>{tonePinyinSound.name}</ArrowToSoundName>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      <View className="mx-4 mt-3 gap-3 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3">
        <Text className="pyly-body-subheading">Your pronunciation hint</Text>

        <View className="gap-2">
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
                    hintOverrides.hint == null ||
                    hintOverrides.hint.length === 0
                      ? `pyly-body text-[14px] font-semibold text-fg-dim`
                      : `pyly-body text-[14px] font-semibold text-fg-loud`
                  }
                >
                  {hintOverrides.hint == null ||
                  hintOverrides.hint.length === 0 ? (
                    `Add a hint`
                  ) : (
                    <Pylymark source={hintOverrides.hint} />
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
                    hintOverrides.explanation == null ||
                    hintOverrides.explanation.length === 0
                      ? `pyly-body text-[14px] text-fg-dim`
                      : `pyly-body text-[14px] text-fg`
                  }
                >
                  {hintOverrides.explanation == null ||
                  hintOverrides.explanation.length === 0 ? (
                    `Add an explanation`
                  ) : (
                    <Pylymark source={hintOverrides.explanation} />
                  )}
                </Text>
              </View>
            </Pressable>
          )}
        </View>

        <View className="gap-2 pt-2">
          <Text className="pyly-body-subheading">Choose an image</Text>
          {previewHintImageId == null && imageIdsToShow.length === 0 ? (
            <HintImageEmptyState
              title="No images available"
              description="Upload a custom image to use here."
            />
          ) : (
            <View className="gap-3">
              {previewHintImageId == null ? (
                <HintImageEmptyState
                  title="Select an image"
                  description="Pick an image below or upload your own."
                />
              ) : (
                <HintImagePreview assetId={previewHintImageId} />
              )}

              {imageIdsToShow.length > 0 && (
                <View className="flex-row flex-wrap gap-2">
                  {imageIdsToShow.map((assetId) => {
                    const isSelected = assetId === selectedHintImageId;
                    const isHovered = assetId === hoveredHintImageId;
                    return (
                      <Pressable
                        key={assetId}
                        onPress={() => {
                          handleSelectHintImage(assetId);
                        }}
                        onHoverIn={() => {
                          setHoveredHintImageId(assetId);
                        }}
                        onHoverOut={() => {
                          setHoveredHintImageId(null);
                        }}
                      >
                        <HintImageTile
                          assetId={assetId}
                          isSelected={isSelected}
                          isHovered={isHovered}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          <View className="pt-2">
            <ImagePasteDropZone
              onUploadComplete={handleAddCustomImage}
              onUploadError={handleUploadError}
            />
          </View>
        </View>
      </View>
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
  isHovered,
}: {
  assetId: string;
  isSelected: boolean;
  isHovered: boolean;
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
            : isHovered
              ? `absolute inset-0 rounded-md border-2 border-cyan/40`
              : `absolute inset-0 rounded-md border border-fg/10`
        }
        pointerEvents="none"
      />
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

function ArrowToSoundName({ children }: { children: ReactNode }) {
  return (
    <>
      <DownArrow />
      <Text className="pyly-body pyly-ref text-center">{children}</Text>
    </>
  );
}

function DownArrow() {
  return <Text className="pyly-body h-6 text-fg/40">↓</Text>;
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) {
    return `th`;
  }
  switch (n % 10) {
    case 1: {
      return `st`;
    }
    case 2: {
      return `nd`;
    }
    case 3: {
      return `rd`;
    }
    default: {
      return `th`;
    }
  }
}
