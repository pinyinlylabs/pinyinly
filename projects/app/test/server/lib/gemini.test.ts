import type { AssetId } from "#data/model.ts";
import type { ImagePrompt } from "#server/lib/gemini.ts";
import { createAssetFromBuffer } from "#server/lib/createAsset.ts";
import {
  requestGeminiImage,
  requestGeminiImageAsAsset,
} from "#server/lib/gemini.ts";
import * as assets from "#server/lib/s3/assets.ts";
import * as env from "#util/env.ts";
import * as genai from "@google/genai";
import { beforeEach, describe, expect, test, vi } from "vitest";

interface ReferenceEntry {
  label?: string;
  assetId: AssetId;
}

function buildImagePromptFromText(prompt: string): ImagePrompt {
  return {
    model: `gemini-2.5-flash-image`,
    messages: [{ role: `user`, kind: `text`, content: prompt }],
  };
}

function buildImagePromptWithReferenceMessages({
  prompt,
  references,
}: {
  prompt: string;
  references: ReferenceEntry[];
}): ImagePrompt {
  const messages: ImagePrompt[`messages`] = [];

  for (const reference of references) {
    const label = reference.label?.trim() ?? ``;
    if (label.length > 0) {
      messages.push({ role: `user`, kind: `text`, content: `${label}:` });
    }

    messages.push({
      role: `user`,
      kind: `asset`,
      assetId: reference.assetId,
    });
  }

  messages.push({ role: `user`, kind: `text`, content: prompt });

  return {
    model: `gemini-2.5-flash-image`,
    messages,
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
vi.mock(import(`#server/lib/createAsset.ts`));
vi.mock(import(`#server/lib/s3/assets.ts`));

const mockResponseBase64 = `iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
const mockResponseMimeType = `image/png`;

const assetIdOne =
  `sha256/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa` as AssetId;
const assetIdTwo =
  `sha256/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb` as AssetId;

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

      vi.mocked(assets.fetchAssetBase64).mockResolvedValue({
        data: mockResponseBase64,
        mimeType: `image/png`,
      });
      vi.mocked(createAssetFromBuffer).mockResolvedValue(assetIdOne);
    });

    test(`returns image data from text prompt`, async () => {
      const result = await requestGeminiImage(
        buildImagePromptFromText(
          `A bright red apple on a wooden table, studio lighting`,
        ),
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

    test(`maps resolution and thinking level from ImagePrompt`, async () => {
      const result = await requestGeminiImage({
        model: `gemini-2.5-flash-image`,
        systemInstruction: `Render a highly legible, clean scene.`,
        messages: [
          {
            role: `user`,
            kind: `text`,
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

    test(`resolves asset messages and preserves message order`, async () => {
      vi.mocked(assets.fetchAssetBase64).mockImplementation(async (assetId) => {
        if (assetId === assetIdOne) {
          return {
            data: `base64-one`,
            mimeType: `image/png`,
          };
        }

        return {
          data: `base64-two`,
          mimeType: `image/jpeg`,
        };
      });

      const result = await requestGeminiImage(
        buildImagePromptWithReferenceMessages({
          prompt: `A beautiful landscape with mountains`,
          references: [
            { label: `style`, assetId: assetIdOne },
            { label: `scene`, assetId: assetIdTwo },
          ],
        }),
      );

      expect(result.buffer.length).toBeGreaterThan(0);
      expect(result.mimeType.startsWith(`image/`)).toBe(true);
      expect(assets.fetchAssetBase64).toHaveBeenCalledTimes(2);
      expect(assets.fetchAssetBase64).toHaveBeenNthCalledWith(1, assetIdOne);
      expect(assets.fetchAssetBase64).toHaveBeenNthCalledWith(2, assetIdTwo);

      const callArgs = mockGenerateContentStream.mock.calls[0]?.[0] as {
        contents: Array<{ parts: unknown[] }>;
      };
      const parts = callArgs.contents[0]?.parts ?? [];

      expect(parts).toEqual([
        { text: `style:` },
        {
          inlineData: {
            mimeType: `image/png`,
            data: `base64-one`,
          },
        },
        { text: `scene:` },
        {
          inlineData: {
            mimeType: `image/jpeg`,
            data: `base64-two`,
          },
        },
        { text: `A beautiful landscape with mountains` },
      ]);
    });

    test(`ignores empty text messages and keeps assets`, async () => {
      await requestGeminiImage({
        model: `gemini-2.5-flash-image`,
        messages: [
          {
            role: `user`,
            kind: `text`,
            content: `   `,
          },
          {
            role: `user`,
            kind: `asset`,
            assetId: assetIdOne,
          },
          {
            role: `user`,
            kind: `text`,
            content: `Render with this style`,
          },
        ],
      });

      const callArgs = mockGenerateContentStream.mock.calls[0]?.[0] as {
        contents: Array<{ parts: unknown[] }>;
      };
      const parts = callArgs.contents[0]?.parts ?? [];

      expect(parts).toHaveLength(2);
      expect(parts[0]).toEqual({
        inlineData: {
          mimeType: `image/png`,
          data: mockResponseBase64,
        },
      });
      expect(parts[1]).toEqual({ text: `Render with this style` });
    });

    test(`throws when all text messages are empty and no asset message exists`, async () => {
      await expect(
        requestGeminiImage({
          model: `gemini-2.5-flash-image`,
          messages: [
            {
              role: `user`,
              kind: `text`,
              content: `   `,
            },
          ],
        }),
      ).rejects.toThrow(
        `ImagePrompt requires at least one non-empty user message`,
      );
    });

    test(`returns AssetId through requestGeminiImageAsAsset`, async () => {
      const result = await requestGeminiImageAsAsset(
        buildImagePromptFromText(`A bright red apple on a wooden table`),
      );

      expect(result).toBe(assetIdOne);
      expect(createAssetFromBuffer).toHaveBeenCalledTimes(1);

      const call = vi.mocked(createAssetFromBuffer).mock.calls[0];
      expect(call?.[1]).toBe(`image/png`);
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
          buildImagePromptFromText(
            `A bright red apple on a wooden table, studio lighting`,
          ),
        );

        expect(result.buffer.length).toBeGreaterThan(0);
        expect(result.mimeType.startsWith(`image/`)).toBe(true);
      },
    );
  },
);
