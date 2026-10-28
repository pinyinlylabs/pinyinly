import { afterEach, describe, expect, test, vi } from "vitest";
import { scheduler } from "#util/scheduler.ts";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe(`scheduler.yield`, () => {
  test(`uses the native scheduler yield when available`, async () => {
    const nativeYield = vi.fn(async () => {});
    vi.stubGlobal(`scheduler`, { yield: nativeYield });

    await scheduler.yield();

    expect(nativeYield).toHaveBeenCalledOnce();
  });

  test(`falls back to a timer when native scheduler yield is unavailable`, async () => {
    vi.useFakeTimers();
    vi.stubGlobal(`scheduler`, undefined);

    let hasYielded = false;
    const yielding = scheduler.yield().then(() => {
      hasYielded = true;
    });
    await vi.advanceTimersByTimeAsync(0);
    await yielding;

    expect(hasYielded).toBe(true);
  });
});
