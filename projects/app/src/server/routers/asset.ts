import { AssetStatusKind } from "@/data/model";
import { withDrizzle } from "@/server/lib/db";
import {
  ALLOWED_IMAGE_TYPES,
  createPresignedReadUrl,
  createPresignedUploadUrl,
  MAX_ASSET_SIZE_BYTES,
  verifyAssetExists,
} from "@/server/lib/s3/assets";
import { authedProcedure, router } from "@/server/lib/trpc";
import { getAssetKeyForId } from "@/util/assetKey";
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
      const { assetId } = opts.input;

      const assetKey = getAssetKeyForId(assetId);
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
      const { assetId } = opts.input;

      const assetKey = getAssetKeyForId(assetId);
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
   * List all uploaded assets for the current user (used for remote sync).
   * Returns assets that physically exist in S3, not just database records.
   */
  listAssetBucketUserFiles: authedProcedure
    .output(z.array(z.string()))
    .query(async (opts) => {
      const { userId } = opts.ctx.session;
      try {
        const assetRows = await withDrizzle((db) =>
          db.query.asset.findMany({
            where: (t, { and, eq }) =>
              and(eq(t.userId, userId), eq(t.status, AssetStatusKind.Uploaded)),
            columns: {
              assetId: true,
            },
          }),
        );

        if (assetRows.length === 0) {
          return [];
        }

        const assetIds = await Promise.all(
          assetRows.map(async ({ assetId }) => {
            const result = await verifyAssetExists(getAssetKeyForId(assetId));
            return result.exists ? assetId : null;
          }),
        );

        return assetIds.filter((assetId): assetId is string => assetId != null);
      } catch (error) {
        console.error(`Failed to list uploaded assets`, { error, userId });
        throw error;
      }
    }),
});
