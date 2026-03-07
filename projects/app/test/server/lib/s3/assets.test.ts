import {
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
  resolveAssetIdToBase64,
} from "#server/lib/s3/assets.ts";
import { beforeEach, describe, expect, test, vi } from "vitest";

vi.mock(`#server/lib/s3/client.ts`, () => ({
  getAssetsS3Client: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock(`@aws-sdk/s3-request-presigner`, () => ({
  getSignedUrl: vi.fn().mockResolvedValue(`https://example.com/presigned-url`),
}));

vi.mock(`#util/env.ts`, () => ({
  assetsS3Bucket: `test-bucket`,
}));

describe(
  `createPresignedUploadUrl` satisfies HasNameOf<
    typeof createPresignedUploadUrl
  >,
  () => {
    test(`throws error for file size exceeding maximum`, async () => {
      await expect(
        createPresignedUploadUrl({
          assetId: `sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
          contentType: `image/jpeg`,
          contentLength: MAX_ASSET_SIZE_BYTES + 1,
        }),
      ).rejects.toThrow(/exceeds maximum/);
    });

    test(`throws error for invalid content type`, async () => {
      await expect(
        createPresignedUploadUrl({
          assetId: `sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
          // @ts-expect-error Testing invalid content type
          contentType: `application/pdf`,
          contentLength: 1024,
        }),
      ).rejects.toThrow(/is not allowed/);
    });

    test(`accepts valid parameters`, async () => {
      const result = await createPresignedUploadUrl({
        assetId: `sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
        contentType: `image/jpeg`,
        contentLength: 1024,
      });

      expect(result).toHaveProperty(`uploadUrl`);
      expect(result).toHaveProperty(`assetKey`);
      expect(result.assetKey).toBe(
        `blob/sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
      );
    });
  },
);

describe(
  `resolveAssetIdToBase64 suite` satisfies HasNameOf<
    typeof resolveAssetIdToBase64
  >,
  () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    test(`throws when asset cannot be resolved from database`, async () => {
      const tx = {
        query: {
          asset: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      };

      await expect(
        resolveAssetIdToBase64(`sha256/missing-asset-id` as never, tx as never),
      ).rejects.toThrow(`Asset not found`);
    });
  },
);
