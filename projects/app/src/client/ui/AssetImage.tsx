import {
  getLocalImageAssetSource,
  isLocalImageAssetId,
} from "@/client/assets/localImageAssets";
import { trpc } from "@/client/trpc";
import { useDb } from "@/client/ui/hooks/useDb";
import { AssetStatusKind } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { Image as ExpoImage } from "expo-image";
import type { ImageProps as ExpoImageProps } from "expo-image";
import { useEffect, useState } from "react";
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
 * Queries TanStack DB for the asset status and shows appropriate states:
 * - Pending: Loading indicator
 * - Uploaded: Display image
 * - Failed: Error message
 */
export function AssetImage({
  assetId,
  userId,
  contentFit = `cover`,
  ...imageProps
}: AssetImageProps) {
  const db = useDb();
  const { data: assetData } = useLiveQuery((q) =>
    q
      .from({ asset: db.assetCollection })
      .where(({ asset }) => eq(asset.assetId, assetId)),
  );
  const asset = assetData[0] ?? null;
  const [imageError, setImageError] = useState(false);
  const [localSource, setLocalSource] = useState<Awaited<
    ReturnType<typeof getLocalImageAssetSource>
  > | null>(null);
  const [localSourceChecked, setLocalSourceChecked] = useState(false);
  const isLocalAsset = isLocalImageAssetId(assetId);
  const shouldFetchAssetKey =
    !isLocalAsset &&
    userId == null &&
    asset?.status === AssetStatusKind.Uploaded;
  const assetKeyQuery = trpc.asset.getAssetKey.useQuery(
    { assetId },
    {
      enabled: shouldFetchAssetKey,
    },
  );

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

  // Construct CDN URL: baseUrl + u/{userId}/{assetId}
  const baseUrl = process.env.EXPO_PUBLIC_ASSETS_CDN_BASE_URL;
  if (baseUrl == null || baseUrl.length === 0) {
    return (
      <View className="size-full items-center justify-center bg-fg/5">
        <Text className="text-xs text-fg-dim">CDN URL not configured</Text>
      </View>
    );
  }

  const assetKey =
    userId == null ? assetKeyQuery.data?.assetKey : `u/${userId}/${assetId}`;

  if (assetKey == null) {
    return (
      <View className="size-full items-center justify-center bg-fg/5">
        <ActivityIndicator size="small" className="text-fg" />
      </View>
    );
  }

  const imageUrl = `${baseUrl}${assetKey}`;

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
