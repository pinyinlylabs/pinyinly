import type { SrsStateType } from "#data/model.js";
import { QuestionFlagKind, SrsKind } from "#data/model.js";
import { flagForQuestion } from "#data/questions.js";
import type { Skill } from "#data/rizzleSchema.js";
import type { SkillReviewQueue } from "#data/skills.js";
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.resetAllMocks();
});

describe(
  `flagForQuestion suite` satisfies HasNameOf<typeof flagForQuestion>,
  () => {
    const createMockReviewQueue = (
      overrides: Partial<SkillReviewQueue> = {},
    ): SkillReviewQueue => ({
      items: [mockSkill, mockSkill, mockSkill], // Add multiple skills for testing different indices
      blockedItems: [],
      retryCount: 0,
      dueCount: 0,
      newContentCount: 0,
      newDifficultyCount: 0,
      newCount: 0,
      overDueCount: 0,
      newDueAt: null,
      newOverDueAt: null,
      indexRanges: {
        retry: { start: 0, end: 0 },
        reactive: { start: 0, end: 0 },
        overdue: { start: 0, end: 0 },
        due: { start: 0, end: 0 },
        newContent: { start: 0, end: 0 },
        newDifficulty: { start: 0, end: 0 },
        notDue: { start: 0, end: 0 },
      },
      ...overrides,
    });

    const mockSkill: Skill = `he:你:you`;

    test(`marks a question as retry if within retry index range`, async () => {
      const reviewQueue = createMockReviewQueue({
        retryCount: 3,
        indexRanges: {
          retry: { start: 0, end: 3 },
          reactive: { start: 3, end: 3 },
          overdue: { start: 3, end: 3 },
          due: { start: 3, end: 3 },
          newContent: { start: 3, end: 3 },
          newDifficulty: { start: 3, end: 3 },
          notDue: { start: 3, end: 10 },
        },
      });
      const skillSrsStates = new Map<Skill, SrsStateType>();
      expect(flagForQuestion(1, reviewQueue, skillSrsStates)).toEqual({
        kind: QuestionFlagKind.Retry,
      });
    });

    test(`marks a question as new content if within new content index range`, async () => {
      const reviewQueue = createMockReviewQueue({
        indexRanges: {
          retry: { start: 0, end: 0 },
          reactive: { start: 0, end: 0 },
          overdue: { start: 0, end: 0 },
          due: { start: 0, end: 0 },
          newContent: { start: 0, end: 5 },
          newDifficulty: { start: 5, end: 5 },
          notDue: { start: 5, end: 10 },
        },
      });
      const skillSrsStates = new Map<Skill, SrsStateType>();
      expect(flagForQuestion(2, reviewQueue, skillSrsStates)).toEqual({
        kind: QuestionFlagKind.NewSkill,
      });
    });

    test(`marks a question as new difficulty if within new difficulty index range`, async () => {
      const reviewQueue = createMockReviewQueue({
        indexRanges: {
          retry: { start: 0, end: 0 },
          reactive: { start: 0, end: 0 },
          overdue: { start: 0, end: 0 },
          due: { start: 0, end: 0 },
          newContent: { start: 0, end: 0 },
          newDifficulty: { start: 0, end: 3 },
          notDue: { start: 3, end: 10 },
        },
      });
      const skillSrsStates = new Map<Skill, SrsStateType>();
      expect(flagForQuestion(1, reviewQueue, skillSrsStates)).toEqual({
        kind: QuestionFlagKind.NewDifficulty,
      });
    });

    test(`no flag for stable skills outside special ranges`, async () => {
      const reviewQueue = createMockReviewQueue({
        indexRanges: {
          retry: { start: 0, end: 0 },
          reactive: { start: 0, end: 0 },
          overdue: { start: 0, end: 0 },
          due: { start: 0, end: 3 },
          newContent: { start: 3, end: 3 },
          newDifficulty: { start: 3, end: 3 },
          notDue: { start: 3, end: 10 },
        },
      });
      const skillSrsStates = new Map<Skill, SrsStateType>();
      skillSrsStates.set(mockSkill, {
        kind: SrsKind.Mock,
        prevReviewAt: new Date(),
        nextReviewAt: new Date(),
      });
      expect(flagForQuestion(1, reviewQueue, skillSrsStates)).toEqual(
        undefined,
      );
    });
  },
);
