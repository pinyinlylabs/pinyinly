import * as imageModule from "#server/lib/image.ts";
import {
  createPresignedUploadUrl,
  fetchAssetBase64,
  MAX_ASSET_SIZE_BYTES,
} from "#server/lib/s3/assets.ts";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mockS3Send = vi.fn();

vi.mock(`#server/lib/s3/client.ts`, () => ({
  getAssetsS3Client: vi.fn(() => ({
    send: mockS3Send,
  })),
}));

vi.mock(`@aws-sdk/s3-request-presigner`, () => ({
  getSignedUrl: vi.fn().mockResolvedValue(`https://example.com/presigned-url`),
}));

vi.mock(`#util/env.ts`, () => ({
  assetsS3Bucket: `test-bucket`,
}));

vi.mock(`#server/lib/image.ts`, () => ({
  sniffImageMimeTypeFromBuffer: vi.fn(),
}));

const mockSniffImageMimeType = vi.mocked(
  imageModule.sniffImageMimeTypeFromBuffer,
);

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
  `fetchAssetBase64 suite` satisfies HasNameOf<typeof fetchAssetBase64>,
  () => {
    beforeEach(() => {
      vi.restoreAllMocks();
      mockS3Send.mockReset();
      mockSniffImageMimeType.mockReset();
    });

    test(`uses sniffImageMimeTypeFromBuffer to detect mime type`, async () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      mockS3Send.mockResolvedValueOnce({ Body: [buffer] });
      mockSniffImageMimeType.mockReturnValueOnce(`image/png`);

      const result = await fetchAssetBase64(`sha256/test-asset-id` as never);

      expect(mockSniffImageMimeType).toHaveBeenCalledWith(buffer);
      expect(result.mimeType).toBe(`image/png`);
      expect(result.data).toBe(buffer.toString(`base64`));
    });

    test(`throws when sniffImageMimeTypeFromBuffer returns null`, async () => {
      mockS3Send.mockResolvedValueOnce({
        Body: [Buffer.from([0x00, 0x11, 0x22])],
      });
      mockSniffImageMimeType.mockReturnValueOnce(null);

      await expect(
        fetchAssetBase64(`sha256/unknown-asset-id` as never),
      ).rejects.toThrow(`Unsupported or unrecognized image format`);
    });
  },
);
