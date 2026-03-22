import { allowedImageMimeTypeEnum, assetIdSchema } from "@/data/model";
import { listReferencedAssetIdsForUser } from "@/server/lib/assetSync";
import {
  createPresignedReadUrl,
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
  verifyObjectExists,
} from "@/server/lib/s3/assets";
import { authedProcedure, router } from "@/server/lib/trpc";
import { getBucketObjectKeyForId } from "@/util/assetId";
import { z } from "zod/v4";

const assetStatusSchema = z.enum([`pending`, `uploaded`, `failed`]);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const assetRouter = router({
  /**
   * Request a presigned URL for uploading an asset.
   *
   * The client should:
   * 1. Call this endpoint to get an upload URL
   * 2. Upload the file directly to S3 using the presigned URL
   * 3. Call `confirmUpload` to mark the asset as uploaded
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
      const { assetId, contentType, contentLength } = opts.input;

      const result = await createPresignedUploadUrl({
        assetId,
        contentType,
        contentLength,
      });

      return result;
    }),

  /**
   * Confirm that an asset has been successfully uploaded to S3.
   *
   * This verifies the asset exists in storage and returns its metadata.
   * The client should call this after successfully uploading via the presigned URL.
   */
  confirmUpload: authedProcedure
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
          success: z.boolean(),
          contentType: z.string().optional(),
          contentLength: z.number().optional(),
        })
        .strict(),
    )
    .mutation(async (opts) => {
      const { assetId } = opts.input;

      const assetKey = getBucketObjectKeyForId(assetId);
      const result = await verifyObjectExists(assetKey);

      return {
        success: result.exists,
        contentType: result.contentType,
        contentLength: result.contentLength,
      };
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
