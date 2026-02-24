import type { AssetId } from "#data/model.ts";
import type { removeBackgroundFromImage } from "#server/lib/openai/client.ts";
import * as env from "#util/env.ts";
import { describe, expect, test, vi } from "vitest";

// Minimal valid PNG base64 (1x1 transparent pixel)
const mockPngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

describe.skipIf(env.openaiApiKey == null)(
  `removeBackgroundFromImage integration suite` satisfies HasNameOf<
    typeof removeBackgroundFromImage
  >,
  () => {
    test(
      `removes background from image via OpenAI API`,
      { timeout: 30000 },
      async () => {
        vi.doUnmock(`openai`);
        vi.doUnmock(`#server/lib/openai/client.ts`);
        vi.doUnmock(`#server/lib/s3/assets.ts`);
        vi.doUnmock(`#util/env.ts`);
        vi.resetModules();

        const { removeBackgroundFromImage: removeBackgroundFromImageReal } =
          await import(`#server/lib/openai/client.ts`);
        const s3Module = await import(`#server/lib/s3/assets.ts`);

        // Mock only the S3 asset fetching to return a local test image
        vi.spyOn(s3Module, `fetchAssetBuffer`).mockResolvedValue(
          Buffer.from(mockPngBase64, `base64`),
        );

        // Hardcoded test asset ID for integration testing
        const testAssetIdString: AssetId =
          `sha256/${`a`.repeat(43)}` as AssetId;

        const result = await removeBackgroundFromImageReal(testAssetIdString);

        expect(result.buffer).toBeInstanceOf(ArrayBuffer);
        expect(result.buffer.byteLength).toBeGreaterThan(0);
        expect(result.mimeType).toBe(`image/png`);
      },
    );
  },
);
