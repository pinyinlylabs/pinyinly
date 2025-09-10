import { isHarderDifficultyStyleSkillKind } from "#data/skills.ts";
import { SkillKind } from "#data/model.ts";
import { describe, expect, test } from "vitest";

describe(`Quiz flag and lozenge integration`, () => {
  test(`validates harder difficulty skill kinds are identified correctly`, () => {
    // These should be identified as harder difficulty
    expect(
      isHarderDifficultyStyleSkillKind(SkillKind.HanziWordToPinyinFinal),
    ).toBe(true);
    expect(
      isHarderDifficultyStyleSkillKind(SkillKind.HanziWordToPinyinTone),
    ).toBe(true);
    expect(
      isHarderDifficultyStyleSkillKind(SkillKind.HanziWordToPinyinTyped),
    ).toBe(true);

    // These should NOT be identified as harder difficulty
    expect(isHarderDifficultyStyleSkillKind(SkillKind.HanziWordToGloss)).toBe(
      false,
    );
    expect(isHarderDifficultyStyleSkillKind(SkillKind.GlossToHanziWord)).toBe(
      false,
    );
  });

  test(`SkillReviewQueue interface has separate counts for new content and new difficulties`, () => {
    // This is a type-level test to ensure the interface includes the new fields
    type HasNewContentCount =
      `newContentCount` extends keyof import("#data/skills.ts").SkillReviewQueue
        ? true
        : false;
    type HasNewDifficultyCount =
      `newDifficultyCount` extends keyof import("#data/skills.ts").SkillReviewQueue
        ? true
        : false;
    type HasNewCount =
      `newCount` extends keyof import("#data/skills.ts").SkillReviewQueue
        ? true
        : false;

    const hasNewContentCount: HasNewContentCount = true;
    const hasNewDifficultyCount: HasNewDifficultyCount = true;
    const hasNewCount: HasNewCount = true; // Backward compatibility

    expect(hasNewContentCount).toBe(true);
    expect(hasNewDifficultyCount).toBe(true);
    expect(hasNewCount).toBe(true);
  });
});
