// @vitest-environment happy-dom

import { useQuizTimer } from "#client/ui/hooks/useQuizTimer.ts";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, expect, test, vi } from "vitest";

const { isAppActiveMock } = vi.hoisted(() => ({
  isAppActiveMock: vi.fn(() => true),
}));

vi.mock(`#client/ui/hooks/useAppActivity.ts`, () => ({
  useAppActivity: isAppActiveMock,
}));

afterEach(() => {
  vi.useRealTimers();
  isAppActiveMock.mockReturnValue(true);
});

test(`records time correctly for correct and incorrect choices`, () => {
  vi.useFakeTimers({ toFake: [`Date`] });

  const { result } = renderHook(() => useQuizTimer());

  act(() => {
    vi.advanceTimersByTime(100);
  });

  expect(result.current.endTime).toBeUndefined();

  act(() => {
    result.current.recordChoice(true);
  });
  expect(result.current.endTime).toBe(100);

  act(() => {
    vi.advanceTimersByTime(100);
  });
  expect(result.current.endTime).toBe(100);

  act(() => {
    result.current.recordChoice(true);
  });
  expect(result.current.endTime).toBe(100);

  act(() => {
    result.current.recordChoice(false);
  });
  expect(result.current.endTime).toBeUndefined();

  act(() => {
    result.current.recordChoice(true);
    vi.advanceTimersByTime(100);
  });
  expect(result.current.endTime).toBe(200);
});

test(`resets if more than 4s between choices`, () => {
  vi.useFakeTimers({ toFake: [`Date`] });

  const { result } = renderHook(() => useQuizTimer());

  act(() => {
    vi.advanceTimersByTime(100);
    result.current.recordChoice(true);
  });

  act(() => {
    vi.advanceTimersByTime(10_000);
  });
  expect(result.current.endTime).toBe(100);

  act(() => {
    result.current.recordChoice(true);
  });
  expect(result.current.endTime).toBeUndefined();
});

test(`pauses while the browser tab is hidden`, () => {
  vi.useFakeTimers({ toFake: [`Date`] });

  const { result, rerender } = renderHook(() => useQuizTimer());

  act(() => {
    vi.advanceTimersByTime(100);
  });
  isAppActiveMock.mockReturnValue(false);
  rerender();
  expect(result.current.getDurationMs()).toBe(100);

  act(() => {
    vi.advanceTimersByTime(60_000);
  });
  expect(result.current.getDurationMs()).toBe(100);

  isAppActiveMock.mockReturnValue(true);
  rerender();
  act(() => {
    vi.advanceTimersByTime(250);
  });
  expect(result.current.getDurationMs()).toBe(350);
});
