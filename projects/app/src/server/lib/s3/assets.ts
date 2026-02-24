import type { AssetId } from "@/data/model";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { assetsS3Bucket } from "@/util/env";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nonNullable } from "@pinyinly/lib/invariant";
import { z } from "zod/v4";
import { getAssetsS3Client } from "./client";

/**
 * Maximum file size for user uploads (5MB).
 */
export const MAX_ASSET_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Zod schema for allowed image MIME types.
 */
export const imageTypeEnum = z.enum([
  `image/jpeg`,
  `image/png`,
  `image/webp`,
  `image/gif`,
]);

export type AllowedImageType = z.infer<typeof imageTypeEnum>;
export const ALLOWED_IMAGE_TYPES = imageTypeEnum.options;

/**
 * Presigned URL expiration time in seconds (15 minutes).
 */
const PRESIGNED_URL_EXPIRY_SECONDS = 15 * 60;

export interface PresignedUploadUrlResult {
  uploadUrl: string;
  /**
   * The key (path) where the asset will be stored in R2.
   */
  assetKey: string;
}

/**
 * Generate a presigned URL for uploading an asset to R2.
 *
 * The asset key format is: `blob/{assetId}`
 * - `blob/` prefix identifies user-uploaded blobs
 * - `{assetId}` is algorithm-prefixed (e.g., `sha256/<base64url-hash>`)
 */
export async function createPresignedUploadUrl(opts: {
  assetId: AssetId;
  contentType: AllowedImageType;
  contentLength: number;
}): Promise<PresignedUploadUrlResult> {
  const { assetId, contentType, contentLength } = opts;

  if (contentLength > MAX_ASSET_SIZE_BYTES) {
    throw new Error(
      `File size ${contentLength} exceeds maximum ${MAX_ASSET_SIZE_BYTES} bytes`,
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    throw new Error(`Content type ${contentType} is not allowed`);
  }

  const client = getAssetsS3Client();
  const bucket = nonNullable(assetsS3Bucket);
  const assetKey = getBucketObjectKeyForId(assetId);

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: assetKey,
    ContentType: contentType,
    ContentLength: contentLength,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  });

  return { uploadUrl, assetKey };
}

/**
 * Verify that an object exists in R2 and return its metadata.
 */
export async function verifyObjectExists(objectKey: string): Promise<{
  exists: boolean;
  contentType?: string;
  contentLength?: number;
}> {
  const client = getAssetsS3Client();

  try {
    const command = new HeadObjectCommand({
      Bucket: nonNullable(assetsS3Bucket),
      Key: objectKey,
    });

    const response = await client.send(command);

    return {
      exists: true,
      contentType: response.ContentType,
      contentLength: response.ContentLength,
    };
  } catch (error) {
    // If the object doesn't exist, S3 throws a NotFound error
    if (
      error instanceof Error &&
      (error.name === `NotFound` || error.name === `NoSuchKey`)
    ) {
      return { exists: false };
    }
    throw error;
  }
}

/**
 * Generate a presigned URL for reading an asset from R2 (for private buckets).
 * If using a public bucket with CDN, use `getPublicAssetUrl` instead.
 */
export async function createPresignedReadUrl(
  assetKey: string,
): Promise<string> {
  const client = getAssetsS3Client();

  const command = new GetObjectCommand({
    Bucket: nonNullable(assetsS3Bucket),
    Key: assetKey,
  });

  return getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  });
}

/**
 * Fetch an asset buffer from S3 by asset ID.
 * Useful for retrieving assets for processing or transformation.
 *
 * @param assetId - The asset ID to fetch (format: sha256/<base64url>)
 * @returns The asset buffer
 */
export async function fetchAssetBuffer(assetId: AssetId): Promise<Buffer> {
  const s3Client = getAssetsS3Client();
  const assetKey = getBucketObjectKeyForId(assetId);

  const command = new GetObjectCommand({
    Bucket: nonNullable(assetsS3Bucket),
    Key: assetKey,
  });

  const response = await s3Client.send(command);

  if (!response.Body) {
    throw new Error(`Failed to fetch asset from S3: ${assetId}`);
  }

  const chunks: Uint8Array[] = [];
  const body = response.Body as AsyncIterable<Uint8Array>;

  for await (const chunk of body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}
