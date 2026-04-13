import type { AssetId } from "@/data/model";
import { getArrayBufferAssetId, getBucketObjectKeyForId } from "@/util/assetId";
import { assetsS3Bucket } from "@/util/env";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { nonNullable } from "@pinyinly/lib/invariant";
import { getAssetsS3Client } from "./s3/client";

/**
 * Create an asset from a buffer and save it to S3.
 *
 * @param buffer - The asset content as a Buffer
 * @param mimeType - The MIME type of the asset (e.g., "image/png")
 * @returns The computed asset ID
 */
export async function createAssetFromBuffer(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<AssetId> {
  // Compute asset ID from buffer content
  const assetId = await getArrayBufferAssetId(buffer);

  // Save to S3
  const s3Client = getAssetsS3Client();
  const assetKey = getBucketObjectKeyForId(assetId);
  const body = new Uint8Array(buffer);

  const putCommand = new PutObjectCommand({
    Bucket: nonNullable(assetsS3Bucket),
    Key: assetKey,
    Body: body,
    ContentType: mimeType,
  });

  await s3Client.send(putCommand);

  return assetId;
}
