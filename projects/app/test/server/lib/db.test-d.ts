import { withDrizzle } from "#server/lib/db.ts";
import * as s from "#server/pgSchema.ts";
import { describe, test } from "vitest";

describe(`eslint-plugin-drizzle tests`, () => {
  test(`eslint`, async () => {
    await withDrizzle(async (db) => {
      // oxlint-disable-next-line drizzle-js/enforce-delete-with-where
      await db.delete(s.authSession);
    });
  });
});
