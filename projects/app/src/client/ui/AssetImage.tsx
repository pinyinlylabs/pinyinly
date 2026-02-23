import {
  getLocalImageAssetSource,
  isLocalImageAssetId,
} from "@/client/assets/localImageAssets";
import { useDb } from "@/client/ui/hooks/useDb";
import { AssetStatusKind } from "@/data/model";
import { getAssetKeyForId } from "@/util/assetKey";
import { assetsCdnBaseUrl } from "@/util/env";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { ImageProps as ExpoImageProps } from "expo-image";
import { Image as ExpoImage } from "expo-image";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

interface AssetImageProps extends Omit<ExpoImageProps, `source`> {
  /**
   * The asset ID (not the full key).
   */
  assetId: string;
  /**
   * Optional userId (ignored for content-addressed assets).
   */
  userId?: string;
}

/**
 * Displays an uploaded image from S3/Minio storage.
 *
 * Constructs the CDN URL from EXPO_PUBLIC_ASSETS_CDN_BASE_URL + asset key
 * (blob/{assetId}, where assetId is algorithm-prefixed).
 * Queries TanStack DB for the asset status and shows appropriate states:
 * - Pending: Loading indicator
 * - Uploaded: Display image
 * - Failed: Error message
 */
export function AssetImage({
  assetId,
  userId: _userId,
  contentFit = `cover`,
  ...imageProps
}: AssetImageProps) {
  const db = useDb();
  const { data: assetData } = useLiveQuery(
    (q) =>
      q
        .from({ asset: db.assetCollection })
        .where(({ asset }) => eq(asset.assetId, assetId)),
    [db.assetCollection, assetId],
  );
  const asset = assetData[0] ?? null;
  const [imageError, setImageError] = useState(false);
  const [localSource, setLocalSource] = useState<Awaited<
    ReturnType<typeof getLocalImageAssetSource>
  > | null>(null);
  const [localSourceChecked, setLocalSourceChecked] = useState(false);
  const isLocalAsset = isLocalImageAssetId(assetId);

  useEffect(() => {
    let cancelled = false;
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setLocalSource(null);
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect
    setLocalSourceChecked(false);

    void (async () => {
      const source = await getLocalImageAssetSource(assetId);
      if (cancelled) {
        return;
      }
      setLocalSource(source ?? null);
      setLocalSourceChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (localSource != null && !imageError) {
    return (
      <ExpoImage
        {...imageProps}
        source={localSource}
        contentFit={contentFit}
        transition={200}
        onError={() => {
          setImageError(true);
        }}
      />
    );
  }

  if (isLocalAsset && !localSourceChecked) {
    return (
      <View className="size-full items-center justify-center bg-fg/5">
        <ActivityIndicator size="small" className="text-fg" />
      </View>
    );
  }

  if (asset == null) {
    // Asset not found in TanStack DB yet
    return (
      <View className="size-full items-center justify-center bg-fg/5">
        <ActivityIndicator size="small" className="text-fg" />
      </View>
    );
  }

  if (asset.status === AssetStatusKind.Pending) {
    return (
      <View className="size-full items-center justify-center bg-fg/5">
        <ActivityIndicator size="small" className="text-fg" />
        <Text className="mt-1 text-xs text-fg-dim">Uploading...</Text>
      </View>
    );
  }

  if (asset.status === AssetStatusKind.Failed || imageError) {
    return (
      <View className="size-full items-center justify-center bg-red/10">
        <Text className="text-xs text-red">
          {asset.errorMessage ?? `Failed to load`}
        </Text>
      </View>
    );
  }

  const assetKey = getAssetKeyForId(assetId);

  const imageUrl = `${assetsCdnBaseUrl}${assetKey}`;

  return (
    <ExpoImage
      {...imageProps}
      source={{ uri: imageUrl }}
      contentFit={contentFit}
      transition={200}
      onError={() => {
        setImageError(true);
      }}
    />
  );
}
