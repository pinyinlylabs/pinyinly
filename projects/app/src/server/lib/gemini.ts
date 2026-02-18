/**
 * TODO: PLACEHOLDER IMPLEMENTATION - UPDATE ONCE API DOCUMENTATION IS AVAILABLE
 *
 * This file contains a placeholder implementation for the Gemini Nano Banana image generation API.
 * Update this implementation once you have access to the actual API documentation.
 *
 * Steps to update:
 * 1. Update the request format:
 *    - Verify the correct HTTP method (POST, GET, etc.)
 *    - Update headers (authentication format, content-type, custom headers)
 *    - Update request body structure (field names, parameter formats)
 *    - Add API-specific parameters: image size, quality, aspect ratio, style, negative prompts, etc.
 *
 * 2. Update response parsing:
 *    - Check if the API returns:
 *      * JSON with base64-encoded image data (e.g., { "image": "base64string", "format": "png" })
 *      * Binary image data directly in response body
 *      * A signed URL to download the image from
 *      * Multi-part response with metadata
 *    - Parse any metadata returned (image format, dimensions, generation time, etc.)
 *
 * 3. Update format detection:
 *    - If API returns format info, use it instead of detecting from buffer
 *    - Handle different output formats (PNG, JPEG, WebP, etc.)
 *
 * 4. Error handling:
 *    - Review API error response format (status codes, error messages, error codes)
 *    - Add retry logic if recommended by API docs
 *    - Handle rate limiting, quota errors, and content policy violations
 *
 * 5. Testing:
 *    - Test with actual API calls using valid credentials
 *    - Verify image quality and format
 *    - Test error scenarios (invalid prompts, rate limits, auth failures)
 *    - Validate Buffer output works with downstream image processing
 */

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
 * Generate an image using Gemini Nano Banana based on a text prompt.
 * Returns the image as a Buffer.
 *
 * Note: This is a placeholder implementation. Update the API call
 * format once you have access to the Gemini Nano Banana API documentation.
 */
export async function generateImage(opts: {
  prompt: string;
}): Promise<{ buffer: Buffer; mimeType: string }> {
  const { apiKey, model } = getGeminiConfig();

  if (apiKey.length === 0) {
    throw new Error(`Missing PYLY_GEMINI_IMAGE_API_KEY`);
  }

  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContentStream({
    model,
    config: {
      responseModalities: [`IMAGE`, `TEXT`],
    },
    contents: [
      {
        role: `user`,
        parts: [{ text: opts.prompt }],
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
