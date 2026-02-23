import { getAssetKeyForId } from "@/util/assetKey";
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
 * Zod schema for validating asset ID format.
 * Asset IDs must be in the format: sha256/<base64url-hash>
 * where the hash is a 43-character base64url-encoded SHA-256 digest.
 */
export const assetIdSchema = z
  .string()
  .regex(
    /^sha256\/[A-Za-z0-9_-]{43}$/,
    `Asset ID must be in format sha256/<base64url-hash>`,
  );

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
  assetId: string;
  contentType: AllowedImageType;
  contentLength: number;
}): Promise<PresignedUploadUrlResult> {
  const { assetId, contentType, contentLength } = opts;

  // Validate asset ID format
  const assetIdValidation = assetIdSchema.safeParse(assetId);
  if (!assetIdValidation.success) {
    throw new Error(
      `Invalid asset ID format: ${assetIdValidation.error.issues[0]?.message ?? `unknown error`}`,
    );
  }

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
  const assetKey = getAssetKeyForId(assetId);

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
  const client = getAssetsS3Client();

  try {
    const command = new HeadObjectCommand({
      Bucket: nonNullable(assetsS3Bucket),
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
  const client = getAssetsS3Client();

  const command = new GetObjectCommand({
    Bucket: nonNullable(assetsS3Bucket),
    Key: assetKey,
  });

  return getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY_SECONDS,
  });
}
