import { expoUpdatesMemoryLeakMiddleware } from "#util/memoryLeak.ts";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

test(`expoUpdatesMemoryLeakMiddleware clears registered updates listeners`, () => {
  const listener = () => {};
  const listeners = new Set([listener]);

  vi.stubGlobal(`expo`, {
    modules: {
      ExpoUpdates: {
        listeners: new Map([[`Expo.nativeUpdatesStateChangeEvent`, listeners]]),
      },
    },
  });

  expoUpdatesMemoryLeakMiddleware();

  expect(listeners.size).toBe(0);
});

test(`expoUpdatesMemoryLeakMiddleware allows no updates listener entry`, () => {
  vi.stubGlobal(`expo`, {
    modules: {
      ExpoUpdates: {
        listeners: new Map(),
      },
    },
  });

  expect(() => {
    expoUpdatesMemoryLeakMiddleware();
  }).not.toThrow();
});
