import { allowedImageMimeTypeEnum, assetIdSchema } from "@/data/model";
import {
  createPresignedReadUrl,
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
  verifyObjectExists,
} from "@/server/lib/s3/asset";
import {
  assetUploadRequestedEvent,
  inngest,
} from "@/server/lib/inngest/client";
import { authedProcedure, router } from "@/server/lib/trpc";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { z } from "zod";

const maxFindMissingAssetsCount = 200;

export const assetRouter = router({
  /**
   * Request a presigned URL for uploading an asset.
   *
   * The client should:
   * 1. Call this endpoint to get an upload URL
   * 2. Upload the file directly to S3 using the presigned URL
   */
  requestUploadUrl: authedProcedure
    .input(
      z
        .object({
          /**
           * Client-generated asset ID (algorithm-prefixed, e.g., sha256/<base64url>).
           * This allows optimistic UI updates by using the ID immediately before upload completes.
           */
          assetId: assetIdSchema,
          /**
           * MIME type of the file being uploaded.
           */
          contentType: allowedImageMimeTypeEnum,
          /**
           * Size of the file in bytes.
           */
          contentLength: z.number().int().positive().max(MAX_ASSET_SIZE_BYTES),
        })
        .strict(),
    )
    .output(
      z
        .object({
          uploadUrl: z.string(),
          assetKey: z.string(),
          expiresAt: z.number(),
        })
        .strict(),
    )
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;
      const { assetId, contentType, contentLength } = opts.input;

      const result = await createPresignedUploadUrl({
        assetId,
        contentType,
        contentLength,
      });

      await inngest.send(
        assetUploadRequestedEvent.create({
          userId,
          assetId,
          expiresAt: result.expiresAt,
        }),
      );

      return result;
    }),

  /**
   * Get a presigned download URL for an asset (used for remote sync).
   */
  getDownloadUrl: authedProcedure
    .input(
      z
        .object({
          assetId: assetIdSchema,
        })
        .strict(),
    )
    .output(
      z
        .object({
          url: z.string(),
        })
        .nullable(),
    )
    .query(async (opts) => {
      const { assetId } = opts.input;

      const assetKey = getBucketObjectKeyForId(assetId);
      const exists = await verifyObjectExists(assetKey);

      if (!exists.exists) {
        return null;
      }

      const url = await createPresignedReadUrl(assetKey);
      return { url };
    }),

  /**
   * Get a presigned upload URL for an asset (used for remote sync).
   */
  getUploadUrl: authedProcedure
    .input(
      z
        .object({
          assetId: assetIdSchema,
          contentLength: z.number().int().positive(),
          contentType: allowedImageMimeTypeEnum,
        })
        .strict(),
    )
    .output(
      z
        .object({
          url: z.string(),
        })
        .nullable(),
    )
    .mutation(async (opts) => {
      const { assetId, contentLength, contentType } = opts.input;

      const result = await createPresignedUploadUrl({
        assetId,
        contentType,
        contentLength,
      });

      return {
        url: result.uploadUrl,
      };
    }),

  /**
   * Check which of the provided asset IDs are missing from storage.
   * Uses object storage as the source of truth rather than DB references.
   */
  findMissingAssets: authedProcedure
    .input(
      z
        .object({
          assetIds: z.array(assetIdSchema).max(maxFindMissingAssetsCount),
        })
        .strict(),
    )
    .output(
      z
        .object({
          missingAssetIds: z.array(assetIdSchema),
        })
        .strict(),
    )
    .query(async (opts) => {
      const { assetIds } = opts.input;

      try {
        const missingAssetIds: typeof assetIds = [];
        const chunkSize = 20;

        for (let i = 0; i < assetIds.length; i += chunkSize) {
          const assetIdChunk = assetIds.slice(i, i + chunkSize);
          const chunkResults = await Promise.all(
            assetIdChunk.map(async (assetId) => {
              const assetKey = getBucketObjectKeyForId(assetId);
              const exists = await verifyObjectExists(assetKey);
              return exists.exists ? null : assetId;
            }),
          );

          missingAssetIds.push(
            ...chunkResults.filter((assetId) => assetId != null),
          );
        }

        return { missingAssetIds };
      } catch (error) {
        console.error(`Failed to check asset presence in storage`, {
          assetIdCount: assetIds.length,
          error,
        });
        throw error;
      }
    }),
});
