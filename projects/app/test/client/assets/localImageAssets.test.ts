import type { LocalImageAssetId } from "#client/assets/localImageAssets.ts";
import {
  __resetLocalImageAssetCachesForTesting,
  __setLocalImageAssetLoaderForTesting,
  getAvailableLocalImageAssets,
  getLocalImageAssetBase64,
  getLocalImageAssetSource,
  isLocalImageAssetId,
} from "#client/assets/localImageAssets.ts";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Mock react-native Image module
vi.mock(`react-native`, () => ({
  Image: {
    resolveAssetSource: vi.fn((source: unknown) => {
      if (typeof source === `object` && source != null && `uri` in source) {
        return source;
      }
      return { uri: ``, width: 0, height: 0 };
    }),
  },
}));

// Define mock asset data
const mockAssets: Record<string, { data: string; mimeType: string }> = {
  "app:illustration:edge": {
    data: `/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=`,
    mimeType: `image/jpeg`,
  },
  "wiki:学:child": {
    data: `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
    mimeType: `image/png`,
  },
  "wiki:看:meaning": {
    data: `/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=`,
    mimeType: `image/jpeg`,
  },
  "wiki:福:meaning": {
    data: `UklGRiYAAABXRUJQVlA4IBIAAADwAQCdASoBAAEAwUUgGZAEP/3+AAD++P7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+`,
    mimeType: `image/webp`,
  },
  "wiki:原:meaning": {
    data: `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
    mimeType: `image/png`,
  },
  "wiki:坏:meaning": {
    data: `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
    mimeType: `image/png`,
  },
};

// Helper function to create mock blobs
function createMockBlob(assetData: { data: string; mimeType: string }): Blob {
  const buffer = Buffer.from(assetData.data, `base64`);
  const bytes = new Uint8Array(buffer);
  return new Blob([bytes], { type: assetData.mimeType });
}

describe(`localImageAssets suite`, () => {
  const mockSources: Record<LocalImageAssetId, { uri: string }> = {
    "app:illustration:edge": { uri: `mock://app:illustration:edge` },
    "wiki:学:child": { uri: `mock://wiki:学:child` },
    "wiki:看:meaning": { uri: `mock://wiki:看:meaning` },
    "wiki:福:meaning": { uri: `mock://wiki:福:meaning` },
    "wiki:原:meaning": { uri: `mock://wiki:原:meaning` },
    "wiki:坏:meaning": { uri: `mock://wiki:坏:meaning` },
  };

  beforeEach(() => {
    __resetLocalImageAssetCachesForTesting();
    for (const assetId of Object.keys(mockSources)) {
      const source = mockSources[assetId];
      __setLocalImageAssetLoaderForTesting(assetId, async () => source);
    }

    // Mock fetch to return blob data for URIs
    global.fetch = vi.fn(
      async (input: RequestInfo | URL): Promise<Response> => {
        let uriString: string;
        if (typeof input === `string`) {
          uriString = input;
        } else if (input instanceof URL) {
          uriString = input.href;
        } else if (input instanceof Request) {
          uriString = input.url;
        } else {
          uriString = ``;
        }

        // Find matching mock asset from URI
        for (const [assetId, assetData] of Object.entries(mockAssets)) {
          if (uriString.includes(assetId)) {
            const blob = createMockBlob(assetData);
            return new Response(blob);
          }
        }

        throw new Error(`No mock asset found for URI: ${uriString}`);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe(`isLocalImageAssetId`, () => {
    test(`returns true for valid asset IDs`, () => {
      expect(isLocalImageAssetId(`app:illustration:edge`)).toBe(true);
      expect(isLocalImageAssetId(`wiki:学:child`)).toBe(true);
      expect(isLocalImageAssetId(`wiki:看:meaning`)).toBe(true);
    });

    test(`returns false for invalid asset IDs`, () => {
      expect(isLocalImageAssetId(`invalid:asset:id`)).toBe(false);
      expect(isLocalImageAssetId(`nonexistent`)).toBe(false);
      expect(isLocalImageAssetId(`wiki:notreal:image`)).toBe(false);
    });
  });

  describe(`getAvailableLocalImageAssets`, () => {
    test(`returns array of available asset IDs`, () => {
      const assets = getAvailableLocalImageAssets();
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBeGreaterThan(0);
      // Check for known assets
      expect(assets).toContain(`app:illustration:edge`);
      expect(assets).toContain(`wiki:学:child`);
    });

    test(`all returned IDs are valid`, () => {
      const assets = getAvailableLocalImageAssets();
      for (const assetId of assets) {
        expect(isLocalImageAssetId(assetId)).toBe(true);
      }
    });
  });

  describe(`getLocalImageAssetSource`, () => {
    test(`returns undefined for invalid asset ID`, async () => {
      // oxlint-disable-next-line typescript-eslint/no-unsafe-assignment
      const result = await getLocalImageAssetSource(`invalid:asset`);
      expect(result).toBeUndefined();
    });

    test(`returns source for valid asset ID`, async () => {
      const result = (await getLocalImageAssetSource(
        `app:illustration:edge`,
      )) as { uri: string } | undefined;
      expect(result).toEqual(mockSources[`app:illustration:edge`]);
    });

    test(`caches asset source on subsequent calls`, async () => {
      const loaderSpy = vi.fn(async () => mockSources[`wiki:学:child`]);
      __setLocalImageAssetLoaderForTesting(`wiki:学:child`, loaderSpy);

      const first = (await getLocalImageAssetSource(`wiki:学:child`)) as
        | { uri: string }
        | undefined;
      const second = (await getLocalImageAssetSource(`wiki:学:child`)) as
        | { uri: string }
        | undefined;

      expect(first).toEqual(mockSources[`wiki:学:child`]);
      expect(second).toEqual(mockSources[`wiki:学:child`]);
      expect(loaderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe(`getLocalImageAssetBase64`, () => {
    test(`returns undefined for invalid asset ID`, async () => {
      const result = await getLocalImageAssetBase64(`invalid:asset`);
      expect(result).toBeUndefined();
    });

    test(`returns base64 data with MIME type for valid asset`, async () => {
      const result = await getLocalImageAssetBase64(`app:illustration:edge`);
      expect(result).toEqual(mockAssets[`app:illustration:edge`]);
    });

    test(`returns correct MIME type for PNG assets`, async () => {
      const result = await getLocalImageAssetBase64(`wiki:学:child`);
      expect(result?.mimeType).toBe(`image/png`);
    });

    test(`returns correct MIME type for JPEG assets`, async () => {
      const result = await getLocalImageAssetBase64(`wiki:看:meaning`);
      expect(result?.mimeType).toBe(`image/jpeg`);
    });

    test(`returns correct MIME type for WebP assets`, async () => {
      const result = await getLocalImageAssetBase64(`wiki:福:meaning`);
      expect(result?.mimeType).toBe(`image/webp`);
    });

    test(`caches base64 data on subsequent calls`, async () => {
      const fetchSpy = vi.spyOn(global, `fetch`);
      const first = await getLocalImageAssetBase64(`wiki:原:meaning`);
      const second = await getLocalImageAssetBase64(`wiki:原:meaning`);

      expect(first).toEqual(mockAssets[`wiki:原:meaning`]);
      expect(second).toEqual(mockAssets[`wiki:原:meaning`]);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns valid base64 that can be used in data URL`, async () => {
      const result = await getLocalImageAssetBase64(`wiki:坏:meaning`);
      expect(result?.data.length).toBeGreaterThan(0);
      expect(result?.mimeType.startsWith(`image/`)).toBe(true);
    });

    test(`handles missing assets gracefully without throwing`, async () => {
      const result = await getLocalImageAssetBase64(`nonexistent:asset:id`);
      expect(result).toBeUndefined();
    });
  });
});
