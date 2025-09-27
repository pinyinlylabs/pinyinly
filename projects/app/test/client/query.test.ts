// @vitest-environment happy-dom

import { computeSkillReviewQueue } from "#client/query.ts";
import type {
  HanziText,
  PinyinPronunciationSpaceSeparated,
} from "#data/model.ts";
import { mutators } from "#data/rizzleMutators.ts";
import type { Skill } from "#data/rizzleSchema.ts";
import { currentSchema, rSpaceSeparatedString } from "#data/rizzleSchema.ts";
import type { SkillReviewQueue } from "#data/skills.ts";
import { Rating } from "#util/fsrs.ts";
import { nanoid } from "#util/nanoid.ts";
import { r } from "#util/rizzle.ts";
import { invariant } from "@pinyinly/lib/invariant";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { parseRelativeTimeShorthand } from "../data/helpers.ts";
import { testReplicacheOptions } from "../util/rizzleHelpers.ts";

beforeEach(() => {
  vi.spyOn(console, `log`).mockImplementation(() => {
    // no-op, don't pollute test output
  });
});

afterEach(() => {
  vi.resetAllMocks();
});

test(
  `simulateSkillReviews returns a review queue` satisfies HasNameOf<
    typeof simulateSkillReviews
  >,
  async () => {
    const reviewQueue = await simulateSkillReviews({
      targetSkills: [`he:分:divide`],
      history: [],
    });

    expect(reviewQueue).toMatchObject({
      items: [`he:八:eight`, `he:丿:slash`, `he:𠃌:radical`],
      blockedItems: [`he:刀:knife`, `he:分:divide`],
    });
  },
);

describe(
  `computeSkillReviewQueue suite` satisfies HasNameOf<
    typeof computeSkillReviewQueue
  >,
  () => {
    test(`incorrect answers in a quiz don't get scheduled prematurely`, async () => {
      // There was a bug where "wrong answers" were being scheduled for review
      // even though they'd never been introduced yet. This is a regression test
      // against that scenario.

      const { items } = await simulateSkillReviews({
        targetSkills: [`he:分:divide`],
        history: [
          // first question is he:八:eight but they get it wrong. 𠃌 is one of the
          // wrong choices they submit so it's also marked wrong.
          `❌hanziGloss 八 radical`,
          `💤 1h`, // wait past he:𠃌:radical due date
        ],
      });

      expect(items).toMatchInlineSnapshot(`
        [
          "he:八:eight",
          "he:丿:slash",
          "he:𠃌:radical",
        ]
      `);

      // Make sure 𠃌 didn't jump the queue before 八 because it hasn't been
      // introduced yet, instead they should have to answer 八 again.
      const 𠃌Index = items.indexOf(`he:𠃌:radical`);
      const 八Index = items.indexOf(`he:八:eight`);

      // he:八:eight should be scheduled before he:𠃌:radical
      expect(𠃌Index).toBeGreaterThan(八Index);
    });

    test(`learns new skills before not-due skills (stable sorted to maintain graph order)`, async () => {
      const reviewQueue = await simulateSkillReviews({
        targetSkills: [`he:分:divide`],
        history: [`🟡 he:丿:slash`, `💤 1m`],
      });

      expect(reviewQueue).toMatchObject({
        items: [`he:八:eight`, `he:𠃌:radical`, `he:丿:slash`],
        blockedItems: [`he:刀:knife`, `he:分:divide`],
      });
    });

    test(`skills unblock dependant skills when they become stable enough`, async () => {
      const targetSkills: Skill[] = [`he:刀:knife`];
      const history: SkillReviewOp[] = [];

      {
        const { blockedItems } = await simulateSkillReviews({
          targetSkills,
          history,
        });
        expect(blockedItems).toEqual([`he:刀:knife`]);
      }

      history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);

      {
        const { blockedItems } = await simulateSkillReviews({
          targetSkills,
          history,
        });
        expect(blockedItems).toEqual([`he:刀:knife`]);
      }

      history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);

      {
        const { blockedItems } = await simulateSkillReviews({
          targetSkills,
          history,
        });
        expect(blockedItems).toEqual([`he:刀:knife`]);
      }

      history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);

      {
        const { blockedItems } = await simulateSkillReviews({
          targetSkills,
          history,
        });
        expect(blockedItems).toEqual([`he:刀:knife`]);
      }

      history.push(`💤 1d`, `🟢 he:丿:slash he:𠃌:radical`);

      {
        const { items, blockedItems } = await simulateSkillReviews({
          targetSkills,
          history,
        });
        expect(items).toContain(`he:刀:knife`);
        expect(blockedItems).toEqual([]);
      }
    });

    test(`doesn't get stuck reviewing the same skill after all due skills are done`, async () => {
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
        items: [review1],
      } = await simulateSkillReviews({ targetSkills, history });

      // Doesn't get stuck reviewing he:𠃌:radical just because it had a lower stability.
      expect([review1]).not.toEqual([`he:𠃌:radical`]);
    });

    test(`skills that are stale (heavily over-due and not stable) are treated as new skills`, async () => {
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
        expect(queue).toMatchObject({
          items: [
            `he:刀:knife`,
            // These come later because he:刀:knife is due.
            `he:丿:slash`,
            `he:𠃌:radical`,
          ],
          blockedItems: [],
          retryCount: 1,
          dueCount: 0,
          overDueCount: 0,
          newContentCount: 2,
          newDifficultyCount: 0,
        });
      }

      history.push(`💤 100d`); // Wait a long time without reviewing it, so it's essentially stale.

      {
        const queue = await simulateSkillReviews({
          targetSkills,
          history,
        });
        expect(queue).toMatchObject({
          items: [`he:丿:slash`, `he:𠃌:radical`],
          blockedItems: [
            // Now this comes last because it's "stale" and reset to new.
            `he:刀:knife`,
          ],
          retryCount: 0,
          dueCount: 0,
          overDueCount: 0,
          newContentCount: 2,
          newDifficultyCount: 0,
        });
      }
    });
  },
);

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
  await using rizzle = r.replicache(
    testReplicacheOptions(),
    currentSchema,
    mutators,
  );
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
          hanziOrHanziWord: hanzi,
          gloss,
          now,
        });
        break;
      }
      case `❌hanziPinyin`: {
        const [hanzi, pinyin] = args as [
          HanziText,
          PinyinPronunciationSpaceSeparated,
        ];
        await rizzle.mutate.saveHanziPinyinMistake({
          id: nanoid(),
          hanziOrHanziWord: hanzi,
          pinyin: rSpaceSeparatedString().unmarshal(pinyin),
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

  const result = await computeSkillReviewQueue(rizzle, targetSkills, now);
  return result.reviewQueue;
}
