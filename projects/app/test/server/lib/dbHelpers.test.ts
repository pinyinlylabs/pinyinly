// pyly-standalone-test
import * as s from "#server/pgSchema.ts";
import { describe, expect } from "vitest";
import { dbTest } from "./dbHelpers";

describe(`${dbTest.name} examples`, () => {
  dbTest(`should work with inline fixtures 1`, async ({ db }) => {
    await db.insert(s.user).values([{ id: `1` }]);

    // Your test logic here
    const users = await db.select().from(s.user);
    expect(users.length).toBe(1);
  });
});
