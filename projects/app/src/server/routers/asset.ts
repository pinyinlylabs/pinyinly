import {
  ALLOWED_IMAGE_TYPES,
  createPresignedReadUrl,
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
  verifyAssetExists,
} from "@/server/lib/r2/assets";
import { getR2Bucket, getR2Client } from "@/server/lib/r2/client";
import { authedProcedure, router } from "@/server/lib/trpc";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { z } from "zod/v4";

const assetStatusSchema = z.enum([`pending`, `uploaded`, `failed`]);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const assetRouter = router({
  /**
   * Resolve the asset key for the current user and asset ID.
   */
  getAssetKey: authedProcedure
    .input(
      z
        .object({
          assetId: z.string(),
        })
        .strict(),
    )
    .output(
      z
        .object({
          assetKey: z.string(),
        })
        .strict(),
    )
    .query(async (opts) => {
      const { userId } = opts.ctx.session;
      const { assetId } = opts.input;
      return {
        assetKey: `u/${userId}/${assetId}`,
      };
    }),
  /**
   * Request a presigned URL for uploading an asset.
   *
   * The client should:
   * 1. Call this endpoint to get an upload URL
   * 2. Upload the file directly to R2 using the presigned URL
   * 3. Call `confirmUpload` to mark the asset as uploaded
   */
  requestUploadUrl: authedProcedure
    .input(
      z
        .object({
          /**
           * Client-generated asset ID (nanoid). This allows optimistic UI updates
           * by using the ID immediately before upload completes.
           */
          assetId: z.string(),
          /**
           * MIME type of the file being uploaded.
           */
          contentType: z.enum(ALLOWED_IMAGE_TYPES),
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

      const result = await createPresignedUploadUrl({
        userId,
        assetId,
        contentType,
        contentLength,
      });

      return result;
    }),

  /**
   * Confirm that an asset has been successfully uploaded to R2.
   *
   * This verifies the asset exists in storage and returns its metadata.
   * The client should call this after successfully uploading via the presigned URL.
   */
  confirmUpload: authedProcedure
    .input(
      z
        .object({
          assetId: z.string(),
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
      const { userId } = opts.ctx.session;
      const { assetId } = opts.input;

      const assetKey = `u/${userId}/${assetId}`;
      const result = await verifyAssetExists(assetKey);

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
          assetId: z.string(),
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
      const { userId } = opts.ctx.session;
      const { assetId } = opts.input;

      const assetKey = `u/${userId}/${assetId}`;
      const exists = await verifyAssetExists(assetKey);

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
          assetId: z.string(),
          contentLength: z.number().int().positive(),
          contentType: z.enum(ALLOWED_IMAGE_TYPES),
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
      const { userId } = opts.ctx.session;
      const { assetId, contentLength, contentType } = opts.input;

      const result = await createPresignedUploadUrl({
        userId,
        assetId,
        contentType,
        contentLength,
      });

      return {
        url: result.uploadUrl,
      };
    }),

  /**
   * List all uploaded assets for the current user (used for remote sync).
   * Returns assets that physically exist in S3, not just database records.
   */
  listUploadedAssets: authedProcedure
    .output(z.array(z.string()))
    .query(async (opts) => {
      const { userId } = opts.ctx.session;

      const s3Client = getR2Client();
      const bucket = getR2Bucket();

      try {
        const command = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: `u/${userId}/`,
        });

        const response = await s3Client.send(command);
        const assetIds: string[] = [];

        if (response.Contents) {
          for (const obj of response.Contents) {
            const key = obj.Key;
            if (key !== null && key !== undefined && key.length > 0) {
              const assetId = key.split(`/`).pop();
              if (
                assetId !== null &&
                assetId !== undefined &&
                assetId.length > 0
              ) {
                assetIds.push(assetId);
              }
            }
          }
        }

        return assetIds;
      } catch (error) {
        console.error(`Failed to list uploaded assets`, { error, userId });
        throw error;
      }
    }),
});
