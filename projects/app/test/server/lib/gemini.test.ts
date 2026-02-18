import { generateImage } from "#server/lib/gemini.ts";
import { describe, expect, test } from "vitest";

const hasApiKey =
  typeof process.env[`PYLY_GEMINI_IMAGE_API_KEY`] === `string` &&
  process.env[`PYLY_GEMINI_IMAGE_API_KEY`]?.length > 0;

describe.skipIf(!hasApiKey)(
  `generateImage suite` satisfies HasNameOf<typeof generateImage>,
  () => {
    test(`returns image data`, async () => {
      const result = await generateImage({
        prompt: `A bright red apple on a wooden table, studio lighting`,
      });

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
    });
  },
);
