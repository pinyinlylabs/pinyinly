import type {
  UserSettingEntityInput,
  UserSettingEntityLike,
  UserSettingEntityOutput,
  UserSettingKeyInput,
} from "@/client/ui/hooks/useUserSetting";
import {
  getSettingKeyInfo,
  useUserSetting,
} from "@/client/ui/hooks/useUserSetting";
import type { AssetId } from "@/data/model";
import type { UserSettingImageEntity } from "@/data/userSettings";
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
import type { AiReferenceImageDeclaration } from "./AiImageGenerationPanel";
import { AiImageGenerationPanel } from "./AiImageGenerationPanel";
import { ButtonGroup } from "./ButtonGroup";
import type { FloatingMenuModalMenuProps } from "./FloatingMenuModal";
import { FloatingMenuModal } from "./FloatingMenuModal";
import { FramedAssetImage } from "./ImageFrame";
import { usePointerHoverCapability } from "./hooks/usePointerHoverCapability";
import { useUserSettingHistory } from "./hooks/useUserSettingHistory";
import type {
  ImageCrop,
  ImageCropRect,
  ImageFrameConstraintInput,
  ImageFrameShape,
} from "./imageCrop";
import {
  clampImageCropRectPosition,
  createCenteredCropRect,
  getImageScale,
  getZoomedImageCropRect,
  imageCropValueFromCrop,
  parseImageCrop,
  resolveFrameAspectRatio,
} from "./imageCrop";
import { useAssetImageMeta } from "./useAssetImageMeta";

