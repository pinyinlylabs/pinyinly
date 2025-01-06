import { Skill, SrsType } from "@/data/model";
import * as r from "@/data/rizzleSchema";
import { UpcomingReview, nextReview } from "@/util/fsrs";
import { invariant } from "@haohaohow/lib/invariant";
import { and, asc, eq } from "drizzle-orm";
import * as schema from "../schema";
import { Drizzle } from "./db";

export async function updateSkillState(
  tx: Drizzle,
  skill: Skill,
  userId: string,
) {
  // WARNING: very inefficient, but stable. Reading all historical ratings just
  // to compute the new one should be skipped and instead just the latest
  // `skillState` should be used as the starting point.

  // Read all historical skill ratings.
  const ratings = await tx.query.skillRating.findMany({
    where: and(
      eq(schema.skillRating.skill, skill),
      eq(schema.skillRating.userId, userId),
    ),
    orderBy: [asc(schema.skillRating.createdAt)],
  });

  // Starting from the null state, apply each skill rating.
  let state: UpcomingReview | null = null;
  for (const rr of ratings) {
    state = nextReview(state, r.rFsrsRating.unmarshal(rr.rating), rr.createdAt);
  }

  invariant(state !== null);

  // Save the new state.
  {
    const srs = {
      type: SrsType.FsrsFourPointFive,
      stability: state.stability,
      difficulty: state.difficulty,
    };
    const dueAt = state.due;
    const createdAt = state.created;

    await tx
      .insert(schema.skillState)
      .values([{ userId, skill, srs, dueAt, createdAt }])
      .onConflictDoUpdate({
        target: [schema.skillState.userId, schema.skillState.skill],
        set: { srs, dueAt, createdAt },
      });
  }
}
