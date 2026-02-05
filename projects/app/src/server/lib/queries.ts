import type { Skill, SrsStateType } from "@/data/model";
import { SrsKind } from "@/data/model";
import * as schema from "@/server/pgSchema";
import type { FsrsState } from "@/util/fsrs";
import { nextReview } from "@/util/fsrs";
import { and, asc, eq, isNull } from "drizzle-orm";
import type { Drizzle } from "./db";

export async function updateSkillState(
  tx: Drizzle,
  skill: Skill,
  userId: string,
) {
  // WARNING: very inefficient, but stable. Reading all historical ratings just
  // to compute the new one should be skipped and instead just the latest
  // `skillState` should be used as the starting point.

  // Read all historical skill ratings (excluding trashed ones).
  const skillRatings = await tx.query.skillRating.findMany({
    where: and(
      eq(schema.skillRating.skill, skill),
      eq(schema.skillRating.userId, userId),
      isNull(schema.skillRating.trashedAt),
    ),
    orderBy: [asc(schema.skillRating.createdAt)],
  });

  // Starting from the null state, apply each skill rating.
  let fsrsState: FsrsState | null = null;
  for (const { rating, createdAt } of skillRatings) {
    fsrsState = nextReview(fsrsState, rating, createdAt);
  }

  if (fsrsState === null) {
    // No ratings remain (all were undone), delete the skill state
    await tx
      .delete(schema.skillState)
      .where(
        and(
          eq(schema.skillState.userId, userId),
          eq(schema.skillState.skill, skill),
        ),
      );
    return;
  }

  // Save the new state.
  {
    const srs = {
      kind: SrsKind.FsrsFourPointFive,
      ...fsrsState,
    } satisfies SrsStateType;

    await tx
      .insert(schema.skillState)
      .values([{ userId, skill, srs }])
      .onConflictDoUpdate({
        target: [schema.skillState.userId, schema.skillState.skill],
        set: { srs },
      });
  }
}
