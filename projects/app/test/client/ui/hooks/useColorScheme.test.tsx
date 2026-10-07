// @vitest-environment happy-dom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

afterEach(() => {
  vi.doUnmock(`react-native-web/dist/exports/Appearance`);
});

describe(`react-native-web useColorScheme`, () => {
  test(`rechecks the system preference after subscribing`, async () => {
    let isDark = false;
    const listeners = new Set<(appearance: { colorScheme: string }) => void>();

    vi.doMock(`react-native-web/dist/exports/Appearance`, () => ({
      default: {
        getColorScheme: () => (isDark ? `dark` : `light`),
        addChangeListener: (
          listener: (appearance: { colorScheme: string }) => void,
        ) => {
          listeners.add(listener);
          isDark = true;
          return { remove: () => listeners.delete(listener) };
        },
      },
    }));

    const { default: useColorScheme } = await vi.importActual<{
      default: typeof import("react-native").useColorScheme;
    }>(`react-native-web/dist/exports/useColorScheme`);
    const { result, unmount } = renderHook(
      (): ReturnType<typeof import("react-native").useColorScheme> =>
        useColorScheme(),
    );

    expect(result.current).toBe(`dark`);

    act(() => {
      isDark = false;
      for (const listener of listeners) {
        listener({ colorScheme: `light` });
      }
    });

    expect(result.current).toBe(`light`);

    unmount();
    expect(listeners.size).toBe(0);
  });
});
