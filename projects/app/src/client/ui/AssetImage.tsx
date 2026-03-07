import { useAssetImageCacheQuery } from "@/client/ui/hooks/useAssetImageCacheQuery";
import { useDb } from "@/client/ui/hooks/useDb";
import type { AssetId } from "@/data/model";
import { AssetStatusKind } from "@/data/model";
import { getBucketObjectKeyForId } from "@/util/assetId";
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
  assetId: AssetId;
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
  contentFit = `cover`,
  ...imageProps
}: AssetImageProps) {
  const db = useDb();
  const { data: asset } = useLiveQuery(
    (q) =>
      q
        .from({ asset: db.assetCollection })
        .where(({ asset }) => eq(asset.assetId, assetId))
        .findOne(),
    [db.assetCollection, assetId],
  );
  const [imageError, setImageError] = useState(false);
  const cachedImageSource = useAssetImageCacheQuery(assetId);

  useEffect(() => {
    setImageError(false);
  }, [assetId]);

  if (cachedImageSource != null && !imageError) {
    return (
      <ExpoImage
        {...imageProps}
        source={cachedImageSource}
        contentFit={contentFit}
        transition={200}
        onError={() => {
          setImageError(true);
        }}
      />
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

  const assetKey = getBucketObjectKeyForId(assetId);

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
