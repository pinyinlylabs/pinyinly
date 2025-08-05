import { describe, expect, test } from "vitest";
import { testExpoServer } from "../helpers.ts";

describe(`API smoke tests`, { timeout: 20_000 }, () => {
  test.skip(`/api/trpc/invalid`, { timeout: 50_000 }, async () => {
    // Test that the API can be bundled and executed using Metro. Metro uses its
    // own Babel configuration which is different from running the unit tests in
    // Node.js, so it's important to actually run it like it would in production
    // and make sure that the code transforms correctly and can executed.
    //
    // There were issues in the past where `import.meta.filename` worked in
    // Node.js but didn't in the Metro bundle.
    await using server = testExpoServer();
    await server.untilReady();

    const response = await server.fetch(`/api/trpc/invalid`);
    expect(response.status).toBe(404);
  });
});
