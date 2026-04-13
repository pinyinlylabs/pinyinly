import { allowedImageMimeTypeEnum, assetIdSchema } from "@/data/model";
import { listReferencedAssetIdsForUser } from "@/server/lib/assetSync";
import { withDrizzle } from "@/server/lib/db";
import {
  createPresignedReadUrl,
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
  verifyObjectExists,
} from "@/server/lib/s3/assets";
import * as schema from "@/server/pgSchema";
import { authedProcedure, router } from "@/server/lib/trpc";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { z } from "zod/v4";

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
        })
        .strict(),
    )
    .mutation(async (opts) => {
      const { userId } = opts.ctx.session;
      const { assetId, contentType, contentLength } = opts.input;

      const now = new Date();
      await withDrizzle((db) =>
        db
          .insert(schema.assetPendingUpload)
          .values({
            userId,
            assetId,
            createdAt: now,
          })
          .onConflictDoUpdate({
            target: [
              schema.assetPendingUpload.userId,
              schema.assetPendingUpload.assetId,
            ],
            set: {
              createdAt: now,
            },
          }),
      );

      const result = await createPresignedUploadUrl({
        assetId,
        contentType,
        contentLength,
      });

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
   * List all assets referenced in user settings (used for remote sync).
   * Returns asset IDs that are actually in use by the user in their settings,
   * avoiding the need to sync the entire bucket.
   */
  listAssetBucketUserFiles: authedProcedure
    .output(z.array(z.string()))
    .query(async (opts) => {
      const { userId } = opts.ctx.session;
      try {
        const assetIds = await listReferencedAssetIdsForUser(userId);

        return assetIds;
      } catch (error) {
        console.error(`Failed to list asset references in user settings`, {
          error,
          userId,
        });
        throw error;
      }
    }),
});
