import { AssetStatusKind } from "#data/model.ts";
import type { Drizzle } from "#server/lib/db.ts";
import type { migrateAssetIdsBatch } from "#server/lib/migrateAssetIds.ts";
import { getUnmigratedAssetCount } from "#server/lib/migrateAssetIds.ts";
import * as s from "#server/pgSchema.ts";
import { describe, expect } from "vitest";
import { createUser, txTest } from "./dbHelpers.ts";

describe(
  `migrateAssetIds` satisfies HasNameOf<typeof migrateAssetIdsBatch>,
  () => {
    txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

    // Helper to create a test asset in the database
    async function createTestAsset(
      tx: Drizzle,
      opts: {
        userId: string;
        assetId: string;
        status?: (typeof AssetStatusKind)[keyof typeof AssetStatusKind];
      },
    ) {
      const [asset] = await tx
        .insert(s.asset)
        .values({
          userId: opts.userId,
          assetId: opts.assetId,
          status: opts.status ?? AssetStatusKind.Uploaded,
          contentType: `image/png`,
          contentLength: 1024,
        })
        .returning();

      return asset;
    }

    txTest(`finds assets that need migration`, async ({ tx }) => {
      const user = await createUser(tx);

      // Create an asset with old format (without sha256/ prefix)
      await createTestAsset(tx, {
        userId: user.id,
        assetId: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`, // 43 char hash
      });

      // Create an asset with new format (should be ignored)
      await createTestAsset(tx, {
        userId: user.id,
        assetId: `sha256/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb`,
      });

      const count = await getUnmigratedAssetCount(tx);
      expect(count).toBe(1);
    });

    txTest(`skips assets with pending status`, async ({ tx }) => {
      const user = await createUser(tx);

      // Create pending asset with old format
      await createTestAsset(tx, {
        userId: user.id,
        assetId: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`,
        status: AssetStatusKind.Pending,
      });

      const count = await getUnmigratedAssetCount(tx);
      expect(count).toBe(0);
    });
  },
);
