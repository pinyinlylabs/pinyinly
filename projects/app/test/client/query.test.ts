import {
  computeSkillReviewQueue,
  flagsForSkillState,
  hsk1SkillReview,
} from "#client/query.ts";
import { QuestionFlagType } from "#data/model.ts";
import {
  Skill,
  skillStateFromFsrsReview,
  v6,
  v6Mutators,
} from "#data/rizzleSchema.ts";
import { nextReview, Rating } from "#util/fsrs.ts";
import { nanoid } from "#util/nanoid.ts";
import { r } from "#util/rizzle.ts";
import { invariant } from "@haohaohow/lib/invariant";
import assert from "node:assert/strict";
import test from "node:test";
import { testReplicacheOptions } from "../util/rizzleHelpers";

await test(`${hsk1SkillReview.name} suite`, async () => {
  await test(`returns everything when no skills have state`, async () => {
    await using rizzle = r.replicache(testReplicacheOptions(), v6, v6Mutators);

    // Sanity check that there should be a bunch in the queue
    const skills = await hsk1SkillReview(rizzle);
    assert.ok(skills.length > 100);
  });
});

await test(`${simulateSkillReviews.name} returns a review queue`, async () => {
  const reviewQueue = await simulateSkillReviews({
    targetSkills: [`he:分:divide`],
    history: [],
  });

  assert.deepEqual(reviewQueue, [
    `he:丿:slash`,
    `he:𠃌:radical`,
    `he:刀:knife`,
    `he:八:eight`,
    `he:分:divide`,
  ]);
});

await test(`${computeSkillReviewQueue.name} suite`, async () => {
  await test(`incorrect answers in a quiz don't get scheduled prematurely`, async () => {
    const reviewQueue = await simulateSkillReviews({
      targetSkills: [`he:分:divide`],
      history: [
        // first question is 丿:slash but they get it wrong. 八 is one of the
        // wrong choices they submit so it's also marked wrong.
        `❌ he:丿:slash he:八:eight`,
        `💤 1h`, // wait past he:八:eight due date
      ],
    });

    // Make sure 八 didn't jump the queue before 𠃌 because it hasn't been
    // introduced yet, instead they should have to answer 𠃌 again.
    const 𠃌Index = reviewQueue.indexOf(`he:𠃌:radical`);
    const 八Index = reviewQueue.indexOf(`he:八:eight`);
    assert.ok(
      𠃌Index < 八Index,
      `he:𠃌:radical should be scheduled before he:八:eight`,
    );
  });

  await test(`learns new skills first (stable sorted to maintain graph order) rather than reviewing not-due skills`, async () => {
    const reviewQueue = await simulateSkillReviews({
      targetSkills: [`he:分:divide`],
      history: [`✅ he:丿:slash`, `💤 1m`],
    });

    assert.deepEqual(reviewQueue, [
      `he:𠃌:radical`,
      `he:刀:knife`,
      `he:八:eight`,
      `he:分:divide`,
      `he:丿:slash`,
    ]);
  });
});

await test(`${flagsForSkillState.name} suite`, async () => {
  await test(`marks a question as new if it has no srs`, async () => {
    assert.deepEqual(
      flagsForSkillState({ srs: null, createdAt: new Date(), due: new Date() }),
      { type: QuestionFlagType.NewSkill },
    );
  });

  await test(`marks a question as new if it has fsrs state but is not stable enough to be introduced`, async () => {
    assert.deepEqual(
      flagsForSkillState(
        skillStateFromFsrsReview(nextReview(null, Rating.Again)),
      ),
      { type: QuestionFlagType.NewSkill },
    );
  });
});

/**
 * Testing helper to calculate a skill review queue based on a history of
 * simulated reviews.
 */
async function simulateSkillReviews({
  targetSkills,
  history,
}: {
  targetSkills: Skill[];
  history: (`${`✅` | `❌`} ${Skill}` | `💤 ${string}`)[];
}): Promise<Skill[]> {
  await using rizzle = r.replicache(testReplicacheOptions(), v6, v6Mutators);
  let now = new Date();

  for (const event of history) {
    const [op, ...args] = event.split(` `);
    invariant(op != null);

    switch (op) {
      // jump forward in time
      case `💤`: {
        const durationString = args[0];
        invariant(durationString != null);
        const durationParseResult = /^(\d+)([smh])$/.exec(durationString);
        invariant(
          durationParseResult != null,
          `invalid duration ${durationString}`,
        );
        const [, multiple, unit] = durationParseResult;
        const duration = Number(multiple) * { s: 1, m: 60, h: 3600 }[unit!]!;
        now = new Date(now.getTime() + duration * 1000);
        break;
      }
      // skill rating
      case `❌`:
      case `✅`: {
        const rating = op === `✅` ? Rating.Easy : Rating.Again;
        const skills = args as Skill[]; // TODO: shuffle the skills to see if it's sensitive to ordering?

        for (const skill of skills) {
          await rizzle.mutate.rateSkill({ id: nanoid(), skill, rating, now });
        }
        break;
      }
      default: {
        throw new Error(`Invalid operation: ${op}`);
      }
    }
  }

  const reviewQueue = await computeSkillReviewQueue(rizzle, targetSkills, now);
  return reviewQueue;
}
