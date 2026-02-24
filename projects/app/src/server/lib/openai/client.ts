import type { AssetId } from "@/data/model";
import { fetchAssetBuffer } from "@/server/lib/s3/assets";
import { openaiApiKey } from "@/util/env";
import { memoize0 } from "@pinyinly/lib/collections";
import { nonNullable } from "@pinyinly/lib/invariant";
// eslint-disable-next-line @expoCodeImports/no-restricted-imports -- Server-only code, Node.js is guaranteed
import { Readable } from "node:stream";
import { OpenAI, toFile } from "openai";

export const getOpenAIClient = memoize0((): OpenAI => {
  return new OpenAI({
    apiKey: nonNullable(openaiApiKey),
  });
});

/**
 * Remove the background from an image by calling the OpenAI image edit API.
 * Fetches the original image from S3 using the asset ID, then uses the
 * gpt-image-1.5 model to remove backgrounds with a transparent result.
 *
 * @param assetId - The asset ID of the image to process (fetched from S3)
 * @returns The processed image buffer and its MIME type
 */
export async function removeBackgroundFromImage(
  assetId: AssetId,
): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  // Fetch the original image from S3
  const imageBuffer = await fetchAssetBuffer(assetId);

  const openaiClient = getOpenAIClient();

  // Convert image buffer to a file object for the OpenAI API
  const imageFile = await toFile(Readable.from(imageBuffer), `image.png`, {
    type: `image/png`,
  });

  // Call the image edit API to remove background
  const response = await openaiClient.images.edit({
    model: `gpt-image-1.5`,
    image: imageFile,
    prompt: `Remove the background without affecting the foreground item`,
    background: `transparent`,
    output_format: `png`,
  });

  if (!response.data || response.data.length === 0) {
    throw new Error(`Background removal API returned no image data`);
  }

  const imageData = response.data[0];
  if (imageData == null) {
    throw new Error(`Background removal API returned no image data`);
  }

  let processedBuffer: ArrayBuffer;

  // Check if we got a base64 image or a URL
  if (imageData.b64_json != null && imageData.b64_json.length > 0) {
    const buffer = Buffer.from(imageData.b64_json, `base64`);
    processedBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength,
    );
  } else if (imageData.url != null && imageData.url.length > 0) {
    const imageResponse = await fetch(imageData.url);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download processed image: ${imageResponse.statusText}`,
      );
    }
    processedBuffer = await imageResponse.arrayBuffer();
  } else {
    throw new Error(`Background removal API response missing image data`);
  }

  // API returns PNG with transparency
  const outputMimeType = `image/png`;

  return {
    buffer: processedBuffer,
    mimeType: outputMimeType,
  };
}
