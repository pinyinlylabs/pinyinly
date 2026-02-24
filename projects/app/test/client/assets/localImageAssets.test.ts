import {
  __resetLocalImageAssetCachesForTesting,
  __setLocalImageAssetLoaderForTesting,
  getAvailableLocalImageAssets,
  getLocalImageAssetBase64,
  getLocalImageAssetSource,
  isLocalImageAssetId,
} from "#client/assets/localImageAssets.ts";
import type { AssetId } from "#data/model.js";
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
const mockAssets: Record<AssetId, { data: string; mimeType: string }> = {
  "sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM": {
    data: `/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=`,
    mimeType: `image/jpeg`,
  },
  "sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw": {
    data: `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
    mimeType: `image/png`,
  },
  "sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU": {
    data: `/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=`,
    mimeType: `image/jpeg`,
  },
  "sha256/mr1f6r5rfHjtXhXJd7o8plSn3E7hnq9yvip22GMPy2w": {
    data: `UklGRiYAAABXRUJQVlA4IBIAAADwAQCdASoBAAEAwUUgGZAEP/3+AAD++P7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+`,
    mimeType: `image/webp`,
  },
  "sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug": {
    data: `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
    mimeType: `image/png`,
  },
  "sha256/llztsum5npSYNprvTIkrJDt2D5nSTTMfkPI68gWxw1A": {
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
  const mockSources: Record<AssetId, { uri: string }> = {
    "sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM": {
      uri: `mock://sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM`,
    },
    "sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw": {
      uri: `mock://sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
    },
    "sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU": {
      uri: `mock://sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU`,
    },
    "sha256/mr1f6r5rfHjtXhXJd7o8plSn3E7hnq9yvip22GMPy2w": {
      uri: `mock://sha256/mr1f6r5rfHjtXhXJd7o8plSn3E7hnq9yvip22GMPy2w`,
    },
    "sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug": {
      uri: `mock://sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug`,
    },
    "sha256/llztsum5npSYNprvTIkrJDt2D5nSTTMfkPI68gWxw1A": {
      uri: `mock://sha256/llztsum5npSYNprvTIkrJDt2D5nSTTMfkPI68gWxw1A`,
    },
  };

  beforeEach(() => {
    __resetLocalImageAssetCachesForTesting();
    for (const assetId of Object.keys(mockSources) as AssetId[]) {
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
      expect(
        isLocalImageAssetId(
          `sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM`,
        ),
      ).toBe(true);
      expect(
        isLocalImageAssetId(
          `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
        ),
      ).toBe(true);
      expect(
        isLocalImageAssetId(
          `sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU`,
        ),
      ).toBe(true);
    });
  });

  describe(`getAvailableLocalImageAssets`, () => {
    test(`returns array of available asset IDs`, () => {
      const assets = getAvailableLocalImageAssets();
      expect(Array.isArray(assets)).toBe(true);
      expect(assets.length).toBeGreaterThan(0);
      // Check for known assets
      expect(assets).toContain(
        `sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM`,
      );
      expect(assets).toContain(
        `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
      );
    });

    test(`all returned IDs are valid`, () => {
      const assets = getAvailableLocalImageAssets();
      for (const assetId of assets) {
        expect(isLocalImageAssetId(assetId)).toBe(true);
      }
    });
  });

  describe(`getLocalImageAssetSource`, () => {
    test(`returns source for valid asset ID`, async () => {
      const result = (await getLocalImageAssetSource(
        `sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM`,
      )) as { uri: string } | undefined;
      expect(result).toEqual(
        mockSources[`sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM`],
      );
    });

    test(`caches asset source on subsequent calls`, async () => {
      const loaderSpy = vi.fn(
        async () =>
          mockSources[`sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`],
      );
      __setLocalImageAssetLoaderForTesting(
        `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
        loaderSpy,
      );

      const first = (await getLocalImageAssetSource(
        `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
      )) as { uri: string } | undefined;
      const second = (await getLocalImageAssetSource(
        `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
      )) as { uri: string } | undefined;

      expect(first).toEqual(
        mockSources[`sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`],
      );
      expect(second).toEqual(
        mockSources[`sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`],
      );
      expect(loaderSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe(`getLocalImageAssetBase64`, () => {
    test(`returns base64 data with MIME type for valid asset`, async () => {
      const result = await getLocalImageAssetBase64(
        `sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM`,
      );
      expect(result).toEqual(
        mockAssets[`sha256/SRyYDLFWSOWMwUgJk29w9AxsInv51FOJgfZLpoQ1qbM`],
      );
    });

    test(`returns correct MIME type for PNG assets`, async () => {
      const result = await getLocalImageAssetBase64(
        `sha256/PsFS7XP1JXH0cs69_Fw0j_7juNrv_rmaFltdpJjXcNw`,
      );
      expect(result?.mimeType).toBe(`image/png`);
    });

    test(`returns correct MIME type for JPEG assets`, async () => {
      const result = await getLocalImageAssetBase64(
        `sha256/zZ9fuhaI1zLOgsxM1ihp4OQ9wJY8Q29hkSgEOqMXqRU`,
      );
      expect(result?.mimeType).toBe(`image/jpeg`);
    });

    test(`returns correct MIME type for WebP assets`, async () => {
      const result = await getLocalImageAssetBase64(
        `sha256/mr1f6r5rfHjtXhXJd7o8plSn3E7hnq9yvip22GMPy2w`,
      );
      expect(result?.mimeType).toBe(`image/webp`);
    });

    test(`caches base64 data on subsequent calls`, async () => {
      const fetchSpy = vi.spyOn(global, `fetch`);
      const first = await getLocalImageAssetBase64(
        `sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug`,
      );
      const second = await getLocalImageAssetBase64(
        `sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug`,
      );

      expect(first).toEqual(
        mockAssets[`sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug`],
      );
      expect(second).toEqual(
        mockAssets[`sha256/tf64raCNkXcor6F8YHuf4xh6yOiCAiFMR3VrhiJwCug`],
      );
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns valid base64 that can be used in data URL`, async () => {
      const result = await getLocalImageAssetBase64(
        `sha256/llztsum5npSYNprvTIkrJDt2D5nSTTMfkPI68gWxw1A`,
      );
      expect(result?.data.length).toBeGreaterThan(0);
      expect(result?.mimeType.startsWith(`image/`)).toBe(true);
    });

    test(`handles missing assets gracefully without throwing`, async () => {
      const result = await getLocalImageAssetBase64(`sha256/foo`);
      expect(result).toBeUndefined();
    });
  });
});
