import {
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
} from "#server/lib/s3/assets.ts";
import { describe, expect, test, vi } from "vitest";

describe(`createPresignedUploadUrl`, () => {
  // Mock the S3 client and related functions
  vi.mock(`#server/lib/s3/client.ts`, () => ({
    getAssetsS3Client: vi.fn(() => ({
      send: vi.fn().mockResolvedValue({}),
    })),
  }));

  vi.mock(`@aws-sdk/s3-request-presigner`, () => ({
    getSignedUrl: vi
      .fn()
      .mockResolvedValue(`https://example.com/presigned-url`),
  }));

  vi.mock(`#util/env.ts`, () => ({
    assetsS3Bucket: `test-bucket`,
  }));

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
});
