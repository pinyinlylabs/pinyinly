import type { Skill } from "#data/rizzleSchema.ts";
import { srsStateFromFsrsState } from "#data/rizzleSchema.ts";
import { glossToHanziWord } from "#data/skills.ts";
import type { Drizzle } from "#server/lib/db.ts";
import { pgBatchUpdate, substring } from "#server/lib/db.ts";
import * as s from "#server/pgSchema.ts";
import { nextReview, Rating } from "#util/fsrs.ts";
import { invariant } from "@pinyinly/lib/invariant";
import { eq } from "drizzle-orm";
import * as pg from "drizzle-orm/pg-core";
import { describe, expect, vi } from "vitest";
import { createUser, txTest } from "./dbHelpers.ts";

function typeChecks(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

describe(`substring suite` satisfies HasNameOf<typeof substring>, () => {
  txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

  txTest(`static query`, async ({ tx }) => {
    const table = pg.pgTable(`tbl`, { col: pg.text() });

    expect(
      tx
        .select({ text: substring(table.col, /^\w+:(.+)$/) })
        .from(table)
        .toSQL(),
    ).toEqual({
      params: [`^\\w+:(.+)$`],
      sql: `select substring("col" from $1) from "tbl"`,
    });
  });

  txTest(`functional test`, async ({ tx }) => {
    await tx.insert(s.user).values([{ id: `foo:bar` }]);

    expect(
      await tx
        .select({ text: substring(s.user.id, /^\w+:(.+)$/) })
        .from(s.user),
    ).toEqual([{ text: `bar` }]);
  });
});

describe(
  `pgBatchUpdate suite` satisfies HasNameOf<typeof pgBatchUpdate>,
  () => {
    txTest.scoped({ pgConfig: { isolationLevel: `repeatable read` } });

    txTest(`no updates should be no-op`, async ({ tx }) => {
      const result = await pgBatchUpdate(tx, {
        whereColumn: s.skillState.id,
        setColumn: s.skillState.srs,
        updates: [],
      });

      expect(result).toEqual({ affectedRows: 0 });
    });

    txTest(`throws when given different columns`, async ({ tx }) => {
      await expect(
        pgBatchUpdate(tx, {
          whereColumn: s.skillState.id,
          setColumn: s.skillRating.id,
          updates: [],
        }),
      ).rejects.toThrow();
    });

    txTest(`handles one update`, async ({ tx }) => {
      vi.useFakeTimers();

      const user = await createUser(tx);
      const [skillState] = await tx
        .insert(s.skillState)
        .values([
          {
            userId: user.id,
            srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
            skill: glossToHanziWord(`我:i`),
          },
        ])
        .returning();
      invariant(skillState != null);

      vi.advanceTimersByTime(5000);

      const newSrs = srsStateFromFsrsState(
        nextReview(skillState.srs, Rating.Good),
      );
      const result = await pgBatchUpdate(tx, {
        whereColumn: s.skillState.id,
        setColumn: s.skillState.srs,
        updates: [[skillState.id, newSrs]],
      });
      expect(result).toEqual({ affectedRows: 1 });

      const updatedSkillState = await tx.query.skillState.findFirst({
        where: (t) => eq(t.id, skillState.id),
      });
      expect(updatedSkillState?.srs).toEqual(newSrs);
    });

    txTest(`handles many updates`, async ({ tx }) => {
      vi.useFakeTimers();
      const user = await createUser(tx);

      const [skillState1, skillState2] = await tx
        .insert(s.skillState)
        .values([
          {
            userId: user.id,
            srs: srsStateFromFsrsState(nextReview(null, Rating.Good)),
            skill: glossToHanziWord(`我:i`),
          },
          {
            userId: user.id,
            srs: srsStateFromFsrsState(nextReview(null, Rating.Hard)),
            skill: glossToHanziWord(`两:pair`),
          },
        ])
        .returning();
      invariant(skillState1 != null && skillState2 != null);

      vi.advanceTimersByTime(5000);
      const newSkillState1Srs = srsStateFromFsrsState(
        nextReview(skillState1.srs, Rating.Good),
      );
      const newSkillState2Srs = srsStateFromFsrsState(
        nextReview(skillState2.srs, Rating.Good),
      );
      const result = await pgBatchUpdate(tx, {
        whereColumn: s.skillState.id,
        setColumn: s.skillState.srs,
        updates: [
          [skillState1.id, newSkillState1Srs],
          [skillState2.id, newSkillState2Srs],
        ],
      });
      expect(result).toEqual({ affectedRows: 2 });

      const updatedSkillState1 = await tx.query.skillState.findFirst({
        where: (t) => eq(t.id, skillState1.id),
      });
      expect(updatedSkillState1?.srs).toEqual(newSkillState1Srs);

      const updatedSkillState2 = await tx.query.skillState.findFirst({
        where: (t) => eq(t.id, skillState2.id),
      });
      expect(updatedSkillState2?.srs).toEqual(newSkillState2Srs);
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
  },
);
