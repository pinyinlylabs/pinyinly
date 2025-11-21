import type { SrsStateType } from "#data/model.ts";
import { SkillKind } from "#data/model.ts";
import type { Skill } from "#data/rizzleSchema.ts";
import { rSkillKind } from "#data/rizzleSchema.ts";
import type { LatestSkillRating, SkillLearningGraph } from "#data/skills.ts";
import { skillReviewQueue } from "#data/skills.ts";
import { Rating } from "#util/fsrs.ts";
import { invariant } from "@pinyinly/lib/invariant";
import { bench, expect } from "vitest";
import { mockSrsState } from "../data/helpers.ts";

// Add a regression test to make sure Vitest bench mode sets the `MODE`
// environment variable to 'benchmark'. This is assumed in other places in the
// code.
expect(process.env[`MODE`]).toBe(`benchmark`);

function makeLargeSkillReviewFixture({
  skillCount,
  introducedCount,
  ratingCount,
  branchingFactor = 8,
  now = new Date(`2025-01-01T00:00:00.000Z`),
}: {
  skillCount: number;
  introducedCount: number;
  ratingCount: number;
  branchingFactor?: number;
  now?: Date;
}): {
  graph: SkillLearningGraph;
  skillSrsStates: Map<Skill, SrsStateType>;
  latestSkillRatings: Map<Skill, LatestSkillRating>;
  skills: readonly Skill[];
  now: Date;
} {
  invariant(introducedCount <= skillCount);

  const secondaryFactor = branchingFactor * branchingFactor;
  const skillPrefix = rSkillKind().marshal(SkillKind.HanziWordToGloss);
  const skills: Skill[] = Array.from(
    { length: skillCount },
    (_, index) => `${skillPrefix}:perf-${index}` as Skill,
  );

  const graph: SkillLearningGraph = new Map();
  for (let index = 0; index < skillCount; index++) {
    const skill = skills[index]!;
    const dependencies = new Set<Skill>();

    if (index > 0) {
      const primaryParent = skills[Math.floor((index - 1) / branchingFactor)]!;
      if (primaryParent !== skill) {
        dependencies.add(primaryParent);
      }

      const secondaryIndex = Math.floor((index - 1) / secondaryFactor);
      if (secondaryIndex > 0) {
        dependencies.add(skills[secondaryIndex]!);
      }
    }

    graph.set(skill, { skill, dependencies });
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;
  const skillSrsStates = new Map<Skill, SrsStateType>();
  for (let index = 0; index < introducedCount; index++) {
    const skill = skills[index]!;
    const prevReviewAt = new Date(now.getTime() - (40 + (index % 10)) * dayMs);
    const nextReviewAt =
      index % 5 === 0
        ? new Date(now.getTime() - ((index % 6) + 1) * hourMs)
        : new Date(now.getTime() + ((index % 6) + 1) * hourMs);
    skillSrsStates.set(skill, mockSrsState(prevReviewAt, nextReviewAt));
  }

  const latestSkillRatings = new Map<Skill, LatestSkillRating>();
  for (let index = 0; index < ratingCount; index++) {
    const skill = skills[index % skills.length]!;
    latestSkillRatings.set(skill, {
      skill,
      rating: index % 4 === 0 ? Rating.Again : Rating.Good,
      createdAt: new Date(now.getTime() - index * 90 * 1000),
    });
  }

  return { graph, skillSrsStates, latestSkillRatings, skills, now };
}

const { graph, skillSrsStates, latestSkillRatings, now } =
  makeLargeSkillReviewFixture({
    skillCount: 1000,
    introducedCount: 800,
    ratingCount: 600,
  });

bench(
  `handles large graphs within performance budget`,
  () => {
    skillReviewQueue({
      graph,
      skillSrsStates,
      latestSkillRatings,
      isStructuralHanzi: () => false,
      now,
      maxQueueItems: graph.size,
    });
  },
  { time: 2000 },
);
