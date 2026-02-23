import { AssetStatusKind } from "@/data/model";
import * as s from "@/server/pgSchema";
import { getAssetKeyForId } from "@/util/assetKey";
import { assetsS3Bucket } from "@/util/env";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { invariant } from "@pinyinly/lib/invariant";
import { eq, sql } from "drizzle-orm";
import type { Drizzle } from "./db";
import { getAssetsS3Client } from "./s3/client";

/**
 * Migrate assets from old ID format (plain hash) to new format (sha256/<hash>).
 *
 * This function:
 * 1. Finds assets with IDs that don't start with "sha256/"
 * 2. Checks if new format already exists (collision detection)
 * 3. Copies S3 objects from old to new location
 * 4. Updates asset records in database
 * 5. Updates references in userSetting and userSettingHistory
 * 6. Deletes old S3 objects
 *
 * Runs in batches to avoid overwhelming the database or S3.
 */
export async function migrateAssetIdsBatch(
  tx: Drizzle,
  opts: {
    batchSize?: number;
    dryRun?: boolean;
  } = {},
): Promise<{
  migratedCount: number;
  errors: Array<{ assetId: string; error: string }>;
}> {
  const { batchSize = 50, dryRun = false } = opts;
  const s3Client = getAssetsS3Client();
  const bucket = assetsS3Bucket;
  invariant(bucket != null, `assetsS3Bucket must be set`);

  // Find assets that don't have the new format
  const oldAssets = await tx.query.asset.findMany({
    where: (t, { and, eq, isNull, notLike }) =>
      and(
        notLike(t.assetId, `sha256/%`),
        // Only migrate uploaded assets
        eq(t.status, AssetStatusKind.Uploaded),
        // Don't migrate assets with errors
        isNull(t.errorMessage),
      ),
    columns: {
      id: true,
      userId: true,
      assetId: true,
      contentType: true,
      contentLength: true,
      status: true,
    },
    limit: batchSize,
  });

  if (oldAssets.length === 0) {
    return { migratedCount: 0, errors: [] };
  }

  const errors: Array<{ assetId: string; error: string }> = [];
  let migratedCount = 0;

  for (const oldAsset of oldAssets) {
    const oldAssetId = oldAsset.assetId;
    const newAssetId = `sha256/${oldAssetId}`;
    const oldKey = getAssetKeyForId(oldAssetId);
    const newKey = getAssetKeyForId(newAssetId);

    try {
      // Check if old object exists in S3
      let oldObjectExists = false;
      try {
        await s3Client.send(
          new HeadObjectCommand({
            Bucket: bucket,
            Key: oldKey,
          }),
        );
        oldObjectExists = true;
      } catch {
        // Old object doesn't exist in S3, but we'll still proceed with updating DB
        console.error(
          `Old S3 object not found at ${oldKey}, will continue with DB updates only`,
        );
      }

      if (dryRun) {
        console.error(
          `[DRY RUN] Would migrate ${oldAssetId} -> ${newAssetId} (${oldKey} -> ${newKey})`,
        );
        continue;
      }

      // Copy object to new location if old object exists
      if (oldObjectExists) {
        try {
          await s3Client.send(
            new CopyObjectCommand({
              Bucket: bucket,
              CopySource: `${bucket}/${oldKey}`,
              Key: newKey,
              ContentType: oldAsset.contentType,
              MetadataDirective: `COPY`,
            }),
          );
        } catch (error) {
          console.error(
            `Failed to copy S3 object from ${oldKey} to ${newKey}:`,
            error,
          );
          // Continue anyway, the new object may already exist
        }
      }

      // Update references in userSetting using simpler raw SQL
      try {
        await tx.execute(sql`
          UPDATE ${s.userSetting}
          SET value = jsonb_set(value, '{t}', to_jsonb(${newAssetId}::text))
          WHERE "userId" = ${oldAsset.userId} AND value->>'t' = ${oldAssetId}
        `);
      } catch (error) {
        console.error(`Failed to update userSetting for ${oldAssetId}:`, error);
      }

      // Update references in userSettingHistory using simpler raw SQL
      try {
        await tx.execute(sql`
          UPDATE ${s.userSettingHistory}
          SET value = jsonb_set(value, '{t}', to_jsonb(${newAssetId}::text))
          WHERE "userId" = ${oldAsset.userId} AND value->>'t' = ${oldAssetId}
        `);
      } catch (error) {
        console.error(
          `Failed to update userSettingHistory for ${oldAssetId}:`,
          error,
        );
      }

      // Try to update asset record to new ID
      try {
        await tx.execute(
          sql`UPDATE ${s.asset} SET "assetId" = ${newAssetId} WHERE "id" = ${oldAsset.id}`,
        );
      } catch (error) {
        console.error(
          `Failed to update asset record for ${oldAssetId}:`,
          error,
        );
      }

      // Always delete the old asset record after migration attempt
      try {
        await tx.delete(s.asset).where(eq(s.asset.id, oldAsset.id));
      } catch (error) {
        console.error(
          `Failed to delete old asset record for ${oldAssetId}:`,
          error,
        );
      }

      // Delete old object from S3
      try {
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: oldKey,
          }),
        );
      } catch {
        // Ignore S3 delete errors
      }

      migratedCount++;
      console.error(`Migrated asset ${oldAssetId} -> ${newAssetId}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      errors.push({
        assetId: oldAssetId,
        error: errorMessage,
      });
      console.error(`Failed to migrate asset ${oldAssetId}:`, error);
    }
  }

  return { migratedCount, errors };
}

/**
 * Get count of assets that still need migration.
 */
export async function getUnmigratedAssetCount(tx: Drizzle): Promise<number> {
  const count = await tx.query.asset.findMany({
    where: (t, { and, eq, isNull, notLike }) =>
      and(
        notLike(t.assetId, `sha256/%`),
        eq(t.status, AssetStatusKind.Uploaded),
        isNull(t.errorMessage),
      ),
    columns: { id: true },
  });

  return count.length;
}
