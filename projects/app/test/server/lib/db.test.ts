import { Skill, srsStateFromFsrsState } from "#data/rizzleSchema.ts";
import { englishToHanziWord } from "#data/skills.ts";
import { Drizzle, pgBatchUpdate, substring } from "#server/lib/db.ts";
import * as s from "#server/schema.ts";
import { nextReview, Rating } from "#util/fsrs.ts";
import { invariant } from "@haohaohow/lib/invariant";
import { eq } from "drizzle-orm";
import * as pg from "drizzle-orm/pg-core";
import assert from "node:assert/strict";
import test, { TestContext } from "node:test";
import { createUser, withDbTest, withTxTest } from "./dbHelpers";

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

await test(`${substring.name} suite`, async (t) => {
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

await test(`${pgBatchUpdate.name} suite`, async (t) => {
  const txTest = withTxTest(t);

  await txTest(`no updates should be no-op`, async (tx) => {
    await pgBatchUpdate(tx, {
      whereColumn: s.skillState.id,
      setColumn: s.skillState.srs,
      updates: [],
    });
  });

  await txTest(`throws when given different columns`, async (tx) => {
    await assert.rejects(
      pgBatchUpdate(tx, {
        whereColumn: s.skillState.id,
        setColumn: s.skillRating.id,
        updates: [],
      }),
    );
  });

  await txTest(`handles one update`, async (tx, { mock }) => {
    mock.timers.enable({ apis: [`Date`] });

    const user = await createUser(tx);
    const [skillState] = await tx
      .insert(s.skillState)
      .values([
        {
          userId: user.id,
          srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
          skill: englishToHanziWord(`我:i`),
        },
      ])
      .returning();
    invariant(skillState != null);

    mock.timers.tick(5000);

    const newSrs = srsStateFromFsrsState(
      nextReview(skillState.srs, Rating.Good),
    );
    await pgBatchUpdate(tx, {
      whereColumn: s.skillState.id,
      setColumn: s.skillState.srs,
      updates: [[skillState.id, newSrs]],
    });

    const updatedSkillState = await tx.query.skillState.findFirst({
      where: (t) => eq(t.id, skillState.id),
    });
    assert.deepEqual(updatedSkillState?.srs, newSrs);
  });

  await txTest(`handles many updates`, async (tx, { mock }) => {
    mock.timers.enable({ apis: [`Date`] });
    const user = await createUser(tx);

    const [skillState1, skillState2] = await tx
      .insert(s.skillState)
      .values([
        {
          userId: user.id,
          srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
          skill: englishToHanziWord(`我:i`),
        },
        {
          userId: user.id,
          srs: srsStateFromFsrsState(nextReview(null, Rating.Hard)),
          skill: englishToHanziWord(`两:pair`),
        },
      ])
      .returning();
    invariant(skillState1 != null && skillState2 != null);

    mock.timers.tick(5000);
    const newSkillState1Srs = srsStateFromFsrsState(
      nextReview(skillState1.srs, Rating.Good),
    );
    const newSkillState2Srs = srsStateFromFsrsState(
      nextReview(skillState2.srs, Rating.Good),
    );
    await pgBatchUpdate(tx, {
      whereColumn: s.skillState.id,
      setColumn: s.skillState.srs,
      updates: [
        [skillState1.id, newSkillState1Srs],
        [skillState2.id, newSkillState2Srs],
      ],
    });

    const updatedSkillState1 = await tx.query.skillState.findFirst({
      where: (t) => eq(t.id, skillState1.id),
    });
    assert.deepEqual(updatedSkillState1?.srs, newSkillState1Srs);

    const updatedSkillState2 = await tx.query.skillState.findFirst({
      where: (t) => eq(t.id, skillState2.id),
    });
    assert.deepEqual(updatedSkillState2?.srs, newSkillState2Srs);
  });

  typeChecks(`requires correct column types`, async () => {
    const tx = null as unknown as Drizzle;
    await pgBatchUpdate(tx, {
      whereColumn: s.skillState.skill,
      setColumn: s.skillRating.rating,
      updates: [
        // @ts-expect-error wrong where column type
        [`1`, Rating.Good],
        // @ts-expect-error wrong set column type
        [`` as Skill, `1`],
        [`` as Skill, Rating.Good],
      ],
    });
  });
});
