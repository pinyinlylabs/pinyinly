// @vitest-environment happy-dom

import { SimpleCronIntervalKind } from "#client/theme.ts";
import { useSimpleCronInterval } from "#client/ui/hooks/useSimpleCronInterval.ts";
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
});

test(`refreshes on aligned interval boundaries`, async () => {
  vi.useFakeTimers({
    now: new Date(10_000),
    toFake: [`Date`, `setTimeout`, `clearTimeout`],
  });
  const { result } = renderHook(() =>
    useSimpleCronInterval(SimpleCronIntervalKind.Every2Minutes),
  );

  expect(result.current).toBe(10_000);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(110_000);
  });
  expect(result.current).toBe(120_000);
});
