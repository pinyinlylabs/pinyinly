// @vitest-environment happy-dom

import { renderHook } from "@testing-library/react";
import { useLockFn } from "#client/ui/hooks/useLockFn.ts";
import { describe, expect, test, vi } from "vitest";

describe(`useLockFn`, () => {
  test(`ignores concurrent calls until an async callback completes`, async () => {
    const resolveCallbacks: Array<() => void> = [];
    const callback = vi.fn(
      async () =>
        new Promise<void>((resolve) => {
          resolveCallbacks.push(resolve);
        }),
    );
    const { result } = renderHook(() => useLockFn(callback));
    const firstCall = result.current();
    const secondCall = result.current();
    await secondCall;
    expect(callback).toHaveBeenCalledOnce();

    resolveCallbacks[0]?.();
    await firstCall;
    const thirdCall = result.current();
    expect(callback).toHaveBeenCalledTimes(2);
    resolveCallbacks[1]?.();
    await thirdCall;
  });
});
