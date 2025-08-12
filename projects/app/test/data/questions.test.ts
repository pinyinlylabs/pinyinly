import { QuestionFlagKind, SkillKind, SrsKind } from "#data/model.js";
import { flagForQuestion } from "#data/questions.js";
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.resetAllMocks();
});

describe(
  `flagForQuestion suite` satisfies HasNameOf<typeof flagForQuestion>,
  () => {
    test(`marks a question as new if it has no srs`, async () => {
      expect(
        flagForQuestion({
          isInRetryQueue: false,
          skillKind: SkillKind.HanziWordToGloss,
          srsState: undefined,
        }),
      ).toEqual({ kind: QuestionFlagKind.NewSkill });
    });

    test(`no flag for mock questions`, async () => {
      expect(
        flagForQuestion({
          isInRetryQueue: false,
          skillKind: SkillKind.HanziWordToGloss,
          srsState: {
            kind: SrsKind.Mock,
            prevReviewAt: new Date(),
            nextReviewAt: new Date(),
          },
        }),
      ).toEqual(undefined);
    });

    test(`flags as Retry no matter what`, async () => {
      expect(
        flagForQuestion({
          isInRetryQueue: true,
          skillKind: SkillKind.HanziWordToGloss,
          srsState: undefined,
        }),
      ).toEqual({
        kind: QuestionFlagKind.Retry,
      });
    });

    test(`marks a question as new if it has fsrs state but is not stable enough to be introduced`, async () => {
      expect(
        flagForQuestion({
          isInRetryQueue: false,
          skillKind: SkillKind.HanziWordToGloss,
          srsState: undefined,
        }),
      ).toEqual({
        kind: QuestionFlagKind.NewSkill,
      });
    });

    test(`flags harder-difficulty skills as "new difficulty"`, async () => {
      vi.spyOn(
        await import(`#data/skills.js`),
        `isHarderDifficultyStyleSkillKind`,
      ).mockReturnValue(true);

      expect(
        flagForQuestion({
          isInRetryQueue: false,
          skillKind: SkillKind.HanziWordToGloss,
          srsState: undefined,
        }),
      ).toEqual({
        kind: QuestionFlagKind.NewDifficulty,
      });
    });
  },
);
