import type { AssetId } from "@/data/model";
import type { ImageProps as ExpoImageProps } from "@/client/ui/Image";

export type AssetImageCacheQueryResult = ExpoImageProps[`source`] | null;

export function useAssetImageCacheQuery(
  _assetId: AssetId,
): AssetImageCacheQueryResult {
  return null;
}
