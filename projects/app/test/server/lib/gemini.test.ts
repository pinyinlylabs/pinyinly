import type { AiReferenceImage } from "#data/model.ts";
import type { ImagePrompt } from "#server/lib/gemini.ts";
import type { GeminiImageAspectRatio } from "#util/geminiImageAspectRatio.ts";
import { requestGeminiImage } from "#server/lib/gemini.ts";
import * as env from "#util/env.ts";
import * as genai from "@google/genai";
import { beforeEach, describe, expect, test, vi } from "vitest";

function buildImagePromptFromText({
  prompt,
  referenceImages,
  aspectRatio,
}: {
  prompt: string;
  referenceImages?: AiReferenceImage[];
  aspectRatio?: GeminiImageAspectRatio;
}): ImagePrompt {
  return {
    model: `gemini-2.5-flash-image` as const,
    messages: [{ role: `user` as const, content: prompt }],
    ...(referenceImages == null ? {} : { referenceImages }),
    ...(aspectRatio == null ? {} : { aspectRatio }),
  };
}

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
  `requestGeminiImage suite` satisfies HasNameOf<typeof requestGeminiImage>,
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
      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A bright red apple on a wooden table, studio lighting`,
        }),
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "imageConfig": {
                "aspectRatio": undefined,
              },
              "responseModalities": [
                "IMAGE",
              ],
            },
            "contents": [
              {
                "parts": [
                  {
                    "text": "A bright red apple on a wooden table, studio lighting",
                  },
                ],
                "role": "user",
              },
            ],
            "model": "gemini-2.5-flash-image",
          },
        ]
      `);
    });

    test(`includes aspect ratio in the request config`, async () => {
      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A bright red apple on a wooden table, studio lighting`,
          aspectRatio: `1:1`,
        }),
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "imageConfig": {
                "aspectRatio": "1:1",
              },
              "responseModalities": [
                "IMAGE",
              ],
            },
            "contents": [
              {
                "parts": [
                  {
                    "text": "A bright red apple on a wooden table, studio lighting",
                  },
                ],
                "role": "user",
              },
            ],
            "model": "gemini-2.5-flash-image",
          },
        ]
      `);
    });

    test(`maps resolution and thinking level from ImagePrompt`, async () => {
      const result = await requestGeminiImage({
        model: `gemini-2.5-flash-image`,
        systemInstruction: `Render a highly legible, clean scene.`,
        messages: [
          {
            role: `user`,
            content: `A bright red apple on a wooden table, studio lighting`,
          },
        ],
        aspectRatio: `1:1`,
        resolution: `1K`,
        thinkingLevel: `high`,
      });

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "imageConfig": {
                "aspectRatio": "1:1",
                "imageSize": "1K",
              },
              "responseModalities": [
                "IMAGE",
              ],
              "systemInstruction": "Render a highly legible, clean scene.",
              "thinkingConfig": {
                "thinkingLevel": "HIGH",
              },
            },
            "contents": [
              {
                "parts": [
                  {
                    "text": "A bright red apple on a wooden table, studio lighting",
                  },
                ],
                "role": "user",
              },
            ],
            "model": "gemini-2.5-flash-image",
          },
        ]
      `);
    });

    test(`forwards selected model from ImagePrompt`, async () => {
      await requestGeminiImage({
        model: `gemini-3.1-flash-lite-image`,
        messages: [{ role: `user`, content: `A watercolor city skyline` }],
      });

      const callArgs = mockGenerateContentStream.mock.calls.at(-1)?.[0] as {
        model: string;
      };
      expect(callArgs.model).toBe(`gemini-3.1-flash-lite-image`);
    });

    test(`returns image data with style image`, async () => {
      // Create a minimal valid PNG base64 (1x1 transparent pixel)
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A bright red apple on a wooden table, studio lighting`,
          referenceImages: [
            {
              label: `style`,
              data: pngBase64,
              mimeType: `image/png`,
            },
          ],
        }),
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "imageConfig": {
                "aspectRatio": undefined,
              },
              "responseModalities": [
                "IMAGE",
              ],
            },
            "contents": [
              {
                "parts": [
                  {
                    "text": "style:",
                  },
                  {
                    "inlineData": {
                      "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                      "mimeType": "image/png",
                    },
                  },
                  {
                    "text": "A bright red apple on a wooden table, studio lighting",
                  },
                ],
                "role": "user",
              },
            ],
            "model": "gemini-2.5-flash-image",
          },
        ]
      `);
    });

    test(`handles style image with JPEG format`, async () => {
      // Minimal valid JPEG base64 (1x1 pixel)
      const jpegBase64 = `/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=`;

      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A bright red apple on a wooden table, studio lighting`,
          referenceImages: [
            {
              label: `style`,
              data: jpegBase64,
              mimeType: `image/jpeg`,
            },
          ],
        }),
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "imageConfig": {
                "aspectRatio": undefined,
              },
              "responseModalities": [
                "IMAGE",
              ],
            },
            "contents": [
              {
                "parts": [
                  {
                    "text": "style:",
                  },
                  {
                    "inlineData": {
                      "data": "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8VAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=",
                      "mimeType": "image/jpeg",
                    },
                  },
                  {
                    "text": "A bright red apple on a wooden table, studio lighting",
                  },
                ],
                "role": "user",
              },
            ],
            "model": "gemini-2.5-flash-image",
          },
        ]
      `);
    });

    test(`properly separates mime type from base64 data`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A test prompt`,
          referenceImages: [
            {
              label: `style`,
              data: pngBase64,
              mimeType: `image/webp`,
            },
          ],
        }),
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "imageConfig": {
                "aspectRatio": undefined,
              },
              "responseModalities": [
                "IMAGE",
              ],
            },
            "contents": [
              {
                "parts": [
                  {
                    "text": "style:",
                  },
                  {
                    "inlineData": {
                      "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                      "mimeType": "image/webp",
                    },
                  },
                  {
                    "text": "A test prompt",
                  },
                ],
                "role": "user",
              },
            ],
            "model": "gemini-2.5-flash-image",
          },
        ]
      `);
    });

    test(`includes reference images in the request`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A beautiful landscape`,
          referenceImages: [
            {
              label: `sunset`,
              data: pngBase64,
              mimeType: `image/png`,
            },
          ],
        }),
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(mockGenerateContentStream.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "imageConfig": {
                "aspectRatio": undefined,
              },
              "responseModalities": [
                "IMAGE",
              ],
            },
            "contents": [
              {
                "parts": [
                  {
                    "text": "sunset:",
                  },
                  {
                    "inlineData": {
                      "data": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                      "mimeType": "image/png",
                    },
                  },
                  {
                    "text": "A beautiful landscape",
                  },
                ],
                "role": "user",
              },
            ],
            "model": "gemini-2.5-flash-image",
          },
        ]
      `);
    });

    test(`includes multiple reference images in the request`, async () => {
      const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A beautiful landscape with mountains`,
          referenceImages: [
            {
              label: `sunset`,
              data: pngBase64,
              mimeType: `image/png`,
            },
            {
              label: `mountain`,
              data: pngBase64,
              mimeType: `image/jpeg`,
            },
          ],
        }),
      );

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

      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A landscape in oil painting style`,
          referenceImages: [
            {
              label: `style`,
              data: pngBase64,
              mimeType: `image/png`,
            },
            {
              label: `reference`,
              data: pngBase64,
              mimeType: `image/png`,
            },
          ],
        }),
      );

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

      await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `Generate something similar`,
          referenceImages: [
            {
              label: `example1`,
              data: pngBase64,
              mimeType: `image/png`,
            },
            {
              label: `example2`,
              data: pngBase64,
              mimeType: `image/png`,
            },
          ],
        }),
      );

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

    test(`handles empty reference images array`, async () => {
      const result = await requestGeminiImage(
        buildImagePromptFromText({
          prompt: `A test prompt`,
          referenceImages: [],
        }),
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(mockGenerateContentStream.mock.lastCall).toMatchInlineSnapshot(`
        [
          {
            "config": {
              "imageConfig": {
                "aspectRatio": undefined,
              },
              "responseModalities": [
                "IMAGE",
              ],
            },
            "contents": [
              {
                "parts": [
                  {
                    "text": "A test prompt",
                  },
                ],
                "role": "user",
              },
            ],
            "model": "gemini-2.5-flash-image",
          },
        ]
      `);
    });
  },
);

describe.skipIf(env.geminiImageApiKey == null || true)(
  `requestGeminiImage integration suite` satisfies HasNameOf<
    typeof requestGeminiImage
  >,
  () => {
    test(
      `returns image data from the Gemini API`,
      { timeout: 30000 },
      async () => {
        vi.doUnmock(`@google/genai`);
        vi.doUnmock(`#util/env.ts`);
        vi.resetModules();
        const { requestGeminiImage: requestGeminiImageReal } = await import(
          `#server/lib/gemini.ts`
        );

        const result = await requestGeminiImageReal(
          buildImagePromptFromText({
            prompt: `A bright red apple on a wooden table, studio lighting`,
          }),
        );

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
        const { requestGeminiImage: requestGeminiImageReal } = await import(
          `#server/lib/gemini.ts`
        );

        const pngBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

        const result = await requestGeminiImageReal(
          buildImagePromptFromText({
            prompt: `A bright red apple on a wooden table, studio lighting`,
            referenceImages: [
              {
                label: `style`,
                data: pngBase64,
                mimeType: `image/png`,
              },
            ],
          }),
        );

        expect(result.buffer.length).toBeGreaterThan(0);
        expect(result.mimeType.startsWith(`image/`)).toBe(true);
      },
    );
  },
);
