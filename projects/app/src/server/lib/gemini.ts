import { preflightCheckEnvVars } from "@/util/env";
import { GoogleGenAI } from "@google/genai";
import { invariant } from "@pinyinly/lib/invariant";

const DEFAULT_GEMINI_MODEL = `gemini-2.5-flash-image`;

function getGeminiConfig(): {
  apiKey: string;
  model: string;
} {
  const apiKey = String(process.env[`PYLY_GEMINI_IMAGE_API_KEY`] ?? ``);
  const model = DEFAULT_GEMINI_MODEL;

  if (preflightCheckEnvVars) {
    invariant(
      apiKey.length > 0,
      `PYLY_GEMINI_IMAGE_API_KEY is required for image generation`,
    );
  }

  return { apiKey, model };
}

/**
 * Generate an image using Gemini Nano Banana based on a text prompt and optional style image.
 * Returns the image as a Buffer.
 *
 * @param opts - Options containing prompt and optional styleImageData
 * @param opts.prompt - The text prompt for image generation
 * @param opts.styleImageData - Optional style image data in format "mimeType;base64,data"
 *
 * Note: This is a placeholder implementation. Update the API call
 * format once you have access to the Gemini Nano Banana API documentation.
 */
export async function generateImage(opts: {
  prompt: string;
  styleImageData?: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const { apiKey, model } = getGeminiConfig();

  if (apiKey.length === 0) {
    throw new Error(`Missing PYLY_GEMINI_IMAGE_API_KEY`);
  }

  const client = new GoogleGenAI({ apiKey });

  // Build parts array with optional style image
  const parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }> = [];

  // Add style image if provided
  if (opts.styleImageData != null && opts.styleImageData.length > 0) {
    // Parse format: "mimeType;base64,data"
    const formatMatch = opts.styleImageData.match(/^([^;]+);base64,(.+)$/);
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
      throw new Error(`Invalid style image data format`);
    }
  }

  // Add text prompt
  parts.push({ text: opts.prompt });

  const response = await client.models.generateContentStream({
    model,
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
      mimeType = inlinePart.inlineData?.mimeType ?? ``;
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
