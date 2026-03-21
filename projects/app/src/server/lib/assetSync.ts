import type { AssetId } from "@/data/model";
import { allowedImageMimeTypeEnum, assetIdSchema } from "@/data/model";
import { getImageSettingKeyPatterns } from "@/data/userSettings";
import { withDrizzle } from "@/server/lib/db";
import * as schema from "@/server/pgSchema";
import { verifyObjectExists } from "@/server/lib/s3/assets";
import type { AppRouter } from "@/server/routers/_app";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { assetsS3Bucket } from "@/util/env";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { nonNullable } from "@pinyinly/lib/invariant";
import type { TRPCClient } from "@trpc/client";
import { and, eq, or, sql } from "drizzle-orm";
import { getAssetsS3Client } from "./s3/client";

export async function listReferencedAssetIdsForUser(
  userId: string,
): Promise<AssetId[]> {
  const keyPatterns = getImageSettingKeyPatterns();

  const referencedAssetIds = await withDrizzle(async (db) => {
    const keyConditions = keyPatterns.map(
      (pattern) => sql`${schema.userSetting.key} LIKE ${pattern}`,
    );
    const historyKeyConditions = keyPatterns.map(
      (pattern) => sql`${schema.userSettingHistory.key} LIKE ${pattern}`,
    );

    const currentSettings = await db
      .select({
        assetId: sql<string | null>`${schema.userSetting.value}->>'t'`,
      })
      .from(schema.userSetting)
      .where(
        and(
          eq(schema.userSetting.userId, userId),
          or(...keyConditions),
          sql`${schema.userSetting.value}->>'t' IS NOT NULL`,
        ),
      );

    const historicalSettings = await db
      .select({
        assetId: sql<string | null>`${schema.userSettingHistory.value}->>'t'`,
      })
      .from(schema.userSettingHistory)
      .where(
        and(
          eq(schema.userSettingHistory.userId, userId),
          or(...historyKeyConditions),
          sql`${schema.userSettingHistory.value}->>'t' IS NOT NULL`,
        ),
      );

    const allAssetIds = new Set<string>();
    for (const { assetId } of currentSettings) {
      if (assetId != null && assetId.length > 0) {
        allAssetIds.add(assetId);
      }
    }
    for (const { assetId } of historicalSettings) {
      if (assetId != null && assetId.length > 0) {
        allAssetIds.add(assetId);
      }
    }

    return Array.from(allAssetIds);
  });

  return referencedAssetIds
    .map((assetId) => assetIdSchema.safeParse(assetId).data)
    .filter((assetId) => assetId != null);
}

/**
 * List all asset files that exist in local storage for a user.
 * Uses the DB as the source of truth, then verifies storage exists.
 */
export async function listAssetFiles(userId: string): Promise<AssetId[]> {
  const referencedAssetIds = await listReferencedAssetIdsForUser(userId);

  if (referencedAssetIds.length === 0) {
    return [];
  }

  const assetIds = await Promise.all(
    referencedAssetIds.map(async (assetId) => {
      const result = await verifyObjectExists(getBucketObjectKeyForId(assetId));
      return result.exists ? assetId : null;
    }),
  );

  return assetIds.filter((assetId) => assetId != null);
}

export async function downloadAssetFromRemote(
  trpcClient: TRPCClient<AppRouter>,
  assetId: AssetId,
): Promise<void> {
  // Get presigned download URL from remote server
  const downloadUrlResult = await trpcClient.asset.getDownloadUrl.query({
    assetId,
  });

  if (downloadUrlResult == null) {
    throw new Error(`Failed to get download URL for asset ${assetId}`);
  }

  // Download the blob from the remote presigned URL
  const response = await fetch(downloadUrlResult.url);
  if (!response.ok) {
    throw new Error(
      `Failed to download asset ${assetId}: ${response.statusText}`,
    );
  }

  const contentType =
    response.headers.get(`content-type`) ?? `application/octet-stream`;
  if (contentType.length === 0) {
    throw new Error(`No content-type header in download response`);
  }

  const buffer = await response.arrayBuffer();

  // Upload to local S3 storage
  const assetKey = getBucketObjectKeyForId(assetId);
  const command = new PutObjectCommand({
    Bucket: nonNullable(assetsS3Bucket),
    Key: assetKey,
    Body: Buffer.from(buffer),
    ContentType: contentType,
  });

  const s3Client = getAssetsS3Client();
  await s3Client.send(command);
}

/**
 * Upload an asset from local S3 to the remote server.
 * Gets a presigned upload URL from the remote server via tRPC, downloads the blob from
 * local storage, and uploads it to the remote via the presigned URL.
 * Uses the storage object's content type rather than database metadata.
 */
export async function uploadAssetToRemote(
  trpcClient: TRPCClient<AppRouter>,
  assetId: AssetId,
): Promise<void> {
  const assetKey = getBucketObjectKeyForId(assetId);

  const s3Client = getAssetsS3Client();

  // Download the blob from local S3
  const getCommand = new GetObjectCommand({
    Bucket: nonNullable(assetsS3Bucket),
    Key: assetKey,
  });

  const getResponse = await s3Client.send(getCommand);
  const body = getResponse.Body;
  const contentTypeFromStorage = getResponse.ContentType;

  if (body == null) {
    throw new Error(`Failed to read asset ${assetId} from local storage`);
  }

  if (contentTypeFromStorage == null) {
    throw new Error(`No content-type metadata on asset ${assetId} in storage`);
  }

  // Convert streaming body to buffer using AWS SDK's built-in method
  const bytes = await body.transformToByteArray();
  const buffer = Buffer.from(bytes);

  // Validate content type is one of the allowed types
  const contentTypeResult = allowedImageMimeTypeEnum.safeParse(
    contentTypeFromStorage,
  );
  if (!contentTypeResult.success) {
    throw new Error(
      `Invalid content type for upload: ${contentTypeFromStorage}`,
    );
  }

  const contentType = contentTypeResult.data;

  // Get presigned upload URL from remote server
  const uploadUrlResult = await trpcClient.asset.getUploadUrl.mutate({
    assetId,
    contentLength: buffer.length,
    contentType,
  });

  if (uploadUrlResult == null) {
    throw new Error(`Failed to get upload URL for asset ${assetId}`);
  }

  // Upload to remote via presigned URL
  const uploadResponse = await fetch(uploadUrlResult.url, {
    method: `PUT`,
    headers: {
      "Content-Type": contentType,
    },
    body: buffer,
  });

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload asset ${assetId} to remote: ${uploadResponse.statusText}`,
    );
  }
}
