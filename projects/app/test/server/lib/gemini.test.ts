import { generateImage } from "#server/lib/gemini.ts";
import { beforeEach, describe, expect, test, vi } from "vitest";

type MockStream = AsyncIterable<{
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
}>;

const { mockGenerateContentStream } = vi.hoisted(() => {
  return {
    mockGenerateContentStream: vi.fn<(...args: unknown[]) => MockStream>(),
  };
});

vi.mock(`@google/genai`, () => {
  return {
    GoogleGenAI: class GoogleGenAI {
      models = {
        generateContentStream: (...args: unknown[]) =>
          mockGenerateContentStream(...args),
      };

      constructor() {
        // no-op
      }
    },
  };
});

const hasApiKey =
  typeof process.env[`PYLY_GEMINI_IMAGE_API_KEY`] === `string` &&
  process.env[`PYLY_GEMINI_IMAGE_API_KEY`]?.length > 0;

const mockResponseBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
const mockResponseMimeType = `image/png`;

async function* createMockStream() {
  yield {
    candidates: [
      {
        content: {
          parts: [
            {
              inlineData: {
                data: mockResponseBase64,
                mimeType: mockResponseMimeType,
              },
            },
          ],
        },
      },
    ],
  };
}

describe(
  `generateImage suite` satisfies HasNameOf<typeof generateImage>,
  () => {
    beforeEach(() => {
      mockGenerateContentStream.mockReset();
      mockGenerateContentStream.mockImplementation(() => createMockStream());
    });

    test(`returns image data from text prompt`, async () => {
      const result = await generateImage({
        prompt: `A bright red apple on a wooden table, studio lighting`,
      });

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        model: `gemini-2.5-flash-image`,
        config: {
          responseModalities: [`IMAGE`, `TEXT`],
        },
        contents: [
          {
            role: `user`,
            parts: [
              { text: `A bright red apple on a wooden table, studio lighting` },
            ],
          },
        ],
      });
    });

    test(`returns image data with style image`, async () => {
      // Create a minimal valid PNG base64 (1x1 transparent pixel)
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
      const styleImageData = `image/png;base64,${pngBase64}`;

      const result = await generateImage({
        prompt: `A bright red apple on a wooden table, studio lighting`,
        styleImageData,
      });

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        model: `gemini-2.5-flash-image`,
        config: {
          responseModalities: [`IMAGE`, `TEXT`],
        },
        contents: [
          {
            role: `user`,
            parts: [
              {
                inlineData: {
                  mimeType: `image/png`,
                  data: pngBase64,
                },
              },
              { text: `A bright red apple on a wooden table, studio lighting` },
            ],
          },
        ],
      });
    });

    test(`handles style image with JPEG format`, async () => {
      // Minimal valid JPEG base64 (1x1 pixel)
      const jpegBase64 = `/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=`;
      const styleImageData = `image/jpeg;base64,${jpegBase64}`;

      const result = await generateImage({
        prompt: `A bright red apple on a wooden table, studio lighting`,
        styleImageData,
      });

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        model: `gemini-2.5-flash-image`,
        config: {
          responseModalities: [`IMAGE`, `TEXT`],
        },
        contents: [
          {
            role: `user`,
            parts: [
              {
                inlineData: {
                  mimeType: `image/jpeg`,
                  data: jpegBase64,
                },
              },
              { text: `A bright red apple on a wooden table, studio lighting` },
            ],
          },
        ],
      });
    });

    test(`throws error for malformed style image data`, async () => {
      const invalidStyleData = `not-a-valid-format`;

      await expect(
        generateImage({
          prompt: `A test prompt`,
          styleImageData: invalidStyleData,
        }),
      ).rejects.toThrow(`Invalid style image data format`);
    });

    test(`throws error for missing base64 in style image data`, async () => {
      const invalidStyleData = `image/png;data,xyz`;

      await expect(
        generateImage({
          prompt: `A test prompt`,
          styleImageData: invalidStyleData,
        }),
      ).rejects.toThrow(`Invalid style image data format`);
    });

    test(`properly separates mime type from base64 data`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
      const styleImageData = `image/webp;base64,${pngBase64}`;

      const result = await generateImage({
        prompt: `A test prompt`,
        styleImageData,
      });

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        model: `gemini-2.5-flash-image`,
        config: {
          responseModalities: [`IMAGE`, `TEXT`],
        },
        contents: [
          {
            role: `user`,
            parts: [
              {
                inlineData: {
                  mimeType: `image/webp`,
                  data: pngBase64,
                },
              },
              { text: `A test prompt` },
            ],
          },
        ],
      });
    });
  },
);

describe.skipIf(!hasApiKey)(
  `generateImage integration suite` satisfies HasNameOf<typeof generateImage>,
  () => {
    test(
      `returns image data from the Gemini API`,
      { timeout: 20000 },
      async () => {
        vi.doUnmock(`@google/genai`);
        vi.resetModules();
        const { generateImage: generateImageReal } = await import(
          `#server/lib/gemini.ts`
        );

        const result = await generateImageReal({
          prompt: `A bright red apple on a wooden table, studio lighting`,
        });

        expect(result.buffer.length).toBeGreaterThan(0);
        expect(result.mimeType.startsWith(`image/`)).toBe(true);
      },
    );

    test(
      `returns image data with a style image from the Gemini API`,
      { timeout: 20000 },
      async () => {
        vi.doUnmock(`@google/genai`);
        vi.resetModules();
        const { generateImage: generateImageReal } = await import(
          `#server/lib/gemini.ts`
        );

        const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
        const styleImageData = `image/png;base64,${pngBase64}`;

        const result = await generateImageReal({
          prompt: `A bright red apple on a wooden table, studio lighting`,
          styleImageData,
        });

        expect(result.buffer.length).toBeGreaterThan(0);
        expect(result.mimeType.startsWith(`image/`)).toBe(true);
      },
    );
  },
);
