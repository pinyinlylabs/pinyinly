import * as s from "#server/pgSchema.ts";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { listReferencedAssetIdsForUser } from "#server/lib/assetSync.ts";

const { mockWithDrizzle, mockGetImageSettingKeyPatterns } = vi.hoisted(() => {
  return {
    mockWithDrizzle: vi.fn(),
    mockGetImageSettingKeyPatterns: vi.fn(),
  };
});

vi.mock(`#server/lib/db.ts`, () => ({
  withDrizzle: mockWithDrizzle,
}));

vi.mock(`#data/userSettings.ts`, () => ({
  getImageSettingKeyPatterns: mockGetImageSettingKeyPatterns,
}));

type AssetRow = { assetId: string | null };

function mockDbForReferencedAssets(
  currentSettings: AssetRow[],
  historicalSettings: AssetRow[],
) {
  return {
    select() {
      return {
        from(table: unknown) {
          return {
            async where() {
              if (table === s.userSetting) {
                return currentSettings;
              }
              if (table === s.userSettingHistory) {
                return historicalSettings;
              }
              return [];
            },
          };
        },
      };
    },
  };
}

function mockReferencedAssets(
  currentSettings: AssetRow[],
  historicalSettings: AssetRow[],
) {
  mockWithDrizzle.mockImplementation(
    async <T>(callback: (db: unknown) => Promise<T>) => {
      return callback(
        mockDbForReferencedAssets(currentSettings, historicalSettings),
      );
    },
  );
}

describe(
  `listReferencedAssetIdsForUser integration` satisfies HasNameOf<
    typeof listReferencedAssetIdsForUser
  >,
  () => {
    beforeEach(() => {
      mockWithDrizzle.mockReset();
      mockGetImageSettingKeyPatterns.mockReset();

      mockGetImageSettingKeyPatterns.mockReturnValue([
        `psi/%`,
        `hwmhi/%`,
        `hphi/%`,
        `pfti/%`,
      ]);
    });

    test(`returns referenced assets from current and historical settings`, async () => {
      const currentAssetId = `sha256/${`a`.repeat(43)}`;
      const historicalAssetId = `sha256/${`b`.repeat(43)}`;

      mockReferencedAssets(
        [{ assetId: currentAssetId }],
        [{ assetId: historicalAssetId }],
      );

      const result = await listReferencedAssetIdsForUser(`user-1`);

      expect(result).toContain(currentAssetId);
      expect(result).toContain(historicalAssetId);
      expect(result).toHaveLength(2);
    });

    test(`deduplicates IDs and filters invalid asset IDs`, async () => {
      const validAssetId = `sha256/${`c`.repeat(43)}`;

      mockReferencedAssets(
        [
          { assetId: validAssetId },
          { assetId: validAssetId },
          { assetId: `not-an-asset-id` },
          { assetId: `` },
          { assetId: null },
        ],
        [{ assetId: validAssetId }],
      );

      const result = await listReferencedAssetIdsForUser(`user-2`);

      expect(result).toEqual([validAssetId]);
    });

    test(`returns empty array when no referenced assets are found`, async () => {
      mockReferencedAssets([], [{ assetId: null }, { assetId: `` }]);

      const result = await listReferencedAssetIdsForUser(`user-3`);

      expect(result).toEqual([]);
    });
  },
);
