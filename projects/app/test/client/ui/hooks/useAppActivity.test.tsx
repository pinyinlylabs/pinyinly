// @vitest-environment happy-dom

import { useAppActivity } from "#client/ui/hooks/useAppActivity.ts";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

function setVisibilityState(state: DocumentVisibilityState) {
  vi.spyOn(document, `visibilityState`, `get`).mockReturnValue(state);
  document.dispatchEvent(new Event(`visibilitychange`));
}

test(`tracks browser visibility changes`, () => {
  setVisibilityState(`visible`);
  const { result, unmount } = renderHook(() => useAppActivity());
  expect(result.current).toBe(true);
  act(() => {
    setVisibilityState(`hidden`);
  });
  expect(result.current).toBe(false);

  act(() => {
    setVisibilityState(`visible`);
  });
  expect(result.current).toBe(true);

  unmount();
  setVisibilityState(`hidden`);
  expect(result.current).toBe(true);
});
