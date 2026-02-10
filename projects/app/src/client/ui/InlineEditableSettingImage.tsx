import type {
  UserSettingEntity,
  UserSettingEntityInput,
  UserSettingKeyInput,
} from "@/client/hooks/useUserSetting";
import {
  useUserSetting,
  useUserSettingHistory,
} from "@/client/hooks/useUserSetting";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { AssetImage } from "./AssetImage";
import { ImagePasteDropZone } from "./ImagePasteDropZone";

interface InlineEditableSettingImageProps<T extends UserSettingEntity> {
  setting: T;
  settingKey: UserSettingKeyInput<T>;
  presetImageIds?: readonly string[];
  includeHistory?: boolean;
  previewHeight?: number;
  tileSize?: number;
  enablePasteDropZone?: boolean;
  onUploadError?: (error: string) => void;
  className?: string;
}

export function InlineEditableSettingImage<T extends UserSettingEntity>({
  setting,
  settingKey,
  presetImageIds = [],
  includeHistory = true,
  previewHeight = 200,
  tileSize = 64,
  enablePasteDropZone = false,
  onUploadError,
  className,
}: InlineEditableSettingImageProps<T>) {
  const { value, setValue } = useUserSetting(setting, settingKey);
  const history = useUserSettingHistory(setting, settingKey);
  const selectedHintImageId = (value as { t?: string } | null)?.t ?? null;
  const [hoveredHintImageId, setHoveredHintImageId] = useState<string | null>(
    null,
  );

  const historyImageAssetIds: string[] = [];
  if (includeHistory) {
    const seenIds = new Set<string>();
    for (const entry of [...history.entries].reverse()) {
      const assetId = (entry.value as { t?: string } | null)?.t;
      if (typeof assetId !== `string` || assetId.length === 0) {
        continue;
      }
      if (seenIds.has(assetId)) {
        continue;
      }
      seenIds.add(assetId);
      historyImageAssetIds.push(assetId);
    }
  }

  const imageIdsToShow = Array.from(
    new Set([
      ...historyImageAssetIds,
      ...presetImageIds,
      ...(selectedHintImageId == null ? [] : [selectedHintImageId]),
    ]),
  );

  const handleSelectHintImage = (assetId: string) => {
    setValue({ t: assetId } as UserSettingEntityInput<T>);
  };

  const handleAddCustomImage = (assetId: string) => {
    setValue({ t: assetId } as UserSettingEntityInput<T>);
  };

  const previewHintImageId = hoveredHintImageId ?? selectedHintImageId ?? null;

  return (
    <View className={className}>
      <View className="gap-3">
        {previewHintImageId == null ? null : (
          <HintImagePreview
            assetId={previewHintImageId}
            height={previewHeight}
          />
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
                    size={tileSize}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
      {enablePasteDropZone ? (
        <View className="pt-2">
          <ImagePasteDropZone
            onUploadComplete={handleAddCustomImage}
            onUploadError={onUploadError}
          />
        </View>
      ) : null}
    </View>
  );
}

function HintImagePreview({
  assetId,
  height,
}: {
  assetId: string;
  height: number;
}) {
  return (
    <View
      className="w-full overflow-hidden rounded-lg border border-fg/10 bg-fg-bg5"
      style={{ height }}
    >
      <AssetImage assetId={assetId} className="size-full" />
    </View>
  );
}

function HintImageTile({
  assetId,
  isSelected,
  isHovered,
  size,
}: {
  assetId: string;
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
