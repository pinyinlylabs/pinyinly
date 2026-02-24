import type { AssetId } from "@/data/model";
import { memoize0 } from "@pinyinly/lib/collections";
import { Image } from "react-native";

// oxlint-disable eslint-plugin-import/no-commonjs, eslint-plugin-import/no-relative-parent-imports, typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-return

export type LocalImageLoader = () => Promise<RnRequireSource>;

type LocalImageAssetEntry = {
  mimeType: `image/png` | `image/jpeg` | `image/webp`;
  loader: LocalImageLoader;
};

const localImageAssets: Record<AssetId, LocalImageAssetEntry> = {
  // app:illustration:edge
  "sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM": {
    mimeType: `image/jpeg` as const,
    loader: async () =>
      require(
        `../../assets/sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM.jpg`,
      ),
  },
  // wiki:学:child
  "sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw": {
    mimeType: `image/png` as const,
    loader: async () =>
      require(
        `../../assets/sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw.png`,
      ),
  },
  // wiki:原:meaning
  "sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug": {
    mimeType: `image/png` as const,
    loader: async () =>
      require(
        `../../assets/sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug.png`,
      ),
  },
  // wiki:坏:meaning
  "sha256/llztsum5npSYNprvTIkrJDt2D5nSTTMfkPI68gWxw1A": {
    mimeType: `image/png` as const,
    loader: async () =>
      require(
        `../../assets/sha256/llztsum5npSYNprvTIkrJDt2D5nSTTMfkPI68gWxw1A.png`,
      ),
  },
  // wiki:看:meaning
  "sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU": {
    mimeType: `image/jpeg` as const,
    loader: async () =>
      require(
        `../../assets/sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU.jpg`,
      ),
  },
  // wiki:福:meaning
  "sha256/mr1f6r5rfHjtXhXJd7o8plSn3E7hnq9yvip22GMPy2w": {
    mimeType: `image/webp` as const,
    loader: async () =>
      require(
        `../../assets/sha256/mr1f6r5rfHjtXhXJd7o8plSn3E7hnq9yvip22GMPy2w.webp`,
      ),
  },
};

const localImageAssetCache = new Map<string, RnRequireSource>();
const localImageBase64Cache = new Map<
  AssetId,
  { data: string; mimeType: string }
>();
// oxlint-enable eslint-plugin-import/no-commonjs, eslint-plugin-import/no-relative-parent-imports, typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-return

export function isLocalImageAssetId(assetId: AssetId): boolean {
  return assetId in localImageAssets;
}

export async function getLocalImageAssetSource(
  assetId: AssetId,
): Promise<RnRequireSource | undefined> {
  const entry = localImageAssets[assetId];
  if (entry == null) {
    return undefined;
  }
  if (localImageAssetCache.has(assetId)) {
    return localImageAssetCache.get(assetId);
  }
  const source = await entry.loader();
  localImageAssetCache.set(assetId, source);
  return source;
}

/**
 * Get the MIME type for a local image asset based on its ID.
 * Gets MIME type from the stored extension.
 */
function getMimeTypeForAssetId(assetId: AssetId): string {
  const entry = localImageAssets[assetId];
  return entry?.mimeType ?? `image/jpeg`; // Default to JPEG if not found
}

/**
 * Convert a local image asset to base64 with MIME type.
 * Handles both React Native and Web environments.
 */
export async function getLocalImageAssetBase64(
  assetId: AssetId,
): Promise<{ data: string; mimeType: string } | undefined> {
  if (!isLocalImageAssetId(assetId)) {
    return undefined;
  }

  // Check cache first
  if (localImageBase64Cache.has(assetId)) {
    return localImageBase64Cache.get(assetId);
  }

  try {
    const source = await getLocalImageAssetSource(assetId);
    if (source == null) {
      return undefined;
    }

    // Get URI from the resolved asset source
    let uri: string | undefined;
    if (typeof Image.resolveAssetSource === `function`) {
      const resolved = Image.resolveAssetSource(
        source as Parameters<typeof Image.resolveAssetSource>[0],
      );
      uri = resolved.uri;
    } else if (typeof source === `string`) {
      uri = source;
    } else if (
      typeof source === `object` &&
      source != null &&
      `uri` in source &&
      typeof (source as { uri?: unknown }).uri === `string`
    ) {
      uri = (source as { uri: string }).uri;
    }

    if (uri == null) {
      return undefined;
    }

    // Fetch the image and convert to base64
    const response = await fetch(uri);
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Convert to base64
    let binary = ``;
    for (let i = 0; i < bytes.byteLength; i++) {
      const byte = bytes[i];
      if (byte !== undefined) {
        binary += String.fromCodePoint(byte);
      }
    }
    const base64Data =
      typeof btoa === `function`
        ? btoa(binary)
        : Buffer.from(binary, `binary`).toString(`base64`);

    const mimeType = getMimeTypeForAssetId(assetId);
    const result = { data: base64Data, mimeType };

    // Cache the result
    localImageBase64Cache.set(assetId, result);

    return result;
  } catch (error) {
    console.error(`Failed to convert image asset to base64:`, assetId, error);
    return undefined;
  }
}

/**
 * List all available local image assets.
 */
export const getAvailableLocalImageAssets = memoize0(
  (): ReadonlyArray<AssetId> => {
    return Object.keys(localImageAssets) as unknown as ReadonlyArray<AssetId>;
  },
);

export function __setLocalImageAssetLoaderForTesting(
  assetId: AssetId,
  loader: LocalImageLoader,
): void {
  const entry = localImageAssets[assetId];
  if (entry != null) {
    entry.loader = loader;
  }
}

export function __resetLocalImageAssetCachesForTesting(): void {
  localImageAssetCache.clear();
  localImageBase64Cache.clear();
}
