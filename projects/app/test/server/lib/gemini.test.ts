import { generateImage } from "#server/lib/gemini.ts";
import * as env from "#util/env.ts";
import * as genai from "@google/genai";
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

vi.mock(import(`@google/genai`));

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
      vi.clearAllMocks();

      vi.mocked(genai.GoogleGenAI).mockImplementation(function (this: unknown) {
        return {
          models: {
            generateContentStream: async (...args: unknown[]) =>
              mockGenerateContentStream(...args),
          },
        };
      });
      mockGenerateContentStream.mockImplementation(() => createMockStream());

      vi.spyOn(env, `geminiImageApiKey`, `get`).mockReturnValue(
        `mock-api-key-for-testing`,
      );
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

      const result = await generateImage({
        prompt: `A bright red apple on a wooden table, studio lighting`,
        referenceImages: [
          {
            label: `style`,
            imageData: `image/png;base64,${pngBase64}`,
          },
        ],
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
              { text: `style:` },
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

      const result = await generateImage({
        prompt: `A bright red apple on a wooden table, studio lighting`,
        referenceImages: [
          {
            label: `style`,
            imageData: `image/jpeg;base64,${jpegBase64}`,
          },
        ],
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
              { text: `style:` },
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
      await expect(
        generateImage({
          prompt: `A test prompt`,
          referenceImages: [
            {
              label: `style`,
              imageData: `not-a-valid-format`,
            },
          ],
        }),
      ).rejects.toThrow(
        `Invalid reference image data format for label "style"`,
      );
    });

    test(`throws error for missing base64 in style image data`, async () => {
      await expect(
        generateImage({
          prompt: `A test prompt`,
          referenceImages: [
            {
              label: `style`,
              imageData: `image/png;data,xyz`,
            },
          ],
        }),
      ).rejects.toThrow(
        `Invalid reference image data format for label "style"`,
      );
    });

    test(`properly separates mime type from base64 data`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      const result = await generateImage({
        prompt: `A test prompt`,
        referenceImages: [
          {
            label: `style`,
            imageData: `image/webp;base64,${pngBase64}`,
          },
        ],
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
              { text: `style:` },
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

    test(`includes reference images in the request`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      const result = await generateImage({
        prompt: `A beautiful landscape`,
        referenceImages: [
          {
            label: `sunset`,
            imageData: `image/png;base64,${pngBase64}`,
          },
        ],
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
              { text: `sunset:` },
              {
                inlineData: {
                  mimeType: `image/png`,
                  data: pngBase64,
                },
              },
              { text: `A beautiful landscape` },
            ],
          },
        ],
      });
    });

    test(`includes multiple reference images in the request`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      const result = await generateImage({
        prompt: `A beautiful landscape with mountains`,
        referenceImages: [
          {
            label: `sunset`,
            imageData: `image/png;base64,${pngBase64}`,
          },
          {
            label: `mountain`,
            imageData: `image/jpeg;base64,${pngBase64}`,
          },
        ],
      });

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);

      const callArgs = mockGenerateContentStream.mock.calls[0]?.[0] as {
        model: string;
        contents: Array<{ parts: unknown[] }>;
      };
      const firstContent = callArgs.contents[0];
      if (firstContent == null) {
        throw new Error(`Expected first content item to exist`);
      }
      const parts = firstContent.parts;
      expect(callArgs.model).toBe(`gemini-2.5-flash-image`);
      expect(parts).toHaveLength(5);
      expect(parts[0]).toEqual({
        text: `sunset:`,
      });
      expect(parts[1]).toEqual({
        inlineData: {
          mimeType: `image/png`,
          data: pngBase64,
        },
      });
      expect(parts[2]).toEqual({
        text: `mountain:`,
      });
      expect(parts[3]).toEqual({
        inlineData: {
          mimeType: `image/jpeg`,
          data: pngBase64,
        },
      });
      expect(parts[4]).toEqual({
        text: `A beautiful landscape with mountains`,
      });
    });

    test(`includes multiple reference images together`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      const result = await generateImage({
        prompt: `A landscape in oil painting style`,
        referenceImages: [
          {
            label: `style`,
            imageData: `image/png;base64,${pngBase64}`,
          },
          {
            label: `reference`,
            imageData: `image/png;base64,${pngBase64}`,
          },
        ],
      });

      expect(result.buffer.length).toBeGreaterThan(0);

      const callArgs = mockGenerateContentStream.mock.calls[0]?.[0] as {
        contents: Array<{ parts: unknown[] }>;
      };
      const firstContent = callArgs.contents[0];
      if (firstContent == null) {
        throw new Error(`Expected first content item to exist`);
      }
      const parts = firstContent.parts;
      expect(parts).toHaveLength(5);
      expect(parts[0]).toEqual({
        text: `style:`,
      });
      expect(parts[1]).toEqual({
        inlineData: {
          mimeType: `image/png`,
          data: pngBase64,
        },
      });
      expect(parts[2]).toEqual({
        text: `reference:`,
      });
      expect(parts[3]).toEqual({
        inlineData: {
          mimeType: `image/png`,
          data: pngBase64,
        },
      });
      expect(parts[4]).toEqual({
        text: `A landscape in oil painting style`,
      });
    });

    test(`places prompt text at the end when reference images are present`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      await generateImage({
        prompt: `Generate something similar`,
        referenceImages: [
          {
            label: `example1`,
            imageData: `image/png;base64,${pngBase64}`,
          },
          {
            label: `example2`,
            imageData: `image/png;base64,${pngBase64}`,
          },
        ],
      });

      const callArgs = mockGenerateContentStream.mock.calls[0]?.[0] as {
        contents: Array<{ parts: unknown[] }>;
      };
      const parts = callArgs.contents[0]?.parts ?? [];
      const lastPart = parts.at(-1);

      expect(parts).toHaveLength(5); // label, image, label, image, prompt
      expect(lastPart).toEqual({
        text: `Generate something similar`,
      });
    });

    test(`throws error for malformed reference image data`, async () => {
      await expect(
        generateImage({
          prompt: `A test prompt`,
          referenceImages: [
            {
              label: `bad-image`,
              imageData: `not-valid-format`,
            },
          ],
        }),
      ).rejects.toThrow(
        `Invalid reference image data format for label "bad-image"`,
      );
    });

    test(`throws error for reference image missing base64`, async () => {
      await expect(
        generateImage({
          prompt: `A test prompt`,
          referenceImages: [
            {
              label: `incomplete-image`,
              imageData: `image/png;data,xyz`,
            },
          ],
        }),
      ).rejects.toThrow(
        `Invalid reference image data format for label "incomplete-image"`,
      );
    });

    test(`handles empty reference images array`, async () => {
      const result = await generateImage({
        prompt: `A test prompt`,
        referenceImages: [],
      });

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(mockGenerateContentStream).toHaveBeenCalledWith({
        model: `gemini-2.5-flash-image`,
        config: {
          responseModalities: [`IMAGE`, `TEXT`],
        },
        contents: [
          {
            role: `user`,
            parts: [{ text: `A test prompt` }],
          },
        ],
      });
    });
  },
);

describe.skipIf(env.geminiImageApiKey == null)(
  `generateImage integration suite` satisfies HasNameOf<typeof generateImage>,
  () => {
    test(
      `returns image data from the Gemini API`,
      { timeout: 30000 },
      async () => {
        vi.doUnmock(`@google/genai`);
        vi.doUnmock(`#util/env.ts`);
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
        vi.doUnmock(`#util/env.ts`);
        vi.resetModules();
        const { generateImage: generateImageReal } = await import(
          `#server/lib/gemini.ts`
        );

        const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

        const result = await generateImageReal({
          prompt: `A bright red apple on a wooden table, studio lighting`,
          referenceImages: [
            {
              label: `style`,
              imageData: `image/png;base64,${pngBase64}`,
            },
          ],
        });

        expect(result.buffer.length).toBeGreaterThan(0);
        expect(result.mimeType.startsWith(`image/`)).toBe(true);
      },
    );
  },
);
