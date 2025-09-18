import type { SkillReviewQueue } from "#data/skills.ts";
import { describe, expect, test } from "vitest";

// Test the logic for determining which lozenges should be shown
describe(`QuizQueueButton lozenge logic`, () => {
  function getExpectedLozenges(
    queueStats: Pick<
      SkillReviewQueue,
      `overDueCount` | `dueCount` | `newContentCount`
    >,
  ) {
    const lozenges = [];

    if (queueStats.overDueCount > 0) {
      lozenges.push({ mode: `overdue`, count: queueStats.overDueCount });
    }

    if (queueStats.dueCount > 0) {
      lozenges.push({ mode: `due`, count: queueStats.dueCount });
    }

    if (queueStats.newContentCount > 0) {
      lozenges.push({ mode: `new`, count: queueStats.newContentCount });
    }

    return lozenges;
  }

  test(`returns empty array when all counts are zero`, () => {
    const result = getExpectedLozenges({
      overDueCount: 0,
      dueCount: 0,
      newContentCount: 0,
    });

    expect(result).toEqual([]);
  });

  test(`returns single lozenge for overdue items only`, () => {
    const result = getExpectedLozenges({
      overDueCount: 5,
      dueCount: 0,
      newContentCount: 0,
    });

    expect(result).toEqual([{ mode: `overdue`, count: 5 }]);
  });

  test(`returns single lozenge for due items only`, () => {
    const result = getExpectedLozenges({
      overDueCount: 0,
      dueCount: 3,
      newContentCount: 0,
    });

    expect(result).toEqual([{ mode: `due`, count: 3 }]);
  });

  test(`returns single lozenge for new items only`, () => {
    const result = getExpectedLozenges({
      overDueCount: 0,
      dueCount: 0,
      newContentCount: 7,
    });

    expect(result).toEqual([{ mode: `new`, count: 7 }]);
  });

  test(`returns multiple lozenges in priority order`, () => {
    const result = getExpectedLozenges({
      overDueCount: 2,
      dueCount: 5,
      newContentCount: 3,
    });

    expect(result).toEqual([
      { mode: `overdue`, count: 2 },
      { mode: `due`, count: 5 },
      { mode: `new`, count: 3 },
    ]);
  });

  test(`returns only non-zero lozenges in mixed scenario`, () => {
    const result = getExpectedLozenges({
      overDueCount: 4,
      dueCount: 0,
      newContentCount: 8,
    });

    expect(result).toEqual([
      { mode: `overdue`, count: 4 },
      { mode: `new`, count: 8 },
    ]);
  });
});
