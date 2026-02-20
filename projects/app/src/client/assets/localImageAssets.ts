import { memoize0 } from "@pinyinly/lib/collections";
import { Image } from "react-native";

// oxlint-disable eslint-plugin-import/no-commonjs, eslint-plugin-import/no-relative-parent-imports, typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-return

export type LocalImageLoader = () => Promise<RnRequireSource>;

type LocalImageAssetEntry = {
  ext: `png` | `jpg` | `jpeg` | `webp`;
  loader: LocalImageLoader;
};

const localImageAssets: Record<string, LocalImageAssetEntry> = {
  "app:illustration:edge": {
    ext: `jpg`,
    loader: async () => require(`../../assets/illustrations/edge.jpg`),
  },
  "wiki:学:child": {
    ext: `png`,
    loader: async () => require(`../wiki/学/child.png`),
  },
  "wiki:原:meaning": {
    ext: `png`,
    loader: async () => require(`../wiki/原/meaning.png`),
  },
  "wiki:坏:meaning": {
    ext: `png`,
    loader: async () => require(`../wiki/坏/meaning.png`),
  },
  "wiki:看:meaning": {
    ext: `jpg`,
    loader: async () => require(`../wiki/看/meaning.jpg`),
  },
  "wiki:福:meaning": {
    ext: `webp`,
    loader: async () => require(`../wiki/福/meaning.webp`),
  },
};

const localImageAssetCache = new Map<string, RnRequireSource>();
const localImageBase64Cache = new Map<
  string,
  { data: string; mimeType: string }
>();
// oxlint-enable eslint-plugin-import/no-commonjs, eslint-plugin-import/no-relative-parent-imports, typescript-eslint/no-unsafe-assignment, typescript-eslint/no-unsafe-return

export type LocalImageAssetId = keyof typeof localImageAssets;

export function isLocalImageAssetId(assetId: string): boolean {
  return assetId in localImageAssets;
}

export async function getLocalImageAssetSource(
  assetId: string,
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
function getMimeTypeForAssetId(assetId: LocalImageAssetId): string {
  const entry = localImageAssets[assetId];
  if (entry == null) {
    return `image/jpeg`; // Default fallback
  }

  if (entry.ext === `png`) {
    return `image/png`;
  }
  if (entry.ext === `webp`) {
    return `image/webp`;
  }
  if (entry.ext === `jpg` || entry.ext === `jpeg`) {
    return `image/jpeg`;
  }

  return `image/jpeg`;
}

/**
 * Convert a local image asset to base64 with MIME type.
 * Handles both React Native and Web environments.
 */
export async function getLocalImageAssetBase64(
  assetId: string,
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
  (): ReadonlyArray<LocalImageAssetId> => {
    return Object.keys(localImageAssets);
  },
);

export function __setLocalImageAssetLoaderForTesting(
  assetId: LocalImageAssetId,
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
