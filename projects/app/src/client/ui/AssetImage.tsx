import { useAssetImageCacheQuery } from "@/client/ui/hooks/useAssetImageCacheQuery";
import { useDb } from "@/client/ui/hooks/useDb";
import { ShimmerRect } from "@/client/ui/ShimmerRect";
import type { AssetId } from "@/data/model";
import { AssetStatusKind } from "@/data/model";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { assetsCdnBaseUrl } from "@/util/env";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { ImageProps as ExpoImageProps, ImageStyle } from "expo-image";
import { Image as ExpoImage } from "expo-image";
import { useEffect, useState } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { Text, View } from "react-native";

interface AssetImageProps extends Omit<ExpoImageProps, `source` | `style`> {
  /**
   * The asset ID (not the full key).
   */
  assetId: AssetId;
  debugAssetStatus?: AssetStatusKind;
  debugErrorMessage?: string | null;
  debugImageError?: boolean;
  style?: StyleProp<Pick<ImageStyle, `width` | `height` | `transform`>>;
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
  className,
  style,
  debugAssetStatus,
  debugErrorMessage,
  debugImageError = false,
  ...restImageProps
}: AssetImageProps) {
  const db = useDb();
  const { data: liveAsset } = useLiveQuery(
    (q) =>
      q
        .from({ asset: db.assetCollection })
        .where(({ asset }) => eq(asset.assetId, assetId))
        .findOne(),
    [db.assetCollection, assetId],
  );

  const [imageError, setImageError] = useState(false);
  const cachedImageSource = useAssetImageCacheQuery(assetId);
  const asset =
    debugAssetStatus == null
      ? liveAsset
      : {
          ...liveAsset,
          assetId,
          errorMessage: debugErrorMessage ?? null,
          status: debugAssetStatus,
        };
  const hasImageError = imageError || debugImageError;

  useEffect(() => {
    setImageError(false);
  }, [assetId]);

  if (cachedImageSource != null && !hasImageError) {
    return (
      <ExpoImage
        {...restImageProps}
        source={cachedImageSource}
        className={className}
        style={style}
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
    return <ShimmerRect className={className} style={style as ViewStyle} />;
  }

  if (asset.status === AssetStatusKind.Pending) {
    return <ShimmerRect className={className} style={style as ViewStyle} />;
  }

  if (asset.status === AssetStatusKind.Failed || hasImageError) {
    return (
      <View
        className={`
          items-center justify-center bg-red/10

          ${className ?? ``}
        `}
        style={style as ViewStyle}
      >
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
      {...restImageProps}
      source={{ uri: imageUrl }}
      className={className}
      style={style}
      contentFit={contentFit}
      transition={200}
      onError={() => {
        setImageError(true);
      }}
    />
  );
}
