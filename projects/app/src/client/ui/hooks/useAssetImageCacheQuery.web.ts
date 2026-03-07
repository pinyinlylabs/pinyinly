import {
  getAssetImageBlobFromCache,
  subscribeAssetImageBlobCache,
} from "@/client/ui/hooks/useAssetImageCacheMutation";
import type { AssetId } from "@/data/model";
import type { ImageProps as ExpoImageProps } from "expo-image";
import { useEffect, useState } from "react";
import type { AssetImageCacheQueryResult } from "./useAssetImageCacheQuery";

export function useAssetImageCacheQuery(
  assetId: AssetId,
): AssetImageCacheQueryResult {
  const [imageSource, setImageSource] = useState<
    ExpoImageProps[`source`] | null
  >(null);

  useEffect(() => {
    let cancelled = false;
    let currentObjectUrl: string | null = null;

    const loadCachedBlob = async () => {
      const blob: Blob | null = await getAssetImageBlobFromCache(assetId);
      if (cancelled) {
        return;
      }

      if (currentObjectUrl != null) {
        URL.revokeObjectURL(currentObjectUrl);
        currentObjectUrl = null;
      }

      if (blob != null) {
        currentObjectUrl = URL.createObjectURL(blob);
      }

      setImageSource(
        currentObjectUrl == null ? null : ({ uri: currentObjectUrl } as const),
      );
    };

    const unsubscribe = subscribeAssetImageBlobCache(assetId, () => {
      void loadCachedBlob();
    });

    void loadCachedBlob();

    return () => {
      cancelled = true;
      unsubscribe();
      if (currentObjectUrl != null) {
        URL.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [assetId]);

  return imageSource;
}
