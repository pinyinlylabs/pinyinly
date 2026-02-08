import {
  ALLOWED_IMAGE_TYPES,
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
  verifyAssetExists,
} from "@/server/lib/r2/assets";
import { authedProcedure, router } from "@/server/lib/trpc";
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
});
