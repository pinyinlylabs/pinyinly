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
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { AiImageGenerationPanel } from "./AiImageGenerationPanel";
import { FramedAssetImage } from "./ImageFrame";
import { ImageFrameEditorModal } from "./ImageFrameEditorModal";
import { ImagePasteDropZone } from "./ImagePasteDropZone";
import { RectButton } from "./RectButton";
import type { ImageCrop, ImageFrameConstraintInput } from "./imageCrop";
import {
  imageCropValueFromCrop,
  parseImageCrop,
  resolveFrameAspectRatio,
} from "./imageCrop";

interface InlineEditableSettingImageProps<T extends UserSettingImageEntity> {
  setting: T;
  settingKey: UserSettingKeyInput<T>;
  presetImageIds?: readonly string[];
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
  const [hoveredHintImageId, setHoveredHintImageId] = useState<string | null>(
    null,
  );
  const [editorAssetId, setEditorAssetId] = useState<string | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<`upload` | `generate`>(`upload`);
  const frameAspectRatio = resolveFrameAspectRatio(frameConstraint);

  const historyImageAssetIds: string[] = [];
  const imageMetaById = new Map<string, ImageMeta>();
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
    for (const entry of [...history.entries].reverse()) {
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

  const handleSelectHintImage = (assetId: string) => {
    const meta = imageMetaById.get(assetId);
    setValue({
      imageId: assetId,
      imageCrop: imageCropValueFromCrop(meta?.crop),
      imageWidth: meta?.imageWidth ?? undefined,
      imageHeight: meta?.imageHeight ?? undefined,
    } as UserSettingEntityInput<T>);
    setIsPickerOpen(false);
  };

  const handleAddCustomImage = (assetId: string) => {
    setValue({ imageId: assetId } as UserSettingEntityInput<T>);
    if (frameAspectRatio != null) {
      setEditorAssetId(assetId);
    }
    setIsPickerOpen(false);
  };

  const previewHintImageId = hoveredHintImageId ?? imageId ?? null;
  const previewMeta =
    previewHintImageId == null
      ? null
      : (imageMetaById.get(previewHintImageId) ?? null);
  const editorMeta =
    editorAssetId == null ? null : (imageMetaById.get(editorAssetId) ?? null);
  const canEditCrop = frameAspectRatio != null && imageId != null;
  const shouldShowPickerPanel = isPickerOpen;
  const editorModal =
    editorAssetId == null ? null : (
      <ImageFrameEditorModal
        assetId={editorAssetId}
        frameConstraint={frameConstraint}
        initialCrop={editorMeta?.crop}
        initialImageWidth={editorMeta?.imageWidth ?? null}
        initialImageHeight={editorMeta?.imageHeight ?? null}
        onDismiss={() => {
          setEditorAssetId(null);
        }}
        onSave={(result) => {
          setValue({
            imageId: editorAssetId,
            imageCrop: imageCropValueFromCrop(result.crop),
            imageWidth: result.imageWidth,
            imageHeight: result.imageHeight,
          } as UserSettingEntityInput<T>);
          setEditorAssetId(null);
        }}
      />
    );

  return (
    <View className={className}>
      <View className="gap-2">
        <View className="relative">
          <HintImagePreview
            assetId={previewHintImageId}
            imageMeta={previewMeta}
            height={previewHeight}
            aspectRatio={frameAspectRatio}
          />
          <View className="absolute inset-x-3 bottom-3 flex-row items-center justify-end gap-2">
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
                  setEditorAssetId(imageId);
                }}
              >
                Reposition
              </RectButton>
            ) : null}
          </View>
        </View>

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
      {editorModal}
    </View>
  );
}

function HintImagePreview({
  assetId,
  imageMeta,
  height,
  aspectRatio,
}: {
  assetId: string | null;
  imageMeta: ImageMeta | null;
  height: number;
  aspectRatio: number | null;
}) {
  if (assetId == null) {
    return (
      <View
        className={`
          w-full items-center justify-center rounded-lg border border-dashed border-fg/20 bg-fg-bg5
        `}
        style={aspectRatio == null ? { height } : { aspectRatio }}
      >
        <Text className="text-xs text-fg-dim">No image selected</Text>
      </View>
    );
  }

  return (
    <View
      className="w-full overflow-hidden rounded-lg border border-fg/10 bg-fg-bg5"
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

function HintImageTile({
  assetId,
  imageMeta,
  isSelected,
  isHovered,
  size,
}: {
  assetId: string;
  imageMeta: ImageMeta | null;
  isSelected: boolean;
  isHovered: boolean;
  size: number;
}) {
  return (
    <View className="relative" style={{ height: size, width: size }}>
      <View
        className="overflow-hidden rounded-md bg-fg-bg5"
        style={{ height: size, width: size }}
      >
        <FramedAssetImage
          assetId={assetId}
          crop={imageMeta?.crop}
          imageWidth={imageMeta?.imageWidth ?? null}
          imageHeight={imageMeta?.imageHeight ?? null}
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
