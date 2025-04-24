import {
  computeSkillReviewQueue,
  flagsForSrsState,
  targetSkillsReviewQueue,
} from "#client/query.ts";
import type { HanziText, PinyinText } from "#data/model.ts";
import { QuestionFlagType, SrsType } from "#data/model.ts";
import { v7Mutators } from "#data/rizzleMutators.ts";
import type { Skill } from "#data/rizzleSchema.ts";
import { v7 } from "#data/rizzleSchema.ts";
import type { SkillReviewQueue } from "#data/skills.ts";
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
    const { available } = await targetSkillsReviewQueue(rizzle);
    assert.ok(available.length > 100);
  });
});

await test(`${simulateSkillReviews.name} returns a review queue`, async () => {
  const reviewQueue = await simulateSkillReviews({
    targetSkills: [`he:分:divide`],
    history: [],
  });

  assert.partialDeepStrictEqual(reviewQueue, {
    available: [`he:丿:slash`, `he:𠃌:radical`, `he:八:eight`],
    blocked: [`he:刀:knife`, `he:分:divide`],
  });
});

await test(`${computeSkillReviewQueue.name} suite`, async () => {
  await test(`incorrect answers in a quiz don't get scheduled prematurely`, async () => {
    const { available } = await simulateSkillReviews({
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
    const 𠃌Index = available.indexOf(`he:𠃌:radical`);
    const 八Index = available.indexOf(`he:八:eight`);
    assert.ok(
      𠃌Index < 八Index,
      `he:𠃌:radical should be scheduled before he:八:eight`,
    );
  });

  await test(`learns new skills before not-due skills (stable sorted to maintain graph order)`, async () => {
    const reviewQueue = await simulateSkillReviews({
      targetSkills: [`he:分:divide`],
      history: [`🟡 he:丿:slash`, `💤 1m`],
    });

    assert.partialDeepStrictEqual(reviewQueue, {
      available: [`he:𠃌:radical`, `he:八:eight`, `he:丿:slash`],
      blocked: [`he:刀:knife`, `he:分:divide`],
    });
  });

  await test(`skills unblock dependant skills when they become stable enough`, async () => {
    const targetSkills: Skill[] = [`he:刀:knife`];
    const history: SkillReviewOp[] = [];

    {
      const { blocked } = await simulateSkillReviews({ targetSkills, history });
      assert.deepEqual(blocked, [`he:刀:knife`]);
    }

    history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);

    {
      const { blocked } = await simulateSkillReviews({ targetSkills, history });
      assert.deepEqual(blocked, [`he:刀:knife`]);
    }

    history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);

    {
      const { blocked } = await simulateSkillReviews({ targetSkills, history });
      assert.deepEqual(blocked, [`he:刀:knife`]);
    }

    history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);

    {
      const { blocked } = await simulateSkillReviews({ targetSkills, history });
      assert.deepEqual(blocked, [`he:刀:knife`]);
    }

    history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);

    {
      const { available, blocked } = await simulateSkillReviews({
        targetSkills,
        history,
      });
      expect(available).toContain(`he:刀:knife`);
      assert.deepEqual(blocked, []);
    }
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

    const {
      available: [review1],
    } = await simulateSkillReviews({ targetSkills, history });

    // Doesn't get stuck reviewing he:𠃌:radical just because it had a lower stability.
    assert.notDeepEqual([review1], [`he:𠃌:radical`]);
  });

  await test(`skills that are stale (heavily over-due and not stable) are treated as new skills`, async () => {
    const targetSkills: Skill[] = [`he:刀:knife`];
    const history: SkillReviewOp[] = [
      `❌ he:刀:knife`, // Get it wrong initially so it's considered introduced but not very stable.
      `💤 1h`, // Wait a short time so we can test that it's actually scheduled first again (base case).
    ];

    {
      const queue = await simulateSkillReviews({
        targetSkills,
        history,
      });
      assert.partialDeepStrictEqual(queue, {
        available: [
          `he:刀:knife`,
          // These come later because he:刀:knife is due.
          `he:丿:slash`,
          `he:𠃌:radical`,
        ],
        blocked: [],
        dueCount: 1,
        overDueCount: 0,
      });
    }

    history.push(`💤 100d`); // Wait a long time without reviewing it, so it's essentially stale.

    {
      const queue = await simulateSkillReviews({
        targetSkills,
        history,
      });
      assert.partialDeepStrictEqual(queue, {
        available: [`he:丿:slash`, `he:𠃌:radical`],
        blocked: [
          // Now this comes last because it's "stale" and reset to new.
          `he:刀:knife`,
        ],
        dueCount: 0,
        overDueCount: 0,
      });
    }
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
}): Promise<SkillReviewQueue> {
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

  return await computeSkillReviewQueue(rizzle, targetSkills, now);
}
