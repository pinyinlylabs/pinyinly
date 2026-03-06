import type { AiReferenceImage } from "@/data/model";
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

      // Parse format: "mimeType;base64,data"
      const formatMatch = refImage.imageData.match(/^([^;]+);base64,(.+)$/);
      if (formatMatch && formatMatch[1] != null && formatMatch[2] != null) {
        const mimeType = formatMatch[1];
        const base64Data = formatMatch[2];
        parts.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      } else {
        throw new Error(
          `Invalid reference image data format for label "${refImage.label}"`,
        );
      }
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
