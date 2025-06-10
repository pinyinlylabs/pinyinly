// hhh-standalone-test
import * as s from "#server/schema.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { withDbTest } from "./dbHelpers";

await test(`${withDbTest.name} examples`, async (t) => {
  const dbTest = withDbTest(t);

  await dbTest(`should work with inline fixtures 1`, async (db) => {
    await db.insert(s.user).values([{ id: `1` }]);

    // Your test logic here
    const users = await db.select().from(s.user);
    assert.equal(users.length, 1);
  });
});
