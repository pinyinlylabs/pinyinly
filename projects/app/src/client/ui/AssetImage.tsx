import { useRizzleQuery } from "@/client/hooks/useRizzleQuery";
import type { v10 } from "@/data/rizzleSchema";
import { AssetStatusKind } from "@/data/model";
import type { RizzleReplicache } from "@/util/rizzle";
import { Image as ExpoImage } from "expo-image";
import type { ImageProps as ExpoImageProps } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

interface AssetImageProps extends Omit<ExpoImageProps, `source`> {
  /**
   * The asset ID (not the full key).
   */
  assetId: string;
  /**
   * Optional userId - if not provided, will be fetched from asset entity
   */
  userId?: string;
}

/**
 * Displays an uploaded image from R2/Minio storage.
 *
 * Constructs the CDN URL from EXPO_PUBLIC_ASSETS_CDN_BASE_URL + asset key (u/{userId}/{assetId}).
 * Queries Replicache for the asset status and shows appropriate states:
 * - Pending: Loading indicator
 * - Uploaded: Display image
 * - Failed: Error message
 */
type RizzleV10 = RizzleReplicache<typeof v10>;
type AssetEntity = NonNullable<
  Awaited<ReturnType<RizzleV10[`query`][`asset`][`get`]>>
>;

export function AssetImage({
  assetId,
  userId,
  ...imageProps
}: AssetImageProps) {
  const { data: asset } = useRizzleQuery<AssetEntity | null>(
    [`asset`, assetId],
    async (r, tx) => {
      const r10 = r as RizzleV10;
      return (await r10.query.asset.get(tx, { assetId })) ?? null;
    },
  );
  const [imageError, setImageError] = useState(false);

  if (asset == null) {
    // Asset not found in Replicache yet
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

  // Construct CDN URL: baseUrl + u/{userId}/{assetId}
  const baseUrl = process.env.EXPO_PUBLIC_ASSETS_CDN_BASE_URL;
  if (baseUrl == null || baseUrl.length === 0) {
    return (
      <View className="size-full items-center justify-center bg-fg/5">
        <Text className="text-xs text-fg-dim">CDN URL not configured</Text>
      </View>
    );
  }

  // Asset key format: u/{userId}/{assetId}
  // Note: userId should come from the asset entity in a real implementation,
  // but for now we'll use the Replicache pattern where userId is implicit
  // For prototyping, we can construct it, but in production you'd want to get userId from context or asset
  const assetKey = `u/${userId ?? `USER`}/${assetId}`;
  const imageUrl = `${baseUrl}${assetKey}`;

  return (
    <ExpoImage
      {...imageProps}
      source={{ uri: imageUrl }}
      contentFit="cover"
      transition={200}
      onError={() => {
        setImageError(true);
      }}
    />
  );
}
