import type { AssetId } from "@/data/model";

type CacheListener = () => void;

export interface AssetImageCacheData {
  kind: `pending` | `uploaded`;
  blob: Blob;
  contentType: string;
}

export type SetAssetImageCacheFunction = (
  assetId: AssetId,
  imageData: AssetImageCacheData,
) => Promise<void>;

export type ClearAssetImageCacheFunction = (assetId: AssetId) => Promise<void>;

export interface AssetImageCacheMutationResult {
  setCache: SetAssetImageCacheFunction;
  clearCache: ClearAssetImageCacheFunction;
}

export function useAssetImageCacheMutation(): AssetImageCacheMutationResult {
  return {
    // oxlint-disable-next-line no-empty-function
    setCache: async () => {},
    // oxlint-disable-next-line no-empty-function
    clearCache: async () => {},
  };
}

export async function getAssetImageBlobFromCache(
  _assetId: AssetId,
): Promise<Blob | null> {
  return null;
}

export function subscribeAssetImageBlobCache(
  _assetId: AssetId,
  _listener: CacheListener,
) {
  // oxlint-disable-next-line no-empty-function
  return () => {};
}
