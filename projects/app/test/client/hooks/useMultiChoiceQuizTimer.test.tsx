// @vitest-environment happy-dom

import { useMultiChoiceQuizTimer } from "#client/hooks/useMultiChoiceQuizTimer.ts";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { expect, test, vi } from "vitest";

test(`records time correctly for correct and incorrect choices`, () => {
  vi.useFakeTimers({ toFake: [`Date`] });

  const { result } = renderHook(() => useMultiChoiceQuizTimer());

  // Simulate 100ms elapsed
  vi.advanceTimersByTime(100);

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
  vi.advanceTimersByTime(100);
  expect(result.current.endTime).toBe(100);

  // Record the second correct choice
  act(() => {
    result.current.recordChoice(true);
  });

  // Simulate additional time passing (100ms) and ensure endTime remains unchanged
  vi.advanceTimersByTime(100);
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
  vi.advanceTimersByTime(100);

  // endTime should now reflect the new correct choice time (300ms total elapsed)
  expect(result.current.endTime).toBe(300);

  vi.useRealTimers();
});

test(`resets if more than 4s between choices`, () => {
  vi.useFakeTimers({ toFake: [`Date`] });

  const { result } = renderHook(() => useMultiChoiceQuizTimer());

  // Simulate 100ms elapsed
  vi.advanceTimersByTime(100);

  // Record the first correct choice
  act(() => {
    result.current.recordChoice(true);
  });

  // Simulate 4.1s elapsed
  vi.advanceTimersByTime(10_000);

  // Should not reset because no additional choices were made
  expect(result.current.endTime).toBe(100);

  // Choosing another option should reset the timer because more than 4s have passed.
  act(() => {
    result.current.recordChoice(true);
  });

  expect(result.current.endTime).toBeUndefined();

  vi.useRealTimers();
});
