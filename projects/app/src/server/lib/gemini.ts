import type { AiReferenceImage } from "@/data/model";
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

export interface ImagePromptMessage {
  role: `user`;
  content: string;
}

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
  referenceImages?: AiReferenceImage[];
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

function buildUserPrompt(messages: ImagePromptMessage[]): string {
  const userParts: string[] = [];

  for (const message of messages) {
    const content = message.content.trim();
    if (content.length === 0) {
      continue;
    }

    userParts.push(content);
  }

  if (userParts.length === 0) {
    throw new Error(`ImagePrompt requires at least one non-empty user message`);
  }

  return userParts.join(`\n\n`);
}

function buildReferenceImageParts(
  referenceImages?: AiReferenceImage[],
): Part[] {
  if (referenceImages == null || referenceImages.length === 0) {
    return [];
  }

  const parts: Part[] = [];

  for (const refImage of referenceImages) {
    if (refImage.label != null && refImage.label.length > 0) {
      // Labels immediately before each reference image preserve ordering context.
      parts.push({ text: `${refImage.label}:` });
    }

    parts.push({
      inlineData: {
        mimeType: refImage.mimeType,
        data: refImage.data,
      },
    });
  }

  return parts;
}

export async function requestGeminiImage(prompt: ImagePrompt): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const client = getGeminiClient();
  const userPrompt = buildUserPrompt(prompt.messages);
  const systemInstruction = prompt.systemInstruction?.trim();
  const parts = buildReferenceImageParts(prompt.referenceImages);
  parts.push({ text: userPrompt });

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
