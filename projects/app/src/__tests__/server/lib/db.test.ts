import * as s from "#server/schema.ts";
import { TestContext } from "node:test";
import { withDbTest } from "./db";

function typeChecks(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

typeChecks(`eslint-plugin-drizzle tests`, (t: TestContext) => {
  const dbTest = withDbTest(t);

  void dbTest(`eslint`, async (tx) => {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    tx.delete(s.authSession);
  });
});
