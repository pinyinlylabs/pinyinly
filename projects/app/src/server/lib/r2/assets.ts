import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod/v4";
import { getR2Bucket, getR2Client } from "./client";

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
 * The asset key format is: `u/{userId}/{assetId}`
 * - `u/` prefix identifies user-uploaded assets
 * - `{userId}` scopes assets to a user
 * - `{assetId}` is the unique asset identifier
 */
export async function createPresignedUploadUrl(opts: {
  userId: string;
  assetId: string;
  contentType: AllowedImageType;
  contentLength: number;
}): Promise<PresignedUploadUrlResult> {
  const { userId, assetId, contentType, contentLength } = opts;

  if (contentLength > MAX_ASSET_SIZE_BYTES) {
    throw new Error(
      `File size ${contentLength} exceeds maximum ${MAX_ASSET_SIZE_BYTES} bytes`,
    );
  }

  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    throw new Error(`Content type ${contentType} is not allowed`);
  }

  const client = getR2Client();
  const bucket = getR2Bucket();
  const assetKey = `u/${userId}/${assetId}`;

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
 * Verify that an asset exists in R2 and return its metadata.
 */
export async function verifyAssetExists(assetKey: string): Promise<{
  exists: boolean;
  contentType?: string;
  contentLength?: number;
}> {
  const client = getR2Client();
  const bucket = getR2Bucket();

  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: assetKey,
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
  const client = getR2Client();
  const bucket = getR2Bucket();

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: assetKey,
  });

  return getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  });
}
