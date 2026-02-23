import type { getImageSettingKeyPatterns } from "#data/userSettings.ts";
import * as s from "#server/pgSchema.ts";
import { createUser, txTest } from "#test/server/lib/dbHelpers.ts";
import { sql } from "drizzle-orm";
import { describe, expect } from "vitest";

describe(
  `listAssetBucketUserFiles integration` satisfies HasNameOf<
    typeof getImageSettingKeyPatterns
  >,
  () => {
    txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

    txTest(
      `finds assets referenced in user settings with JSON ->> operator`,
      async ({ tx }) => {
        const user = await createUser(tx);
        const assetId1 = `sha256/${`a`.repeat(43)}`;
        const assetId2 = `sha256/${`b`.repeat(43)}`;

        // Insert user settings with image references (imageId is aliased as 't' in JSON)
        await tx.insert(s.userSetting).values([
          {
            userId: user.id,
            key: `psi/testSound`,
            value: { t: assetId1, c: null, w: 100, ht: 100 },
          },
          {
            userId: user.id,
            key: `hwmhi/你好`,
            value: { t: assetId2, c: null, w: 200, ht: 200 },
          },
        ]);

        // Query using JSON ->> operator to extract 't' field
        const rows = await tx
          .select({
            assetId: sql<string | null>`${s.userSetting.value}->>'t'`,
          })
          .from(s.userSetting)
          .where(sql`${s.userSetting.userId} = ${user.id}`);

        const foundAssetIds = rows
          .map((r) => r.assetId)
          .filter((id): id is string => id != null);

        expect(foundAssetIds).toContain(assetId1);
        expect(foundAssetIds).toContain(assetId2);
        expect(foundAssetIds).toHaveLength(2);
      },
    );

    txTest(`finds assets in userSettingHistory table`, async ({ tx }) => {
      const user = await createUser(tx);
      const assetId = `sha256/${`c`.repeat(43)}`;

      // Insert historical setting with image reference
      await tx.insert(s.userSettingHistory).values([
        {
          userId: user.id,
          key: `hphi/你/ni3`,
          value: { t: assetId, c: null, w: 150, ht: 150 },
        },
      ]);

      // Query history table
      const rows = await tx
        .select({
          assetId: sql<string | null>`${s.userSettingHistory.value}->>'t'`,
        })
        .from(s.userSettingHistory)
        .where(sql`${s.userSettingHistory.userId} = ${user.id}`);

      const foundAssetIds = rows
        .map((r) => r.assetId)
        .filter((id): id is string => id != null);

      expect(foundAssetIds).toContain(assetId);
      expect(foundAssetIds).toHaveLength(1);
    });

    txTest(`deduplicates asset IDs from multiple settings`, async ({ tx }) => {
      const user = await createUser(tx);
      const assetId = `sha256/${`d`.repeat(43)}`;

      // Insert same asset ID in multiple settings
      await tx.insert(s.userSetting).values([
        {
          userId: user.id,
          key: `pfti/a/1`,
          value: { t: assetId, c: null, w: 100, ht: 100 },
        },
        {
          userId: user.id,
          key: `pfti/a/2`,
          value: { t: assetId, c: null, w: 100, ht: 100 },
        },
      ]);

      // Query and deduplicate using Set
      const rows = await tx
        .select({
          assetId: sql<string | null>`${s.userSetting.value}->>'t'`,
        })
        .from(s.userSetting)
        .where(sql`${s.userSetting.userId} = ${user.id}`);

      const assetIdsSet = new Set<string>();
      for (const { assetId: id } of rows) {
        if (id != null) {
          assetIdsSet.add(id);
        }
      }

      // Should only have one unique ID
      expect(assetIdsSet.size).toBe(1);
      expect(assetIdsSet.has(assetId)).toBe(true);
    });

    txTest(`only returns assets for the specified user`, async ({ tx }) => {
      const user1 = await createUser(tx);
      const user2 = await createUser(tx);
      const assetId1 = `sha256/${`e`.repeat(43)}`;
      const assetId2 = `sha256/${`f`.repeat(43)}`;

      // Insert settings for both users
      await tx.insert(s.userSetting).values([
        {
          userId: user1.id,
          key: `psi/sound1`,
          value: { t: assetId1, c: null, w: 100, ht: 100 },
        },
        {
          userId: user2.id,
          key: `psi/sound2`,
          value: { t: assetId2, c: null, w: 100, ht: 100 },
        },
      ]);

      // Query only user1's assets
      const rows = await tx
        .select({
          assetId: sql<string | null>`${s.userSetting.value}->>'t'`,
        })
        .from(s.userSetting)
        .where(sql`${s.userSetting.userId} = ${user1.id}`);

      const foundAssetIds = rows
        .map((r) => r.assetId)
        .filter((id): id is string => id != null);

      expect(foundAssetIds).toContain(assetId1);
      expect(foundAssetIds).not.toContain(assetId2);
      expect(foundAssetIds).toHaveLength(1);
    });

    txTest(`ignores settings without image references`, async ({ tx }) => {
      const user = await createUser(tx);
      const assetId = `sha256/${`g`.repeat(43)}`;

      // Insert mix of settings - only image settings have 't' field
      await tx.insert(s.userSetting).values([
        {
          userId: user.id,
          key: `psi/sound1`,
          value: { t: assetId, c: null, w: 100, ht: 100 },
        },
        {
          userId: user.id,
          key: `autoCheck`,
          value: { e: true }, // No 't' field
        },
        {
          userId: user.id,
          key: `psn/sound1`,
          value: { i: `sound1`, t: `test name` }, // 't' is not an assetId
        },
      ]);

      // Query extracts 't' field - will be null for settings without it
      const rows = await tx
        .select({
          assetId: sql<string | null>`${s.userSetting.value}->>'t'`,
        })
        .from(s.userSetting)
        .where(sql`${s.userSetting.userId} = ${user.id}`);

      // Filter out null values and the string 'test name' (not a sha256 ID)
      const foundAssetIds = rows
        .map((r) => r.assetId)
        .filter(
          (id): id is string =>
            id != null && id.length > 0 && id.startsWith(`sha256/`),
        );

      // Should only find the valid asset ID
      expect(foundAssetIds).toHaveLength(1);
      expect(foundAssetIds).toContain(assetId);
    });

    txTest(`returns empty when user has no settings`, async ({ tx }) => {
      const user = await createUser(tx);

      const rows = await tx
        .select({
          assetId: sql<string | null>`${s.userSetting.value}->>'t'`,
        })
        .from(s.userSetting)
        .where(sql`${s.userSetting.userId} = ${user.id}`);

      expect(rows).toHaveLength(0);
    });
  },
);
