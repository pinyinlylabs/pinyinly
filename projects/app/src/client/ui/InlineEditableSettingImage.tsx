import { trpc } from "@/client/trpc";
import type {
  UserSettingEntityInput,
  UserSettingEntityOutput,
  UserSettingImageEntity,
  UserSettingKeyInput,
} from "@/client/ui/hooks/useUserSetting";
import {
  useUserSetting,
  useUserSettingHistory,
} from "@/client/ui/hooks/useUserSetting";
import type { AssetId } from "@/data/model";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import type {
  LayoutChangeEvent,
  PanResponderInstance,
  ViewStyle,
} from "react-native";
import {
  ActivityIndicator,
  PanResponder,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { AiImageGenerationPanel } from "./AiImageGenerationPanel";
import { FramedAssetImage } from "./ImageFrame";
import { ImagePasteDropZone } from "./ImagePasteDropZone";
import { RectButton } from "./RectButton";
import type {
  ImageCrop,
  ImageCropRect,
  ImageFrameConstraintInput,
} from "./imageCrop";
import {
  createCenteredCropRect,
  imageCropValueFromCrop,
  parseImageCrop,
  resolveFrameAspectRatio,
} from "./imageCrop";
import { clamp, getMinCropSizePx } from "./imageCropCalc";
import { useAssetImageMeta } from "./useAssetImageMeta";

interface InlineEditableSettingImageProps<T extends UserSettingImageEntity> {
  setting: T;
  settingKey: UserSettingKeyInput<T>;
  presetImageIds?: readonly AssetId[];
  includeHistory?: boolean;
  previewHeight?: number;
  tileSize?: number;
  enablePasteDropZone?: boolean;
  enableAiGeneration?: boolean;
  initialAiPrompt?: string;
  frameConstraint?: ImageFrameConstraintInput | null;
  onUploadError?: (error: string) => void;
  onSaveAiPrompt?: (prompt: string) => void;
  className?: string;
}

interface InlineImageRepositionResult {
  crop: ImageCrop;
  imageWidth: number;
  imageHeight: number;
}

export function InlineEditableSettingImage<T extends UserSettingImageEntity>({
  setting,
  settingKey,
  presetImageIds = [],
  includeHistory = true,
  previewHeight = 200,
  tileSize = 64,
  enablePasteDropZone = false,
  enableAiGeneration = false,
  initialAiPrompt = ``,
  frameConstraint,
  onUploadError,
  onSaveAiPrompt,
  className,
}: InlineEditableSettingImageProps<T>) {
  const { value, setValue } = useUserSetting(setting, settingKey);
  const history = useUserSettingHistory(setting, settingKey);
  const imageId = value?.imageId ?? null;
  const imageCrop = parseImageCrop(value?.imageCrop);
  const imageWidthRaw = value?.imageWidth as unknown;
  const imageHeightRaw = value?.imageHeight as unknown;
  const imageWidth = typeof imageWidthRaw === `number` ? imageWidthRaw : null;
  const imageHeight =
    typeof imageHeightRaw === `number` ? imageHeightRaw : null;
  const [hoveredHintImageId, setHoveredHintImageId] = useState<AssetId | null>(
    null,
  );
  const [inlineEditorAssetId, setInlineEditorAssetId] =
    useState<AssetId | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<`upload` | `generate`>(`upload`);
  const frameAspectRatio = resolveFrameAspectRatio(frameConstraint);
  const isPointerHoverCapable = usePointerHoverCapability();
  const isInlineRepositioning = inlineEditorAssetId != null;

  const historyImageAssetIds: AssetId[] = [];
  const imageMetaById = new Map<AssetId, ImageMeta>();
  if (imageId != null) {
    imageMetaById.set(imageId as AssetId, {
      imageId,
      crop: imageCrop,
      imageWidth,
      imageHeight,
    });
  }
  if (includeHistory) {
    const seenIds = new Set<string>();
    for (const entry of history.entries) {
      const assetId = entry.value?.imageId;

      if (typeof assetId !== `string` || assetId.length === 0) {
        continue;
      }
      if (seenIds.has(assetId)) {
        continue;
      }
      seenIds.add(assetId as AssetId);
      historyImageAssetIds.push(assetId as AssetId);
      const meta = buildImageMeta(entry.value);
      if (meta != null && !imageMetaById.has(meta.imageId as AssetId)) {
        imageMetaById.set(meta.imageId as AssetId, meta);
      }
    }
  }
  const imageIdsToShow = Array.from(
    new Set([
      ...historyImageAssetIds,
      ...presetImageIds,
      ...(imageId == null ? [] : [imageId]),
    ] as AssetId[]),
  );

  const handleSelectHintImage = (assetId: AssetId) => {
    const meta = imageMetaById.get(assetId);
    setValue({
      imageId: assetId,
      imageCrop: imageCropValueFromCrop(meta?.crop),
      imageWidth: meta?.imageWidth ?? undefined,
      imageHeight: meta?.imageHeight ?? undefined,
    } as UserSettingEntityInput<T>);
    setIsPickerOpen(false);
  };

  const handleAddCustomImage = (assetId: AssetId) => {
    setValue({ imageId: assetId } as UserSettingEntityInput<T>);
    if (frameAspectRatio != null) {
      setInlineEditorAssetId(assetId);
    }
    setIsPickerOpen(false);
  };

  const previewHintImageId =
    hoveredHintImageId ?? (imageId as AssetId | null) ?? null;
  const previewMeta =
    previewHintImageId == null
      ? null
      : (imageMetaById.get(previewHintImageId) ?? null);
  const inlineEditorMeta =
    inlineEditorAssetId == null
      ? null
      : (imageMetaById.get(inlineEditorAssetId) ?? null);
  const canEditCrop = frameAspectRatio != null && imageId != null;
  const shouldShowPreviewButtons = !isInlineRepositioning;
  const shouldShowPickerPanel = isPickerOpen;
  const handleRemoveBackgroundApply = (next: RemoveBackgroundApplyInput) => {
    setValue({
      imageId: next.imageId,
      imageCrop: imageCropValueFromCrop(next.imageCrop ?? null),
      imageWidth: next.imageWidth ?? undefined,
      imageHeight: next.imageHeight ?? undefined,
    } as UserSettingEntityInput<T>);
  };
  const inlineEditor =
    inlineEditorAssetId == null ? null : (
      <InlineImageRepositionEditor
        assetId={inlineEditorAssetId}
        frameAspectRatio={frameAspectRatio}
        initialCrop={inlineEditorMeta?.crop ?? null}
        initialImageWidth={inlineEditorMeta?.imageWidth ?? null}
        initialImageHeight={inlineEditorMeta?.imageHeight ?? null}
        height={previewHeight}
        onCancel={() => {
          setInlineEditorAssetId(null);
        }}
        onSave={(result: InlineImageRepositionResult) => {
          setValue({
            imageId: inlineEditorAssetId,
            imageCrop: imageCropValueFromCrop(result.crop),
            imageWidth: result.imageWidth,
            imageHeight: result.imageHeight,
          } as UserSettingEntityInput<T>);
          setInlineEditorAssetId(null);
        }}
      />
    );

  return (
    <View className={className}>
      <View className="gap-2">
        {imageId == null ? (
          <View className="group relative">
            {isInlineRepositioning ? (
              inlineEditor
            ) : (
              <HintImagePreview
                assetId={previewHintImageId}
                imageMeta={previewMeta}
                height={previewHeight}
                aspectRatio={frameAspectRatio}
              />
            )}
            {shouldShowPreviewButtons ? (
              <View
                className={
                  isPointerHoverCapable
                    ? `
                      pointer-events-none absolute inset-x-3 bottom-3 flex-row items-center
                      justify-end gap-2 opacity-0

                      group-hover:pointer-events-auto group-hover:opacity-100
                    `
                    : `absolute inset-x-3 bottom-3 flex-row items-center justify-end gap-2`
                }
              >
                <RectButton
                  variant="bare"
                  onPress={() => {
                    setIsPickerOpen((current) => !current);
                  }}
                >
                  Change
                </RectButton>
                {canEditCrop ? (
                  <RectButton
                    variant="bare"
                    onPress={() => {
                      if (imageId == null) {
                        return;
                      }
                      setInlineEditorAssetId(imageId as AssetId);
                    }}
                  >
                    Reposition
                  </RectButton>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : (
          <RemoveBackgroundControls
            assetId={imageId as AssetId}
            imageCrop={imageCrop}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            frameAspectRatio={frameAspectRatio}
            onApply={handleRemoveBackgroundApply}
          >
            {({ canRemove, isRemoving, error, removeBackground }) => (
              <>
                <View className="group relative">
                  {isInlineRepositioning ? (
                    inlineEditor
                  ) : (
                    <HintImagePreview
                      assetId={previewHintImageId}
                      imageMeta={previewMeta}
                      height={previewHeight}
                      aspectRatio={frameAspectRatio}
                    />
                  )}
                  {shouldShowPreviewButtons ? (
                    <View
                      className={
                        isPointerHoverCapable
                          ? `
                            pointer-events-none absolute inset-x-3 bottom-3 flex-row items-center
                            justify-end gap-2 opacity-0

                            group-hover:pointer-events-auto group-hover:opacity-100
                          `
                          : `absolute inset-x-3 bottom-3 flex-row items-center justify-end gap-2`
                      }
                    >
                      <RectButton
                        variant="bare"
                        onPress={() => {
                          setIsPickerOpen((current) => !current);
                        }}
                      >
                        Change
                      </RectButton>
                      {canEditCrop ? (
                        <RectButton
                          variant="bare"
                          onPress={() => {
                            if (imageId == null) {
                              return;
                            }
                            setInlineEditorAssetId(imageId as AssetId);
                          }}
                        >
                          Reposition
                        </RectButton>
                      ) : null}
                      <RectButton
                        variant="bare"
                        onPress={() => {
                          void removeBackground();
                        }}
                        disabled={!canRemove || isRemoving}
                      >
                        Remove Background
                      </RectButton>
                    </View>
                  ) : null}
                </View>
                {shouldShowPreviewButtons &&
                !isInlineRepositioning &&
                (error != null || isRemoving) ? (
                  isRemoving ? (
                    <View className="flex-row items-center gap-2">
                      <ActivityIndicator size="small" className="text-fg" />
                      <Text className="text-[12px] text-fg-dim">
                        Removing background...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-[12px] text-red">
                      Background removal failed: {error}
                    </Text>
                  )
                ) : null}
              </>
            )}
          </RemoveBackgroundControls>
        )}

        {shouldShowPickerPanel ? (
          <View className="gap-3 rounded-lg border border-fg/10 bg-fg/5 p-3">
            {enableAiGeneration ? (
              <>
                <View className="flex-row gap-2 border-b border-fg/10 pb-2">
                  <RectButton
                    variant={activeTab === `upload` ? `filled` : `outline`}
                    onPress={() => {
                      setActiveTab(`upload`);
                    }}
                    className="flex-1"
                  >
                    Upload
                  </RectButton>
                  <RectButton
                    variant={activeTab === `generate` ? `filled` : `outline`}
                    onPress={() => {
                      setActiveTab(`generate`);
                    }}
                    className="flex-1"
                  >
                    Generate
                  </RectButton>
                </View>

                {activeTab === `upload` ? (
                  <View className="gap-3">
                    {imageIdsToShow.length > 0 ? (
                      <View className="flex-row flex-wrap gap-2">
                        {imageIdsToShow.map((assetId) => {
                          const isSelected = assetId === imageId;
                          const isHovered = assetId === hoveredHintImageId;
                          const meta = imageMetaById.get(assetId) ?? null;
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
                                imageMeta={meta}
                                isSelected={isSelected}
                                isHovered={isHovered}
                                size={tileSize}
                              />
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                    {enablePasteDropZone ? (
                      <ImagePasteDropZone
                        onUploadComplete={handleAddCustomImage}
                        onUploadError={onUploadError}
                      />
                    ) : null}
                  </View>
                ) : (
                  <View>
                    <AiImageGenerationPanel
                      initialPrompt={initialAiPrompt}
                      onImageGenerated={(assetId) => {
                        handleAddCustomImage(assetId);
                      }}
                      onError={onUploadError}
                      onSavePrompt={onSaveAiPrompt}
                    />
                  </View>
                )}
              </>
            ) : (
              <>
                {imageIdsToShow.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {imageIdsToShow.map((assetId) => {
                      const isSelected = assetId === imageId;
                      const isHovered = assetId === hoveredHintImageId;
                      const meta = imageMetaById.get(assetId) ?? null;
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
                            imageMeta={meta}
                            isSelected={isSelected}
                            isHovered={isHovered}
                            size={tileSize}
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                {enablePasteDropZone ? (
                  <ImagePasteDropZone
                    onUploadComplete={handleAddCustomImage}
                    onUploadError={onUploadError}
                  />
                ) : null}
              </>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

interface RemoveBackgroundApplyInput {
  imageId: AssetId;
  imageCrop: ImageCrop | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
}

interface RemoveBackgroundControlsRenderProps {
  canRemove: boolean;
  isRemoving: boolean;
  error: string | null;
  removeBackground: () => Promise<void>;
}

interface RemoveBackgroundControlsProps {
  assetId: AssetId;
  imageCrop: ImageCrop;
  imageWidth: number | null;
  imageHeight: number | null;
  frameAspectRatio: number | null;
  onApply: (next: RemoveBackgroundApplyInput) => void;
  children: (controls: RemoveBackgroundControlsRenderProps) => ReactElement;
}

function RemoveBackgroundControls({
  assetId,
  imageCrop,
  imageWidth,
  imageHeight,
  frameAspectRatio,
  onApply,
  children,
}: RemoveBackgroundControlsProps): ReactElement {
  const imageMeta = useAssetImageMeta(assetId, imageWidth, imageHeight);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const [removeBackgroundError, setRemoveBackgroundError] = useState<
    string | null
  >(null);
  const removeBackgroundMutation = trpc.ai.removeBackground.useMutation();

  useEffect(() => {
    setRemoveBackgroundError(null);
  }, [assetId]);

  const handleRemoveBackground = async () => {
    if (isRemovingBackground) {
      return;
    }

    setIsRemovingBackground(true);
    setRemoveBackgroundError(null);

    try {
      const result = await removeBackgroundMutation.mutateAsync({ assetId });
      if (result.assetId == null) {
        return;
      }

      const cropRect = imageCrop.kind === `rect` ? imageCrop.rect : null;
      const nextSize =
        imageMeta.imageSize ??
        (imageWidth != null && imageHeight != null
          ? { width: imageWidth, height: imageHeight }
          : null);
      const shouldKeepCrop =
        cropRect != null &&
        isRectAspectRatioCompatible(cropRect, frameAspectRatio);
      const nextCrop: ImageCrop | null =
        shouldKeepCrop || nextSize == null
          ? cropRect == null
            ? null
            : { kind: `rect`, rect: cropRect }
          : {
              kind: `rect`,
              rect: createCenteredCropRect(
                nextSize.width,
                nextSize.height,
                frameAspectRatio,
              ),
            };

      onApply({
        imageId: result.assetId,
        imageCrop: nextCrop,
        imageWidth: nextSize?.width ?? null,
        imageHeight: nextSize?.height ?? null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : `Failed to remove background`;
      setRemoveBackgroundError(errorMessage);
      console.error(`Background removal error:`, error);
    } finally {
      setIsRemovingBackground(false);
    }
  };

  return children({
    canRemove: imageMeta.status === `ready` && !isRemovingBackground,
    isRemoving: isRemovingBackground,
    error: removeBackgroundError,
    removeBackground: handleRemoveBackground,
  });
}

function HintImagePreview({
  assetId,
  imageMeta,
  height,
  aspectRatio,
}: {
  assetId: AssetId | null;
  imageMeta: ImageMeta | null;
  height: number;
  aspectRatio: number | null;
}) {
  if (assetId == null) {
    return (
      <View
        className={`w-full items-center justify-center bg-fg-bg5`}
        style={aspectRatio == null ? { height } : { aspectRatio }}
      >
        <Text className="text-xs text-fg-dim">No image selected</Text>
      </View>
    );
  }

  return (
    <View
      className="w-full overflow-hidden bg-fg-bg5"
      style={aspectRatio == null ? { height } : { aspectRatio }}
    >
      <FramedAssetImage
        assetId={assetId}
        crop={imageMeta?.crop}
        imageWidth={imageMeta?.imageWidth ?? null}
        imageHeight={imageMeta?.imageHeight ?? null}
        className="size-full"
      />
    </View>
  );
}

function InlineImageRepositionEditor({
  assetId,
  frameAspectRatio,
  initialCrop,
  initialImageWidth,
  initialImageHeight,
  height,
  onCancel,
  onSave,
}: {
  assetId: AssetId;
  frameAspectRatio: number | null;
  initialCrop: ImageCrop | null;
  initialImageWidth: number | null;
  initialImageHeight: number | null;
  height: number;
  onCancel: () => void;
  onSave: (result: InlineImageRepositionResult) => void;
}) {
  const imageMeta = useAssetImageMeta(
    assetId,
    initialImageWidth,
    initialImageHeight,
  );
  const [cropRect, setCropRect] = useState<ImageCropRect | null>(null);
  const [initialRect, setInitialRect] = useState<ImageCropRect | null>(null);
  const initialAssetIdRef = useRef<AssetId | null>(null);
  const defaultCropRect =
    imageMeta.imageSize == null
      ? null
      : (() => {
          const parsed = parseImageCrop(initialCrop ?? null);
          return parsed.kind === `rect`
            ? parsed.rect
            : createCenteredCropRect(
                imageMeta.imageSize.width,
                imageMeta.imageSize.height,
                frameAspectRatio,
              );
        })();
  const effectiveCropRect = cropRect ?? defaultCropRect;

  useEffect(() => {
    if (defaultCropRect == null) {
      return;
    }

    if (initialAssetIdRef.current !== assetId) {
      initialAssetIdRef.current = assetId;
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setCropRect(null);
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setInitialRect(defaultCropRect);
      return;
    }

    if (initialRect == null) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect
      setInitialRect(defaultCropRect);
    }
  }, [assetId, defaultCropRect, initialRect]);

  const imageSize = imageMeta.imageSize;
  const canSave =
    imageSize != null &&
    effectiveCropRect != null &&
    imageMeta.status === `ready`;

  const containerStyle =
    frameAspectRatio == null ? { height } : { aspectRatio: frameAspectRatio };

  if (!canSave || imageSize == null || effectiveCropRect == null) {
    return (
      <View
        className={`w-full items-center justify-center`}
        style={containerStyle}
      >
        <ActivityIndicator size="small" className="text-fg" />
        <Text className="mt-2 text-[12px] text-fg-dim">
          {imageMeta.status === `error`
            ? `Failed to load image`
            : `Loading image`}
        </Text>
      </View>
    );
  }

  return (
    <InlineImageRepositionFrame
      assetId={assetId}
      cropRect={effectiveCropRect}
      imageSize={imageSize}
      frameAspectRatio={frameAspectRatio}
      containerStyle={containerStyle}
      onCancel={onCancel}
      onSave={(nextRect) => {
        onSave({
          crop: { kind: `rect`, rect: nextRect },
          imageWidth: imageSize.width,
          imageHeight: imageSize.height,
        });
      }}
      onCropRectChange={setCropRect}
    />
  );
}

function InlineImageRepositionFrame({
  assetId,
  cropRect,
  imageSize,
  frameAspectRatio,
  containerStyle,
  onCancel,
  onSave,
  onCropRectChange,
}: {
  assetId: AssetId;
  cropRect: ImageCropRect;
  imageSize: { width: number; height: number };
  frameAspectRatio: number | null;
  containerStyle: { height?: number; aspectRatio?: number };
  onCancel: () => void;
  onSave: (nextRect: ImageCropRect) => void;
  onCropRectChange: (rect: ImageCropRect) => void;
}) {
  const [frameSize, setFrameSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const cropRectRef = useRef<ImageCropRect>(cropRect);
  const imageSizeRef = useRef(imageSize);
  const frameSizeRef = useRef(frameSize);
  const onCropRectChangeRef = useRef(onCropRectChange);
  const startRectRef = useRef<ImageCropRect | null>(null);

  useEffect(() => {
    cropRectRef.current = cropRect;
    imageSizeRef.current = imageSize;
    frameSizeRef.current = frameSize;
    onCropRectChangeRef.current = onCropRectChange;
  }, [cropRect, frameSize, imageSize, onCropRectChange]);

  const [moveResponder, setMoveResponder] =
    useState<PanResponderInstance | null>(null);

  useEffect(() => {
    if (moveResponder != null) {
      return;
    }

    const nextMoveResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startRectRef.current = cropRectRef.current;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderMove: (_event, gestureState) => {
        const startRect = startRectRef.current;
        const currentFrameSize = frameSizeRef.current;
        const currentImageSize = imageSizeRef.current;
        if (startRect == null || currentFrameSize == null) {
          return;
        }

        const scale = getImageScale(
          currentFrameSize,
          startRect,
          currentImageSize,
        );
        if (scale <= 0) {
          return;
        }

        const dxNormalized =
          -gestureState.dx / (currentImageSize.width * scale) || 0;
        const dyNormalized =
          -gestureState.dy / (currentImageSize.height * scale) || 0;
        const nextRect = clampCropPosition({
          x: startRect.x + dxNormalized,
          y: startRect.y + dyNormalized,
          width: startRect.width,
          height: startRect.height,
        });
        onCropRectChangeRef.current(nextRect);
      },
      onPanResponderRelease: () => {
        startRectRef.current = null;
      },
      onPanResponderTerminate: () => {
        startRectRef.current = null;
      },
    });

    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setMoveResponder(nextMoveResponder);
  }, [moveResponder]);

  return (
    <View
      className="relative w-full overflow-hidden"
      style={containerStyle}
      onLayout={(event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        if (width <= 0 || height <= 0) {
          return;
        }
        setFrameSize({ width, height });
      }}
    >
      <FramedAssetImage
        assetId={assetId}
        crop={{ kind: `rect`, rect: cropRect }}
        imageWidth={imageSize.width}
        imageHeight={imageSize.height}
        className="size-full"
      />
      <View
        className="absolute inset-0"
        style={
          Platform.OS === `web`
            ? ({ touchAction: `none` } as ViewStyle)
            : undefined
        }
        {...(moveResponder?.panHandlers ?? {})}
      />
      <View className="pointer-events-none absolute inset-0 items-center justify-center">
        <View className="rounded-md bg-bg/70 px-3 py-1">
          <Text className="text-[12px] text-fg">Drag image to reposition</Text>
        </View>
      </View>
      <View className="absolute inset-x-3 bottom-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <RectButton
            variant="outline"
            onPress={() => {
              const nextRect = getZoomedRect(
                cropRect,
                imageSize,
                frameAspectRatio,
                1.1,
              );
              onCropRectChange(nextRect);
            }}
          >
            -
          </RectButton>
          <RectButton
            variant="outline"
            onPress={() => {
              const nextRect = getZoomedRect(
                cropRect,
                imageSize,
                frameAspectRatio,
                0.9,
              );
              onCropRectChange(nextRect);
            }}
          >
            +
          </RectButton>
        </View>
        <View className="flex-row items-center gap-2">
          <RectButton variant="outline" onPress={onCancel}>
            Cancel
          </RectButton>
          <RectButton
            variant="filled"
            onPress={() => {
              onSave(cropRect);
            }}
          >
            Save position
          </RectButton>
        </View>
      </View>
    </View>
  );
}

function HintImageTile({
  assetId,
  imageMeta,
  isSelected,
  isHovered,
  size,
}: {
  assetId: AssetId;
  imageMeta: ImageMeta | null;
  isSelected: boolean;
  isHovered: boolean;
  size: number;
}) {
  const tileMeta = useAssetImageMeta(
    assetId,
    imageMeta?.imageWidth ?? null,
    imageMeta?.imageHeight ?? null,
  );
  const resolvedImageWidth =
    imageMeta?.imageWidth ?? tileMeta.imageSize?.width ?? null;
  const resolvedImageHeight =
    imageMeta?.imageHeight ?? tileMeta.imageSize?.height ?? null;

  return (
    <View className="relative" style={{ height: size, width: size }}>
      <View
        className="overflow-hidden rounded-md bg-fg-bg5"
        style={{ height: size, width: size }}
      >
        <FramedAssetImage
          assetId={assetId}
          crop={imageMeta?.crop}
          imageWidth={resolvedImageWidth}
          imageHeight={resolvedImageHeight}
          className="size-full"
        />
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

function clampCropPosition(rect: ImageCropRect): ImageCropRect {
  const width = clamp(rect.width, 0, 1);
  const height = clamp(rect.height, 0, 1);
  const maxX = Math.max(0, 1 - width);
  const maxY = Math.max(0, 1 - height);
  const x = clamp(rect.x, 0, maxX);
  const y = clamp(rect.y, 0, maxY);

  return { x, y, width, height };
}

function isRectAspectRatioCompatible(
  rect: ImageCropRect,
  frameAspectRatio: number | null,
): boolean {
  if (frameAspectRatio == null) {
    return true;
  }

  if (rect.height <= 0 || rect.width <= 0) {
    return false;
  }

  const rectRatio = rect.width / rect.height;
  return Math.abs(rectRatio - frameAspectRatio) <= 0.01;
}

function getImageScale(
  frameSize: { width: number; height: number },
  rect: ImageCropRect,
  imageSize: { width: number; height: number },
): number {
  const rectWidthPx = rect.width * imageSize.width;
  const rectHeightPx = rect.height * imageSize.height;
  const scaleX = rectWidthPx <= 0 ? 1 : frameSize.width / rectWidthPx;
  const scaleY = rectHeightPx <= 0 ? 1 : frameSize.height / rectHeightPx;
  return Math.max(scaleX, scaleY);
}

function rectToPx(
  rect: ImageCropRect,
  imageSize: { width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  return {
    x: rect.x * imageSize.width,
    y: rect.y * imageSize.height,
    width: rect.width * imageSize.width,
    height: rect.height * imageSize.height,
  };
}

function rectFromPx(
  rectPx: { x: number; y: number; width: number; height: number },
  imageSize: { width: number; height: number },
): ImageCropRect {
  return clampCropPosition({
    x: rectPx.x / imageSize.width,
    y: rectPx.y / imageSize.height,
    width: rectPx.width / imageSize.width,
    height: rectPx.height / imageSize.height,
  });
}

function clampRectPxPosition(
  rectPx: { x: number; y: number; width: number; height: number },
  imageSize: { width: number; height: number },
  minSizePx: number,
) {
  const width = clamp(rectPx.width, minSizePx, imageSize.width);
  const height = clamp(rectPx.height, minSizePx, imageSize.height);
  const x = clamp(rectPx.x, 0, Math.max(0, imageSize.width - width));
  const y = clamp(rectPx.y, 0, Math.max(0, imageSize.height - height));

  return { x, y, width, height };
}

function getZoomedRect(
  rect: ImageCropRect,
  imageSize: { width: number; height: number },
  frameAspectRatio: number | null,
  zoomFactor: number,
): ImageCropRect {
  const rectPx = rectToPx(rect, imageSize);
  const centerX = rectPx.x + rectPx.width / 2;
  const centerY = rectPx.y + rectPx.height / 2;
  const minSizePx = getMinCropSizePx(imageSize);

  let nextWidth = rectPx.width * zoomFactor;
  let nextHeight = rectPx.height * zoomFactor;

  if (frameAspectRatio == null) {
    nextWidth = clamp(nextWidth, minSizePx, imageSize.width);
    nextHeight = clamp(nextHeight, minSizePx, imageSize.height);
  } else {
    nextWidth = clamp(nextWidth, minSizePx, imageSize.width);
    nextHeight = nextWidth / frameAspectRatio;

    if (nextHeight > imageSize.height) {
      nextHeight = imageSize.height;
      nextWidth = nextHeight * frameAspectRatio;
    }

    if (nextHeight < minSizePx) {
      nextHeight = minSizePx;
      nextWidth = nextHeight * frameAspectRatio;
    }

    if (nextWidth > imageSize.width) {
      nextWidth = imageSize.width;
      nextHeight = nextWidth / frameAspectRatio;
    }
  }

  const nextRectPx = clampRectPxPosition(
    {
      x: centerX - nextWidth / 2,
      y: centerY - nextHeight / 2,
      width: nextWidth,
      height: nextHeight,
    },
    imageSize,
    minSizePx,
  );

  return rectFromPx(nextRectPx, imageSize);
}

function usePointerHoverCapability(): boolean {
  const [isPointerHoverCapable, setIsPointerHoverCapable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== `web`) {
      return;
    }

    if (
      typeof window === `undefined` ||
      typeof window.matchMedia !== `function`
    ) {
      return;
    }

    const mediaQuery = window.matchMedia(`(hover: hover) and (pointer: fine)`);

    const update = () => {
      setIsPointerHoverCapable(mediaQuery.matches);
    };

    update();

    if (typeof mediaQuery.addEventListener === `function`) {
      mediaQuery.addEventListener(`change`, update);
      return () => {
        mediaQuery.removeEventListener(`change`, update);
      };
    }
  }, []);

  return isPointerHoverCapable;
}

interface ImageMeta {
  imageId: string;
  crop: ImageCrop;
  imageWidth?: number | null;
  imageHeight?: number | null;
}

function buildImageMeta(
  value: UserSettingEntityOutput<UserSettingImageEntity> | null,
): ImageMeta | null {
  const imageId = value?.imageId;
  if (imageId == null) {
    return null;
  }

  const crop = parseImageCrop(value?.imageCrop);
  const imageWidthRaw = value?.imageWidth as unknown;
  const imageHeightRaw = value?.imageHeight as unknown;
  const imageWidth = typeof imageWidthRaw === `number` ? imageWidthRaw : null;
  const imageHeight =
    typeof imageHeightRaw === `number` ? imageHeightRaw : null;

  return {
    imageId,
    crop,
    imageWidth,
    imageHeight,
  };
}