interface InlineEditableSettingImageProps<T extends UserSettingImageEntity> {
  setting: UserSettingEntityLike<T>;
  settingKey: UserSettingKeyInput<T>;
  presetImageIds?: readonly AssetId[];
  includeHistory?: boolean;
  previewHeight?: number;
  tileSize?: number;
  enableAiGeneration?: boolean;
  initialAiPrompt?: string;
  aiReferenceImages?: AiReferenceImageDeclaration[];
  frameConstraint?: ImageFrameConstraintInput | null;
  frameShape?: ImageFrameShape;
  onUploadError?: (error: string) => void;
  onSaveAiPrompt?: (prompt: string) => void;
  onChangeImageId?: (imageId: AssetId | null) => void;
  readonly?: boolean;
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
  enableAiGeneration = false,
  initialAiPrompt = ``,
  aiReferenceImages,
  frameConstraint,
  frameShape = `rect`,
  onUploadError,
  onSaveAiPrompt,
  onChangeImageId,
  readonly = false,
  className,
}: InlineEditableSettingImageProps<T>) {
  const { value, setValue } = useUserSetting({ setting, key: settingKey });
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
  const frameAspectRatio = resolveFrameAspectRatio(frameConstraint);
  const isPointerHoverCapable = usePointerHoverCapability();
  const isInlineRepositioning = inlineEditorAssetId != null;

  if (readonly) {
    if (imageId == null) {
      return null;
    }
    return (
      <View className={className}>
        <HintImagePreview
          assetId={imageId}
          imageMeta={{ imageId, crop: imageCrop, imageWidth, imageHeight }}
          height={previewHeight}
          aspectRatio={frameAspectRatio}
          frameShape={frameShape}
        />
      </View>
    );
  }

  const historyImageAssetIds: AssetId[] = [];
  const imageMetaById = new Map<AssetId, ImageMeta>();
  if (imageId != null) {
    imageMetaById.set(imageId, {
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
      seenIds.add(assetId);
      historyImageAssetIds.push(assetId);
      const meta = buildImageMeta(entry.value);
      if (meta != null && !imageMetaById.has(meta.imageId)) {
        imageMetaById.set(meta.imageId, meta);
      }
    }
  }
  const imageIdsToShow = Array.from(
    new Set([
      ...historyImageAssetIds,
      ...presetImageIds,
      ...(imageId == null ? [] : [imageId]),
    ]),
  );

  const setSettingValue = (nextValue: UserSettingEntityInput<T> | null) => {
    setHoveredHintImageId(null);
    setValue(nextValue);
    onChangeImageId?.(nextValue?.imageId ?? null);
  };

  const handleSelectHintImage = (assetId: AssetId) => {
    const meta = imageMetaById.get(assetId);
    setSettingValue({
      imageId: assetId,
      imageCrop: imageCropValueFromCrop(meta?.crop),
      imageWidth: meta?.imageWidth ?? undefined,
      imageHeight: meta?.imageHeight ?? undefined,
    } as UserSettingEntityInput<T>);
    setIsPickerOpen(false);
  };

  const handleUseImage = (assetId: AssetId) => {
    setSettingValue({ imageId: assetId } as UserSettingEntityInput<T>);
  };

  const previewHintImageId = hoveredHintImageId ?? imageId ?? null;
  const previewMeta =
    previewHintImageId == null
      ? null
      : (imageMetaById.get(previewHintImageId) ?? null);
  const inlineEditorMeta =
    inlineEditorAssetId == null
      ? null
      : (imageMetaById.get(inlineEditorAssetId) ?? null);
  const canEditCrop = frameAspectRatio != null && imageId != null;
  const shouldShowPreviewButtons = !isInlineRepositioning && !isPickerOpen;
  const shouldShowPickerDoneButton = !isInlineRepositioning && isPickerOpen;
  const shouldShowPickerPanel = isPickerOpen;
  const canShowHistoryMenu = imageIdsToShow.length > 0;
  const { settingKey: aiPlaygroundStorageKey } = getSettingKeyInfo(
    setting,
    settingKey,
  );
  const inlineEditor =
    inlineEditorAssetId == null ? null : (
      <InlineImageRepositionEditor
        assetId={inlineEditorAssetId}
        frameAspectRatio={frameAspectRatio}
        initialCrop={inlineEditorMeta?.crop ?? null}
        initialImageWidth={inlineEditorMeta?.imageWidth ?? null}
        initialImageHeight={inlineEditorMeta?.imageHeight ?? null}
        height={previewHeight}
        frameShape={frameShape}
        onCancel={() => {
          setInlineEditorAssetId(null);
        }}
        onSave={(result: InlineImageRepositionResult) => {
          setSettingValue({
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
                frameShape={frameShape}
              />
            )}
            {shouldShowPickerDoneButton ? (
              <View className="absolute inset-x-3 top-3 items-end">
                <ButtonGroup>
                  {canShowHistoryMenu ? (
                    <FloatingMenuModal
                      menu={
                        <InlineEditableSettingImageHistoryMenu
                          imageIdsToShow={imageIdsToShow}
                          imageId={imageId}
                          hoveredHintImageId={hoveredHintImageId}
                          imageMetaById={imageMetaById}
                          tileSize={tileSize}
                          frameShape={frameShape}
                          onHoverImage={setHoveredHintImageId}
                          onSelectImage={handleSelectHintImage}
                        />
                      }
                    >
                      <ButtonGroup.Button
                        iconStart="time-circled"
                        iconSize={16}
                      />
                    </FloatingMenuModal>
                  ) : null}
                  <ButtonGroup.Button
                    onPress={() => {
                      setIsPickerOpen(false);
                    }}
                  >
                    Done
                  </ButtonGroup.Button>
                </ButtonGroup>
              </View>
            ) : null}
            {shouldShowPreviewButtons ? (
              <View
                className={
                  isPointerHoverCapable
                    ? `
                      pointer-events-none absolute inset-x-3 top-3 items-end opacity-0

                      group-hover:pointer-events-auto group-hover:opacity-100
                    `
                    : `absolute inset-x-3 top-3 items-end`
                }
              >
                <ButtonGroup>
                  <ButtonGroup.Button
                    onPress={() => {
                      setIsPickerOpen(true);
                    }}
                  >
                    Change
                  </ButtonGroup.Button>
                  {canEditCrop ? (
                    <ButtonGroup.Button disabled>Reposition</ButtonGroup.Button>
                  ) : null}
                </ButtonGroup>
              </View>
            ) : null}
          </View>
        ) : (
          <View className="group relative">
            {isInlineRepositioning ? (
              inlineEditor
            ) : (
              <HintImagePreview
                assetId={previewHintImageId}
                imageMeta={previewMeta}
                height={previewHeight}
                aspectRatio={frameAspectRatio}
                frameShape={frameShape}
              />
            )}
            {shouldShowPickerDoneButton ? (
              <View className="absolute inset-x-3 top-3 items-end">
                <ButtonGroup>
                  {canShowHistoryMenu ? (
                    <FloatingMenuModal
                      menu={
                        <InlineEditableSettingImageHistoryMenu
                          imageIdsToShow={imageIdsToShow}
                          imageId={imageId}
                          hoveredHintImageId={hoveredHintImageId}
                          imageMetaById={imageMetaById}
                          tileSize={tileSize}
                          frameShape={frameShape}
                          onHoverImage={setHoveredHintImageId}
                          onSelectImage={handleSelectHintImage}
                        />
                      }
                    >
                      <ButtonGroup.Button
                        iconStart="time-circled"
                        iconSize={16}
                      />
                    </FloatingMenuModal>
                  ) : null}
                  <ButtonGroup.Button
                    onPress={() => {
                      setIsPickerOpen(false);
                    }}
                  >
                    Done
                  </ButtonGroup.Button>
                </ButtonGroup>
              </View>
            ) : null}
            {shouldShowPreviewButtons ? (
              <View
                className={
                  isPointerHoverCapable
                    ? `
                      pointer-events-none absolute inset-x-3 top-3 items-end opacity-0

                      group-hover:pointer-events-auto group-hover:opacity-100
                    `
                    : `absolute inset-x-3 top-3 items-end`
                }
              >
                <ButtonGroup>
                  <ButtonGroup.Button
                    onPress={() => {
                      setIsPickerOpen(true);
                    }}
                  >
                    Change
                  </ButtonGroup.Button>
                  {canEditCrop ? (
                    <ButtonGroup.Button
                      onPress={() => {
                        setInlineEditorAssetId(imageId);
                      }}
                    >
                      Reposition
                    </ButtonGroup.Button>
                  ) : null}
                </ButtonGroup>
              </View>
            ) : null}
          </View>
        )}

        {shouldShowPickerPanel ? (
          <View className="gap-3">
            {enableAiGeneration ? (
              <AiImageGenerationPanel
                initialPrompt={initialAiPrompt}
                aiReferenceImages={aiReferenceImages}
                playgroundStorageKey={aiPlaygroundStorageKey}
                onChangeImage={(assetId) => {
                  handleUseImage(assetId);
                }}
                onError={onUploadError}
                onSavePrompt={onSaveAiPrompt}
              />
            ) : (
              <InlineEditableSettingImageHistoryGrid
                imageIdsToShow={imageIdsToShow}
                imageId={imageId}
                hoveredHintImageId={hoveredHintImageId}
                imageMetaById={imageMetaById}
                tileSize={tileSize}
                frameShape={frameShape}
                onHoverImage={setHoveredHintImageId}
                onSelectImage={handleSelectHintImage}
              />
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function InlineEditableSettingImageHistoryMenu({
  imageIdsToShow,
  imageId,
  hoveredHintImageId,
  imageMetaById,
  tileSize,
  frameShape,
  onHoverImage,
  onSelectImage,
  onRequestClose,
}: {
  imageIdsToShow: readonly AssetId[];
  imageId: AssetId | null;
  hoveredHintImageId: AssetId | null;
  imageMetaById: ReadonlyMap<AssetId, ImageMeta>;
  tileSize: number;
  frameShape: ImageFrameShape;
  onHoverImage: (assetId: AssetId | null) => void;
  onSelectImage: (assetId: AssetId) => void;
} & FloatingMenuModalMenuProps) {
  return (
    <View className="max-w-[420px] gap-2 rounded-xl bg-bg-high p-3">
      <Text className="font-sans text-[11px] uppercase text-fg-dim">
        History
      </Text>
      <InlineEditableSettingImageHistoryGrid
        imageIdsToShow={imageIdsToShow}
        imageId={imageId}
        hoveredHintImageId={hoveredHintImageId}
        imageMetaById={imageMetaById}
        tileSize={tileSize}
        frameShape={frameShape}
        onHoverImage={onHoverImage}
        onSelectImage={(assetId) => {
          onSelectImage(assetId);
          onRequestClose?.();
        }}
      />
    </View>
  );
}

function InlineEditableSettingImageHistoryGrid({
  imageIdsToShow,
  imageId,
  hoveredHintImageId,
  imageMetaById,
  tileSize,
  frameShape,
  onHoverImage,
  onSelectImage,
}: {
  imageIdsToShow: readonly AssetId[];
  imageId: AssetId | null;
  hoveredHintImageId: AssetId | null;
  imageMetaById: ReadonlyMap<AssetId, ImageMeta>;
  tileSize: number;
  frameShape: ImageFrameShape;
  onHoverImage: (assetId: AssetId | null) => void;
  onSelectImage: (assetId: AssetId) => void;
}) {
  if (imageIdsToShow.length === 0) {
    return null;
  }

  return (
    <View className="flex-row flex-wrap gap-2">
      {imageIdsToShow.map((assetId) => {
        const isSelected = assetId === imageId;
        const isHovered = assetId === hoveredHintImageId;
        const meta = imageMetaById.get(assetId) ?? null;

        return (
          <Pressable
            key={assetId}
            onPress={() => {
              onSelectImage(assetId);
            }}
            onHoverIn={() => {
              onHoverImage(assetId);
            }}
            onHoverOut={() => {
              onHoverImage(null);
            }}
          >
            <HintImageTile
              assetId={assetId}
              imageMeta={meta}
              isSelected={isSelected}
              isHovered={isHovered}
              size={tileSize}
              frameShape={frameShape}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function HintImagePreview({
  assetId,
  imageMeta,
  height,
  aspectRatio,
  frameShape,
}: {
  assetId: AssetId | null;
  imageMeta: ImageMeta | null;
  height: number;
  aspectRatio: number | null;
  frameShape: ImageFrameShape;
}) {
  const shapeClassName = frameShape === `circle` ? `rounded-full` : ``;

  if (assetId == null) {
    return (
      <View
        className={`
          w-full items-center justify-center bg-fg-bg5

          ${shapeClassName}
        `}
        style={aspectRatio == null ? { height } : { aspectRatio }}
      >
        <Text className="font-sans text-xs text-fg-dim">No image selected</Text>
      </View>
    );
  }

  return (
    <View
      className={`
        w-full overflow-hidden bg-fg-bg5

        ${shapeClassName}
      `}
      style={aspectRatio == null ? { height } : { aspectRatio }}
    >
      <FramedAssetImage
        assetId={assetId}
        crop={imageMeta?.crop}
        imageWidth={imageMeta?.imageWidth ?? null}
        imageHeight={imageMeta?.imageHeight ?? null}
        frameShape={frameShape}
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
  frameShape,
  onCancel,
  onSave,
}: {
  assetId: AssetId;
  frameAspectRatio: number | null;
  initialCrop: ImageCrop | null;
  initialImageWidth: number | null;
  initialImageHeight: number | null;
  height: number;
  frameShape: ImageFrameShape;
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

  if (!canSave) {
    return (
      <View
        className={`w-full items-center justify-center`}
        style={containerStyle}
      >
        <ActivityIndicator size="small" className="text-fg" />
        <Text className="mt-2 font-sans text-[12px] text-fg-dim">
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
      frameShape={frameShape}
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
  frameShape,
  containerStyle,
  onCancel,
  onSave,
  onCropRectChange,
}: {
  assetId: AssetId;
  cropRect: ImageCropRect;
  imageSize: { width: number; height: number };
  frameAspectRatio: number | null;
  frameShape: ImageFrameShape;
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
        const nextRect = clampImageCropRectPosition({
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
      className={`
        relative w-full overflow-hidden

        ${frameShape === `circle` ? `rounded-full` : ``}
      `}
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
        frameShape={frameShape}
        className="size-full"
      />
      <View
        className={
          frameShape === `circle`
            ? `pointer-events-none absolute inset-0 rounded-full border-2 border-fg/50`
            : `pointer-events-none absolute inset-0 border border-fg/20`
        }
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
          <Text className="font-sans text-[12px] text-fg">
            Drag image to reposition
          </Text>
        </View>
      </View>
      <View className="absolute inset-x-3 bottom-3 flex-row items-center justify-between">
        <ButtonGroup>
          <ButtonGroup.Button
            onPress={() => {
              const nextRect = getZoomedImageCropRect(
                cropRect,
                imageSize,
                frameAspectRatio,
                1.1,
              );
              onCropRectChange(nextRect);
            }}
            iconStart="minus"
            iconSize={20}
          />
          <ButtonGroup.Button
            onPress={() => {
              const nextRect = getZoomedImageCropRect(
                cropRect,
                imageSize,
                frameAspectRatio,
                0.9,
              );
              onCropRectChange(nextRect);
            }}
            iconStart="plus"
            iconSize={20}
          />
        </ButtonGroup>
        <ButtonGroup>
          <ButtonGroup.Button onPress={onCancel}>Cancel</ButtonGroup.Button>
          <ButtonGroup.Button
            onPress={() => {
              onSave(cropRect);
            }}
          >
            Save position
          </ButtonGroup.Button>
        </ButtonGroup>
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
  frameShape,
}: {
  assetId: AssetId;
  imageMeta: ImageMeta | null;
  isSelected: boolean;
  isHovered: boolean;
  size: number;
  frameShape: ImageFrameShape;
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
        className={`
          overflow-hidden bg-fg-bg5

          ${frameShape === `circle` ? `rounded-full` : `rounded-md`}
        `}
        style={{ height: size, width: size }}
      >
        <FramedAssetImage
          assetId={assetId}
          crop={imageMeta?.crop}
          imageWidth={resolvedImageWidth}
          imageHeight={resolvedImageHeight}
          frameShape={frameShape}
          className="size-full"
        />
      </View>
      <View
        className={
          isSelected
            ? `
              absolute inset-0 border-2 border-blue

              ${frameShape === `circle` ? `rounded-full` : `rounded-md`}
            `
            : isHovered
              ? `
                absolute inset-0 border-2 border-cyan/40

                ${frameShape === `circle` ? `rounded-full` : `rounded-md`}
              `
              : `
                absolute inset-0 border border-fg/10

                ${frameShape === `circle` ? `rounded-full` : `rounded-md`}
              `
        }
        pointerEvents="none"
      />
    </View>
  );
}

interface ImageMeta {
  imageId: AssetId;
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
