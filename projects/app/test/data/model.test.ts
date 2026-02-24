import { assetIdSchema } from "#data/model.ts";
import { describe, expect, test } from "vitest";

describe(`assetIdSchema` satisfies HasNameOf<typeof assetIdSchema>, () => {
  test(`accepts valid sha256 base64url asset IDs`, () => {
    // Each hash must be exactly 43 characters
    const validIds = [
      `sha256/${`a`.repeat(43)}`,
      `sha256/${`0123456789`.repeat(4) + `012`}`, // 43 chars
      `sha256/${`abc`.repeat(14) + `a`}`, // 43 chars
      `sha256/${`_`.repeat(43)}`,
      `sha256/${`-`.repeat(43)}`,
    ];

    for (const id of validIds) {
      const result = assetIdSchema.safeParse(id);
      if (!result.success) {
        console.error(`Failed for id: ${id}`, result.error);
      }
      expect(result.success).toBe(true);
    }
  });

  test(`rejects asset IDs with wrong prefix`, () => {
    const result = assetIdSchema.safeParse(
      `sha512/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO`,
    );
    expect(result.success).toBe(false);
  });

  test(`rejects asset IDs with missing prefix`, () => {
    const result = assetIdSchema.safeParse(
      `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNO`,
    );
    expect(result.success).toBe(false);
  });

  test(`rejects asset IDs with wrong hash length`, () => {
    // Too short
    expect(
      assetIdSchema.safeParse(`sha256/abcdefghijklmnopqrstuvwxyz`).success,
    ).toBe(false);

    // Too long
    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRST`,
      ).success,
    ).toBe(false);
  });

  test(`rejects asset IDs with invalid base64url characters`, () => {
    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz+BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);

    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz/BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);

    expect(
      assetIdSchema.safeParse(
        `sha256/abcdefghijklmnopqrstuvwxyz=BCDEFGHIJKLMNO`,
      ).success,
    ).toBe(false);
  });

  test(`rejects empty string`, () => {
    expect(assetIdSchema.safeParse(``).success).toBe(false);
  });
});
