import type { AiReferenceImage } from "@/data/model";
import { parseBase64DataUri } from "@/util/base64";
import { geminiImageApiKey } from "@/util/env";
import type { Part } from "@google/genai";
import { GoogleGenAI } from "@google/genai";
import { nonNullable } from "@pinyinly/lib/invariant";

/**
 * Generate an image using Gemini Nano Banana based on a text prompt and optional reference images.
 * Returns the image as a Buffer.
 *
 * @param opts - Options containing prompt and optional referenceImages
 * @param opts.prompt - The text prompt for image generation
 * @param opts.referenceImages - Optional array of reference images with labels
 *
 * Note: This is a placeholder implementation. Update the API call
 * format once you have access to the Gemini Nano Banana API documentation.
 */
export async function generateImage(opts: {
  prompt: string;
  referenceImages?: AiReferenceImage[];
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const client = new GoogleGenAI({ apiKey: nonNullable(geminiImageApiKey) });

  // Build parts array with optional reference images
  const parts: Part[] = [];

  // Add reference images if provided
  if (opts.referenceImages != null && opts.referenceImages.length > 0) {
    for (const refImage of opts.referenceImages) {
      // Add label text before the image
      parts.push({ text: `${refImage.label}:` });

      // Parse base64 data URI
      const { mimeType, data } = parseBase64DataUri(
        refImage.imageData,
        refImage.label,
      );
      parts.push({
        inlineData: {
          mimeType,
          data,
        },
      });
    }
  }

  // Add text prompt
  parts.push({ text: opts.prompt });

  const response = await client.models.generateContentStream({
    model: `gemini-2.5-flash-image`,
    config: {
      responseModalities: [`IMAGE`, `TEXT`],
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
