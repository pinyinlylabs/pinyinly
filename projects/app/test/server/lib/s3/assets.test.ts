import {
  assetIdSchema,
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
} from "#server/lib/s3/assets.ts";
import { describe, expect, test, vi } from "vitest";

describe(`assetIdSchema`, () => {
  test(`accepts valid sha256 base64url asset IDs`, () => {
    // Each hash must be exactly 43 characters
    const validIds = [
      `sha256/${`a`.repeat(43)}`,
      `sha256/${`0123456789`.repeat(4) + `012`}`, // 43 chars
      `sha256/${`abc`.repeat(14) + `a`}`, // 43 chars
      `sha256/${`_`.repeat(43)}`,
      `sha256/${`-`.repeat(43)}`,
    ];

    for (const id of validIds) {
      const result = assetIdSchema.safeParse(id);
      if (!result.success) {
        console.error(`Failed for id: ${id}`, result.error);
      }
      expect(result.success).toBe(true);
    }
  });

  test(`rejects asset IDs with wrong prefix`, () => {
    const result = assetIdSchema.safeParse(
      `sha512/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO`,
    );
    expect(result.success).toBe(false);
  });

  test(`rejects asset IDs with missing prefix`, () => {
    const result = assetIdSchema.safeParse(
      `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO`,
    );
    expect(result.success).toBe(false);
  });

  test(`rejects asset IDs with wrong hash length`, () => {
    // Too short
    expect(
      assetIdSchema.safeParse(`sha256/abcdefghijklmnopqrstuvwxyz`).success,
    ).toBe(false);

    // Too long
    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRST`,
      ).success,
    ).toBe(false);
  });

  test(`rejects asset IDs with invalid base64url characters`, () => {
    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz+BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);

    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz/BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);

    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz=BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);
  });

  test(`rejects empty string`, () => {
    expect(assetIdSchema.safeParse(``).success).toBe(false);
  });
});

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

  test(`throws error for invalid asset ID format`, async () => {
    await expect(
      createPresignedUploadUrl({
        assetId: `invalid-id`,
        contentType: `image/jpeg`,
        contentLength: 1024,
      }),
    ).rejects.toThrow(/Invalid asset ID format/);
  });

  test(`throws error for asset ID without sha256 prefix`, async () => {
    await expect(
      createPresignedUploadUrl({
        assetId: `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO`,
        contentType: `image/jpeg`,
        contentLength: 1024,
      }),
    ).rejects.toThrow(/Invalid asset ID format/);
  });

  test(`throws error for asset ID with wrong hash length`, async () => {
    await expect(
      createPresignedUploadUrl({
        assetId: `sha256/tooshort`,
        contentType: `image/jpeg`,
        contentLength: 1024,
      }),
    ).rejects.toThrow(/Invalid asset ID format/);
  });

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
