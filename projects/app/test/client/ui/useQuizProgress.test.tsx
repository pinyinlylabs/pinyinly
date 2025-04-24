import { useQuizProgress } from "#client/hooks/useQuizProgress.ts";
import { act, renderHook } from "@testing-library/react-native";
import test from "node:test";

await test(`increments progress for each correct answer`, () => {
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

await test(`fractionally increments progress for each incorrect`, () => {
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

await test(`resets fractional progress after correct answer`, () => {
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
