import type { AssetId } from "@/data/model";
import { createAssetFromBuffer } from "@/server/lib/createAsset";
import { fetchAssetBase64 } from "@/server/lib/s3/assets";
import type { GeminiImageAspectRatio } from "@/util/geminiImageAspectRatio";
import { geminiImageApiKey } from "@/util/env";
import { memoize0 } from "@pinyinly/lib/collections";
import type { Part } from "@google/genai";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { nonNullable } from "@pinyinly/lib/invariant";

export const geminiImageModels = [
  `gemini-2.5-flash-image`,
  `gemini-3.1-flash-lite-image`,
] as const;

export type GeminiImageModel = (typeof geminiImageModels)[number];

export type ImagePromptMessageKind = `text` | `asset`;

interface BaseImagePromptMessage {
  role: `user`;
  kind: ImagePromptMessageKind;
}

export interface TextImagePromptMessage extends BaseImagePromptMessage {
  kind: `text`;
  content: string;
}

export interface AssetImagePromptMessage extends BaseImagePromptMessage {
  kind: `asset`;
  assetId: AssetId;
}

export type ImagePromptMessage =
  | TextImagePromptMessage
  | AssetImagePromptMessage;

export const geminiImageThinkingLevels = [`minimal`, `high`] as const;

export type GeminiImageThinkingLevel =
  (typeof geminiImageThinkingLevels)[number];

export const geminiImageResolutionPresets = [`512`, `1K`] as const;

export type GeminiImageResolutionPreset =
  (typeof geminiImageResolutionPresets)[number];

export interface ImagePrompt {
  model: GeminiImageModel;
  systemInstruction?: string;
  messages: ImagePromptMessage[];
  aspectRatio?: GeminiImageAspectRatio;
  resolution?: GeminiImageResolutionPreset;
  thinkingLevel?: GeminiImageThinkingLevel;
}

const getGeminiClient = memoize0(() => {
  return new GoogleGenAI({ apiKey: nonNullable(geminiImageApiKey) });
});

function mapThinkingLevel(value: GeminiImageThinkingLevel): ThinkingLevel {
  switch (value) {
    case `minimal`:
      return ThinkingLevel.MINIMAL;
    case `high`:
      return ThinkingLevel.HIGH;
  }
}

async function buildPromptParts(
  messages: ImagePromptMessage[],
): Promise<Part[]> {
  const parts: Part[] = [];

  for (const message of messages) {
    switch (message.kind) {
      case `text`: {
        const content = message.content.trim();
        if (content.length === 0) {
          continue;
        }

        parts.push({ text: content });
        break;
      }
      case `asset`: {
        const imageData = await fetchAssetBase64(message.assetId);
        parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        });
        break;
      }
    }
  }

  if (parts.length === 0) {
    throw new Error(`ImagePrompt requires at least one non-empty user message`);
  }

  return parts;
}

export async function requestGeminiImage(prompt: ImagePrompt): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const client = getGeminiClient();
  const systemInstruction = prompt.systemInstruction?.trim();
  const parts = await buildPromptParts(prompt.messages);

  const response = await client.models.generateContentStream({
    model: prompt.model,
    config: {
      responseModalities: [`IMAGE`],
      imageConfig: {
        aspectRatio: prompt.aspectRatio,
        ...(prompt.resolution == null ? {} : { imageSize: prompt.resolution }),
      },
      ...(systemInstruction == null || systemInstruction.length === 0
        ? {}
        : { systemInstruction }),
      ...(prompt.thinkingLevel == null
        ? {}
        : {
            thinkingConfig: {
              thinkingLevel: mapThinkingLevel(prompt.thinkingLevel),
            },
          }),
    },
    contents: [
      {
        role: `user`,
        parts,
      },
    ],
  });

  let base64 = ``;
  let mimeType = ``;

  for await (const chunk of response) {
    const parts = chunk.candidates?.[0]?.content?.parts ?? [];
    const inlinePart = parts.find((part) => part.inlineData?.data != null);
    if (inlinePart?.inlineData?.data != null) {
      base64 = inlinePart.inlineData.data;
      mimeType = inlinePart.inlineData.mimeType ?? ``;
      break;
    }
  }

  if (base64.length === 0) {
    throw new Error(`Gemini returned an empty image`);
  }

  if (mimeType.length === 0) {
    throw new Error(`Gemini image response missing mime type`);
  }

  return { buffer: Buffer.from(base64, `base64`), mimeType };
}

export async function requestGeminiImageAsAsset(
  prompt: ImagePrompt,
): Promise<AssetId> {
  const { buffer, mimeType } = await requestGeminiImage(prompt);
  const imageArrayBuffer = Uint8Array.from(buffer).buffer;

  return createAssetFromBuffer(imageArrayBuffer, mimeType);
}
