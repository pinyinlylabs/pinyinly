import { useMultiChoiceQuizTimer, useQuizProgress } from "#client/hooks.ts";
import { act, renderHook } from "@testing-library/react-native";
import test from "node:test";

await test(`${useMultiChoiceQuizTimer.name} suite`, async (t) => {
  await t.test(
    `records time correctly for correct and incorrect choices`,
    async (t) => {
      t.mock.timers.enable({ apis: [`Date`] });

      const { result } = renderHook(() => useMultiChoiceQuizTimer());

      // Simulate 100ms elapsed
      t.mock.timers.tick(100);

      // Initially, endTime should be undefined
      expect(result.current.endTime).toBeUndefined();

      // Record the first correct choice
      act(() => {
        result.current.recordChoice(true);
      });

      // endTime should now be set to 100ms (the time at which the correct
      // choice was recorded).
      expect(result.current.endTime).toBe(100);

      // Simulate more time passing (100ms) and ensure endTime remains constant
      t.mock.timers.tick(100);
      expect(result.current.endTime).toBe(100);

      // Record the second correct choice
      act(() => {
        result.current.recordChoice(true);
      });

      // Simulate additional time passing (100ms) and ensure endTime remains unchanged
      t.mock.timers.tick(100);
      expect(result.current.endTime).toBe(100);

      // Record an incorrect choice
      act(() => {
        result.current.recordChoice(false);
      });

      // endTime should reset to undefined
      expect(result.current.endTime).toBeUndefined();

      // Record a correct choice again
      act(() => {
        result.current.recordChoice(true);
      });

      // Simulate 100ms elapsed after the reset
      t.mock.timers.tick(100);

      // endTime should now reflect the new correct choice time (300ms total elapsed)
      expect(result.current.endTime).toBe(300);
    },
  );

  await t.test(`resets if more than 4s between choices`, async (t) => {
    t.mock.timers.enable({ apis: [`Date`] });

    const { result } = renderHook(() => useMultiChoiceQuizTimer());

    // Simulate 100ms elapsed
    t.mock.timers.tick(100);

    // Record the first correct choice
    act(() => {
      result.current.recordChoice(true);
    });

    // Simulate 4.1s elapsed
    t.mock.timers.tick(10_000);

    // Should not reset because no additional choices were made
    expect(result.current.endTime).toBe(100);

    // Choosing another option should reset the timer because more than 4s have passed.
    act(() => {
      result.current.recordChoice(true);
    });

    expect(result.current.endTime).toBeUndefined();
  });
});

await test(`${useQuizProgress.name} suite`, async (t) => {
  await t.test(`increments progress for each correct answer`, () => {
    const { result } = renderHook(() => useQuizProgress());

    expect(result.current.progress).toBe(0);

    act(() => {
      result.current.recordAnswer(true);
    });

    expect(result.current.progress).toBe(1);

    act(() => {
      result.current.recordAnswer(true);
    });

    expect(result.current.progress).toBe(2);
  });

  await t.test(`fractionally increments progress for each incorrect`, () => {
    const { result } = renderHook(() => useQuizProgress());

    expect(result.current.progress).toBe(0);
    let lastProgress;
    for (let i = 0; i < 100; i++) {
      lastProgress = result.current.progress;

      act(() => {
        result.current.recordAnswer(false);
      });

      expect(result.current.progress).toBeGreaterThan(lastProgress);
      expect(result.current.progress).toBeLessThan(1);
    }
  });

  await t.test(`resets fractional progress after correct answer`, () => {
    const { result } = renderHook(() => useQuizProgress());

    act(() => {
      result.current.recordAnswer(false);
    });

    // Correct answers should reset to whole number progress values.

    act(() => {
      result.current.recordAnswer(true);
    });

    expect(result.current.progress).toBe(1);

    act(() => {
      result.current.recordAnswer(true);
    });

    expect(result.current.progress).toBe(2);
  });
});
