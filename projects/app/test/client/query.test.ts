import {
  computeSkillReviewQueue,
  flagsForSrsState,
  targetSkillsReviewQueue,
} from "#client/query.ts";
import {
  HanziText,
  PinyinText,
  QuestionFlagType,
  SrsType,
} from "#data/model.ts";
import { v7Mutators } from "#data/rizzleMutators.ts";
import { Skill, v7 } from "#data/rizzleSchema.ts";
import { Rating } from "#util/fsrs.ts";
import { nanoid } from "#util/nanoid.ts";
import { r } from "#util/rizzle.ts";
import { invariant } from "@haohaohow/lib/invariant";
import assert from "node:assert/strict";
import test from "node:test";
import { parseRelativeTimeShorthand } from "../data/helpers";
import { testReplicacheOptions } from "../util/rizzleHelpers";

await test(`${targetSkillsReviewQueue.name} suite`, async () => {
  await test(`returns everything when no skills have state`, async () => {
    await using rizzle = r.replicache(testReplicacheOptions(), v7, v7Mutators);

    // Sanity check that there should be a bunch in the queue
    const skills = await targetSkillsReviewQueue(rizzle);
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
    `he:八:eight`,
    // (blocked) he:刀:knife
    // (blocked) he:分:divide
  ]);
});

await test(`${computeSkillReviewQueue.name} suite`, async () => {
  await test(`incorrect answers in a quiz don't get scheduled prematurely`, async () => {
    const reviewQueue = await simulateSkillReviews({
      targetSkills: [`he:分:divide`],
      history: [
        // first question is 丿:slash but they get it wrong. 八 is one of the
        // wrong choices they submit so it's also marked wrong.
        `❌hanziGloss 丿 eight`,
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
      history: [`🟡 he:丿:slash`, `💤 1m`],
    });

    assert.deepEqual(reviewQueue, [
      `he:𠃌:radical`,
      `he:八:eight`,
      `he:丿:slash`,
      // (block) he:刀:knife
      // (block) he:分:divide
    ]);
  });

  await test(`dependencies unlock skills when they become stable enough`, async () => {
    const targetSkills: Skill[] = [`he:刀:knife`];
    const history: SkillReviewOp[] = [];

    const [review1] = await simulateSkillReviews({ targetSkills, history });
    assert.equal(review1, `he:丿:slash`);

    history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);
    const [review2] = await simulateSkillReviews({ targetSkills, history });
    assert.deepEqual([review2], [`he:𠃌:radical`]);

    history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);
    const [review3] = await simulateSkillReviews({ targetSkills, history });
    assert.deepEqual([review3], [`he:丿:slash`]);

    history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);
    const [review4] = await simulateSkillReviews({ targetSkills, history });
    assert.deepEqual([review4], [`he:𠃌:radical`]);

    history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);
    const [review5] = await simulateSkillReviews({ targetSkills, history });
    assert.deepEqual([review5], [`he:刀:knife`]);
  });

  await test(`doesn't get stuck reviewing the same skill after all due skills are done`, async () => {
    const targetSkills: Skill[] = [`he:分:divide`];
    const history: SkillReviewOp[] = [
      `❌ he:𠃌:radical`, // Get it wrong initially (so after all the reviews it will have lower "stability" than the others).
      `💤 5s`,
      `🟡 he:𠃌:radical`, // Then answer it correctly.
      `💤 5s`,
      `🟡 he:刀:knife`,
      `💤 5s`,
      `🟡 he:八:eight`,
      `💤 5s`,
      `🟡 he:分:divide`,
      `💤 5s`,
      `🟡 he:丿:slash`,
    ];

    const [review1] = await simulateSkillReviews({ targetSkills, history });
    history.push(`💤 10s`, `🟡 ${review1!}`);
    const [review2] = await simulateSkillReviews({ targetSkills, history });
    history.push(`💤 10s`, `🟡 ${review2!}`);
    const [review3] = await simulateSkillReviews({ targetSkills, history });

    assert.notDeepEqual(
      [review1, review2, review3],
      [review1, review1, review1],
    );
  });
});

await test(`${flagsForSrsState.name} suite`, async () => {
  await test(`marks a question as new if it has no srs`, async () => {
    assert.deepEqual(
      flagsForSrsState({
        type: SrsType.Mock,
        prevReviewAt: new Date(),
        nextReviewAt: new Date(),
      }),
      { type: QuestionFlagType.NewSkill },
    );
  });

  await test(`marks a question as new if it has fsrs state but is not stable enough to be introduced`, async () => {
    assert.deepEqual(flagsForSrsState(undefined), {
      type: QuestionFlagType.NewSkill,
    });
  });
});

type SkillReviewOp =
  | `${`🟢` | `🟡` | `🟠` | `❌`} ${Skill}`
  | `❌hanziGloss ${string} ${string}`
  | `❌hanziPinyin ${string} ${string}`
  | `💤 ${string}`;

/**
 * Testing helper to calculate a skill review queue based on a history of
 * simulated reviews.
 */
async function simulateSkillReviews({
  targetSkills,
  history,
}: {
  targetSkills: Skill[];
  history: SkillReviewOp[];
}): Promise<Skill[]> {
  await using rizzle = r.replicache(testReplicacheOptions(), v7, v7Mutators);
  let now = new Date();

  for (const event of history) {
    const [op, ...args] = event.split(` `);
    invariant(op != null);

    switch (op) {
      // jump forward in time
      case `💤`: {
        invariant(args[0] != null);
        now = parseRelativeTimeShorthand(args[0], now);
        break;
      }
      // mistakes
      case `❌hanziGloss`: {
        const [hanzi, gloss] = args as [HanziText, string];
        await rizzle.mutate.saveHanziGlossMistake({
          id: nanoid(),
          hanzi,
          gloss,
          now,
        });
        break;
      }
      case `❌hanziPinyin`: {
        const [hanzi, pinyin] = args as [HanziText, PinyinText];
        await rizzle.mutate.saveHanziPinyinMistake({
          id: nanoid(),
          hanzi,
          pinyin,
          now,
        });
        break;
      }
      // skill rating
      case `❌`:
      case `🟢`:
      case `🟡`:
      case `🟠`: {
        const rating =
          op === `🟢`
            ? Rating.Easy
            : op === `🟡`
              ? Rating.Good
              : op === `🟠`
                ? Rating.Hard
                : Rating.Again;
        const skills = args as Skill[]; // TODO: shuffle the skills to see if it's sensitive to ordering?

        for (const skill of skills) {
          await rizzle.mutate.rateSkill({
            id: nanoid(),
            skill,
            rating,
            now,
            durationMs: null,
          });
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
