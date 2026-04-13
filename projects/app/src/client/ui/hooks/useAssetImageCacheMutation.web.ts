import type {
  AssetImageCacheData,
  AssetImageCacheMutationResult,
} from "@/client/ui/hooks/useAssetImageCacheMutation";
import type { AssetId } from "@/data/model";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { assetsCdnBaseUrl } from "@/util/env";

const DB_NAME = `pyly-asset-image-cache`;
const DB_VERSION = 1;
const STORE_NAME = `asset-image-blob`;
const ASSET_IMAGE_HTTP_CACHE_NAME = `pyly-asset-image-v1`;

type CacheListener = () => void;

const listeners = new Map<AssetId, Set<CacheListener>>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

function isIndexedDbAvailable() {
  return typeof indexedDB !== `undefined`;
}

function isCacheApiAvailable() {
  return typeof caches !== `undefined`;
}

function getAssetImageUrl(assetId: AssetId) {
  const assetKey = getBucketObjectKeyForId(assetId);
  return `${assetsCdnBaseUrl}${assetKey}`;
}

async function getDbPromise() {
  if (dbPromise != null) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase | null>((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error ?? new Error(`Failed to open asset image cache`));
    };
  });

  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await getDbPromise();
  if (db == null) {
    return null;
  }

  return new Promise<T | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const request = fn(store);
    let result: T | null = null;
    let settled = false;

    const resolveOnce = (value: T | null) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(value);
    };

    const rejectOnce = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    request.onsuccess = () => {
      result = (request.result as T | undefined) ?? null;
    };

    request.onerror = () => {
      rejectOnce(
        request.error ?? new Error(`Asset image cache request failed`),
      );
    };

    transaction.oncomplete = () => {
      resolveOnce(result);
    };

    transaction.onerror = () => {
      rejectOnce(
        transaction.error ?? new Error(`Asset image cache transaction failed`),
      );
    };

    transaction.onabort = () => {
      rejectOnce(
        transaction.error ?? new Error(`Asset image cache transaction aborted`),
      );
    };
  });
}

function notify(assetId: AssetId) {
  const assetListeners = listeners.get(assetId);
  if (assetListeners == null) {
    return;
  }

  for (const listener of assetListeners) {
    listener();
  }
}

async function setAssetImageBlobInCache(assetId: AssetId, blob: Blob) {
  await withStore(`readwrite`, (store) => store.put(blob, assetId));
  notify(assetId);
}

async function deleteAssetImageBlobFromCache(assetId: AssetId) {
  await withStore(`readwrite`, (store) => store.delete(assetId));
  notify(assetId);
}

async function populateAssetImageHttpCache(
  assetId: AssetId,
  imageData: AssetImageCacheData,
) {
  if (!isCacheApiAvailable()) {
    return;
  }

  const cache = await caches.open(ASSET_IMAGE_HTTP_CACHE_NAME);
  const assetImageUrl = getAssetImageUrl(assetId);
  const response = new Response(imageData.blob, {
    status: 200,
    headers: {
      "Content-Type": imageData.contentType,
      "Cache-Control": `public, max-age=31536000, immutable`,
    },
  });

  await cache.put(assetImageUrl, response);
}

export function useAssetImageCacheMutation(): AssetImageCacheMutationResult {
  const setCache: AssetImageCacheMutationResult[`setCache`] = async (
    assetId,
    imageData,
  ) => {
    if (imageData.kind === `notUploaded`) {
      await setAssetImageBlobInCache(assetId, imageData.blob);
      return;
    }

    await populateAssetImageHttpCache(assetId, imageData);
    await deleteAssetImageBlobFromCache(assetId);
  };

  const clearCache: AssetImageCacheMutationResult[`clearCache`] = async (
    assetId,
  ) => {
    await deleteAssetImageBlobFromCache(assetId);
  };

  return {
    setCache,
    clearCache,
  };
}

export async function getAssetImageBlobFromCache(assetId: AssetId) {
  const result = await withStore<unknown>(
    `readonly`,
    (store) => store.get(assetId) as IDBRequest<unknown>,
  );
  if (result instanceof Blob) {
    return result;
  }

  return null;
}

export function subscribeAssetImageBlobCache(
  assetId: AssetId,
  listener: CacheListener,
) {
  const existing = listeners.get(assetId);
  if (existing == null) {
    listeners.set(assetId, new Set([listener]));
  } else {
    existing.add(listener);
  }

  return () => {
    const assetListeners = listeners.get(assetId);
    if (assetListeners == null) {
      return;
    }

    assetListeners.delete(listener);
    if (assetListeners.size === 0) {
      listeners.delete(assetId);
    }
  };
}
