import { imageTypeEnum } from "@/server/lib/r2/assets";
import type { AppRouter } from "@/server/routers/_app";
import type { S3Client } from "@aws-sdk/client-s3";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import type { TRPCClient } from "@trpc/client";

/**
 * List all asset files that exist in local storage.
 * Storage is the source of truth - returns all objects under the user's prefix.
 * This includes both uploaded and downloaded assets.
 */
export async function listLocalAssetFiles(
  s3Client: S3Client,
  bucket: string,
  userId: string,
): Promise<Set<string>> {
  const assetIds = new Set<string>();
  const prefix = `u/${userId}/`;

  let continuationToken: string | undefined;

  while (true) {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    // Extract assetId from key format "u/{userId}/{assetId}"
    if (response.Contents != null) {
      for (const obj of response.Contents) {
        if (obj.Key != null && obj.Key.length > 0) {
          const assetId = obj.Key.slice(prefix.length);
          if (assetId.length > 0) {
            assetIds.add(assetId);
          }
        }
      }
    }

    // Check if there are more results
    if (response.IsTruncated !== true) {
      break;
    }

    continuationToken = response.NextContinuationToken;
  }

  // Return all assets that physically exist in storage
  return assetIds;
}

export async function downloadAssetFromRemote(
  trpcClient: TRPCClient<AppRouter>,
  s3Client: S3Client,
  bucket: string,
  userId: string,
  assetId: string,
): Promise<void> {
  // Get presigned download URL from remote server
  const downloadUrlResult = await trpcClient.asset.getDownloadUrl.query({
    assetId,
  });

  if (downloadUrlResult == null || downloadUrlResult.url == null) {
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
  const assetKey = `u/${userId}/${assetId}`;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: assetKey,
    Body: Buffer.from(buffer),
    ContentType: contentType,
  });

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
  s3Client: S3Client,
  bucket: string,
  userId: string,
  assetId: string,
): Promise<void> {
  const assetKey = `u/${userId}/${assetId}`;

  // Download the blob from local S3
  const getCommand = new GetObjectCommand({
    Bucket: bucket,
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
  const contentTypeResult = imageTypeEnum.safeParse(contentTypeFromStorage);
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

  if (uploadUrlResult == null || uploadUrlResult.url == null) {
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
