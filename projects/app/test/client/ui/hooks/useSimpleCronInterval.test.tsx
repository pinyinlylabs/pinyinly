// @vitest-environment happy-dom

import { SimpleCronIntervalKind } from "#client/theme.ts";
import { getThemeSwapColorScheme } from "#client/ui/hooks/useColorSchemeOverride.ts";
import { useSimpleCronInterval } from "#client/ui/hooks/useSimpleCronInterval.ts";
import { act, renderHook } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
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

test(`hydrates with a server snapshot and refreshes across an hourly boundary`, async () => {
  vi.useFakeTimers({
    now: new Date(2026, 0, 1, 1, 59, 30),
    toFake: [`Date`, `setTimeout`, `clearTimeout`],
  });

  function Snapshot() {
    const now = useSimpleCronInterval(SimpleCronIntervalKind.Hourly);
    return (
      <div>
        {now == null
          ? `server`
          : getThemeSwapColorScheme(SimpleCronIntervalKind.Hourly, now)}
      </div>
    );
  }

  const html = renderToString(<Snapshot />);
  expect(html).toContain(`server`);

  const container = document.createElement(`div`);
  container.innerHTML = html;
  const root = hydrateRoot(container, <Snapshot />);

  await act(async () => {});
  expect(container.textContent).toBe(`light`);

  await act(async () => {
    await vi.advanceTimersByTimeAsync(30_000);
  });
  expect(container.textContent).toBe(`dark`);
  await act(async () => {
    root.unmount();
  });
});
