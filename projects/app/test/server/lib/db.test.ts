import { substring } from "#server/lib/db.ts";
import * as s from "#server/schema.ts";
import * as pg from "drizzle-orm/pg-core";
import assert from "node:assert/strict";
import test, { TestContext } from "node:test";
import { withDbTest, withTxTest } from "./db";

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

void test(substring.name, async (t) => {
  const txTest = withTxTest(t);

  await txTest(`static query`, async (tx) => {
    const table = pg.pgTable(`tbl`, { col: pg.text() });

    assert.deepEqual(
      tx
        .select({ text: substring(table.col, /^\w+:(.+)$/) })
        .from(table)
        .toSQL(),
      {
        params: [`^\\w+:(.+)$`],
        sql: `select substring("col" from $1) from "tbl"`,
      },
    );
  });

  await txTest(`functional test`, async (tx) => {
    await tx.insert(s.user).values([{ id: `foo:bar` }]);

    assert.deepEqual(
      await tx
        .select({ text: substring(s.user.id, /^\w+:(.+)$/) })
        .from(s.user),
      [{ text: `bar` }],
    );
  });
});
