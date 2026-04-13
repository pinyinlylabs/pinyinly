import { useAssetImageCacheQuery } from "@/client/ui/hooks/useAssetImageCacheQuery";
import { ShimmerRect } from "@/client/ui/ShimmerRect";
import type { AssetId } from "@/data/model";
import { AssetStatusKind } from "@/data/model";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { assetsCdnBaseUrl } from "@/util/env";
import type { ImageProps as ExpoImageProps, ImageStyle } from "expo-image";
import { Image as ExpoImage } from "expo-image";
import { useEffect, useState } from "react";
import type { StyleProp } from "react-native";
import { Text, View } from "react-native";

interface AssetImageProps extends Omit<ExpoImageProps, `source` | `style`> {
  /**
   * The asset ID (not the full key).
   */
  assetId: AssetId;
  demoAssetStatus?: AssetStatusKind;
  demoErrorMessage?: string | null;
  demoImageError?: boolean;
  style?: StyleProp<Pick<ImageStyle, `width` | `height` | `transform`>>;
}

/**
 * Displays an uploaded image from S3/Minio storage.
 *
 * Constructs the CDN URL from EXPO_PUBLIC_ASSETS_CDN_BASE_URL + asset key
 * (blob/{assetId}, where assetId is algorithm-prefixed).
 * Renders cached pending/uploaded blobs when available, otherwise falls back
 * to the CDN URL.
 */
export function AssetImage({
  assetId,
  contentFit = `cover`,
  className,
  style,
  demoAssetStatus,
  demoErrorMessage,
  demoImageError = false,
  onLoadStart,
  onLoadEnd,
  onError,
  ...restImageProps
}: AssetImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const cachedImageSource = useAssetImageCacheQuery(assetId);
  const hasImageError = imageError || demoImageError;
  const imageUrl = `${assetsCdnBaseUrl}${getBucketObjectKeyForId(assetId)}`;
  const source =
    cachedImageSource != null && !hasImageError
      ? cachedImageSource
      : { uri: imageUrl };

  useEffect(() => {
    setImageError(false);
    setIsLoading(true);
  }, [assetId]);

  const showFailedOverlay =
    demoAssetStatus === AssetStatusKind.Failed || hasImageError;
  const showLoadingOverlay =
    demoAssetStatus === AssetStatusKind.Pending ||
    (isLoading && !showFailedOverlay);

  return (
    <View
      className={`
        relative overflow-hidden

        ${className ?? ``}
      `}
      style={style}
    >
      <ExpoImage
        {...restImageProps}
        source={source}
        className="size-full"
        contentFit={contentFit}
        transition={200}
        onLoadStart={() => {
          setIsLoading(true);
          onLoadStart?.();
        }}
        onLoadEnd={() => {
          setIsLoading(false);
          onLoadEnd?.();
        }}
        onError={(event) => {
          setImageError(true);
          onError?.(event);
        }}
      />

      {showLoadingOverlay ? (
        <ShimmerRect className="absolute inset-0 size-full" />
      ) : null}

      {showFailedOverlay ? (
        <View className="absolute inset-0 size-full items-center justify-center bg-red/10">
          <Text className="font-sans text-xs text-red">
            {demoErrorMessage ?? `Failed to load`}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
