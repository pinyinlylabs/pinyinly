import { hsk1SkillReview } from "#client/query.ts";
import { v4, v4Mutators } from "#data/rizzleSchema.ts";
import { r } from "#util/rizzle.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { ReplicacheOptions, TEST_LICENSE_KEY } from "replicache";

const testReplicacheOptions = {
  name: `test`,
  licenseKey: TEST_LICENSE_KEY,
  kvStore: `mem`,
  pullInterval: null,
  logLevel: `error`,
} satisfies ReplicacheOptions<never>;

void test(hsk1SkillReview.name, async () => {
  await test(`returns everything when no skills have state`, async () => {
    await using rizzle = r.replicache(testReplicacheOptions, v4, v4Mutators);

    // Sanity check that there should be a bunch in the queue
    assert.ok((await hsk1SkillReview(rizzle)).length > 100);
  });
});
