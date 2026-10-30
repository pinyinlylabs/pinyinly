// @vitest-environment happy-dom

import { SplashScreen } from "#client/ui/SplashScreen.tsx";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useFonts: vi.fn<() => [boolean, Error | null]>(),
  hide: vi.fn(),
  platform: { OS: `web` },
  cancel: vi.fn(),
  animate: vi.fn(),
}));

vi.mock(`expo-font`, () => ({ useFonts: mocks.useFonts }));
vi.mock(`expo-constants`, () => ({
  default: { executionEnvironment: `standalone` },
  ExecutionEnvironment: { StoreClient: `storeClient` },
}));
vi.mock(`expo-splash-screen`, () => ({
  preventAutoHideAsync: async () => {},
  setOptions: vi.fn(),
  hide: mocks.hide,
}));
vi.mock(`react-native`, () => ({ Platform: mocks.platform }));

beforeEach(() => {
  vi.useFakeTimers();
  mocks.hide.mockClear();
  mocks.useFonts.mockReturnValue([false, null]);
  mocks.platform.OS = `web`;
  vi.stubGlobal(`require`, () => 1);
  const startup = document.createElement(`div`);
  startup.id = `pyly-startup`;
  const progress = document.createElement(`div`);
  progress.id = `pyly-startup-progress`;
  const fill = document.createElement(`div`);
  mocks.animate.mockClear().mockReturnValue({ cancel: mocks.cancel });
  fill.animate = mocks.animate;
  progress.append(fill);
  startup.append(progress);
  document.body.append(startup);
});

afterEach(() => {
  cleanup();
  document.querySelector(`#pyly-startup`)?.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

test(`keeps the HTML indicator until fonts are ready`, () => {
  const { rerender } = render(<SplashScreen />);
  expect(document.querySelector(`#pyly-startup`)).not.toBeNull();
  expect(mocks.hide).not.toHaveBeenCalled();
  mocks.useFonts.mockReturnValue([true, null]);
  rerender(<SplashScreen />);
  expect(mocks.animate).toHaveBeenCalledWith(
    [{ width: `0px` }, { width: `100%` }],
    {
      duration: 250,
      easing: `ease-out`,
      fill: `forwards`,
    },
  );
  expect(document.querySelector(`#pyly-startup`)).not.toBeNull();
  vi.advanceTimersByTime(250);
  expect(document.querySelector(`#pyly-startup`)).not.toBeNull();
  vi.advanceTimersByTime(149);
  expect(document.querySelector(`#pyly-startup`)).not.toBeNull();
  vi.advanceTimersByTime(1);
  expect(document.querySelector(`#pyly-startup`)).toBeNull();
  expect(mocks.hide).toHaveBeenCalledOnce();
});

test(`dismisses the HTML indicator when font loading fails`, () => {
  mocks.useFonts.mockReturnValue([false, new Error(`Font unavailable`)]);
  render(<SplashScreen />);
  vi.advanceTimersByTime(400);
  expect(document.querySelector(`#pyly-startup`)).toBeNull();
  expect(mocks.hide).toHaveBeenCalledOnce();
});

test(`skips the completion animation with reduced motion`, () => {
  const mediaQuery = window.matchMedia(`(prefers-reduced-motion: reduce)`);
  Object.defineProperty(mediaQuery, `matches`, { value: true });
  vi.spyOn(window, `matchMedia`).mockReturnValue(mediaQuery);
  mocks.useFonts.mockReturnValue([true, null]);
  render(<SplashScreen />);
  expect(document.querySelector(`#pyly-startup`)).toBeNull();
  vi.restoreAllMocks();
});

test(`tolerates an already dismissed indicator`, () => {
  document.querySelector(`#pyly-startup`)?.remove();
  mocks.useFonts.mockReturnValue([true, null]);
  render(<SplashScreen />);
  expect(mocks.hide).toHaveBeenCalledOnce();
});

test(`preserves native splash dismissal without touching the document`, () => {
  mocks.platform.OS = `ios`;
  mocks.useFonts.mockReturnValue([true, null]);
  render(<SplashScreen />);
  expect(document.querySelector(`#pyly-startup`)).not.toBeNull();
  expect(mocks.hide).toHaveBeenCalledOnce();
});
