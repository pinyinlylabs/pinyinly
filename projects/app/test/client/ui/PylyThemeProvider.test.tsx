// @vitest-environment happy-dom

import AppearanceSettingsPage from "#app/(menu)/settings/appearance/index.tsx";
import {
  buildDeviceStoreKey,
  deviceStoreGet,
  deviceStoreSet,
} from "#client/deviceStore.ts";
import * as deviceStore from "#client/deviceStore.ts";
import {
  ColorSchemeOverrideKind,
  colorSchemeOverrideSetting,
} from "#client/theme.ts";
import { DeviceStoreContext } from "#client/ui/contexts.ts";
import { useColorSchemeOverride } from "#client/ui/hooks/useColorSchemeOverride.ts";
import { PylyThemeProvider } from "#client/ui/PylyThemeProvider.tsx";
import { onlineManager, QueryClient } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { Suspense } from "react";
import { useColorScheme } from "react-native";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

vi.mock(`react-native`, async () => ({
  ...(await vi.importActual(`react-native-web`)),
  useColorScheme: vi.fn(),
}));

vi.mock(`react-native-screens`, () => ({
  FullWindowOverlay: ({ children }: PropsWithChildren) => <>{children}</>,
}));

vi.mock(`expo-router`, () => ({
  DefaultTheme: { fonts: {} },
  ThemeProvider: ({
    children,
    value,
  }: PropsWithChildren<{ value: { dark: boolean } }>) => (
    <div data-testid="navigation-theme" data-dark={value.dark}>
      {children}
    </div>
  ),
}));

vi.mock(`expo-status-bar`, () => ({
  StatusBar: ({ style }: { style: string }) => (
    <div data-testid="status-bar" data-style={style} />
  ),
}));

vi.mock(`#client/ui/Theme.tsx`, () => ({
  Theme: ({ children, theme }: PropsWithChildren<{ theme: string }>) => (
    <div
      data-testid={
        theme === `default` || theme === `popover` ? undefined : `app-theme`
      }
      data-theme={theme}
    >
      {children}
    </div>
  ),
}));

vi.mock(`#client/ui/VisualViewportCssVariables.tsx`, () => ({
  VisualViewportCssVariables: () => null,
}));

vi.mock(`#client/ui/UserSettingToggleButton.tsx`, () => ({
  UserSettingToggleButton: () => null,
}));

vi.mock(`#client/ui/AiImageStyleSettingControl.tsx`, () => ({
  AiImageStyleSettingControl: () => null,
}));

let queryClient: QueryClient;

function Wrapper({ children }: PropsWithChildren) {
  return (
    <DeviceStoreContext.Provider value={{ queryClient }}>
      <Suspense fallback={<div>Loading theme</div>}>{children}</Suspense>
    </DeviceStoreContext.Provider>
  );
}

async function selectColorScheme(label: string) {
  fireEvent.keyDown(screen.getByRole(`button`, { name: `Color scheme` }), {
    key: `ArrowDown`,
  });
  fireEvent.click(await screen.findByRole(`option`, { name: label }));
}

beforeEach(() => {
  localStorage.clear();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  vi.mocked(useColorScheme).mockReturnValue(`light`);
});

afterEach(() => {
  cleanup();
  queryClient.clear();
  onlineManager.setOnline(true);
  vi.restoreAllMocks();
});

test(`no override follows system changes, including an unknown scheme`, async () => {
  const { result, rerender } = renderHook(() => useColorSchemeOverride(), {
    wrapper: Wrapper,
  });

  await waitFor(() => {
    expect(result.current).not.toBeNull();
  });
  expect(result.current.override).toBeNull();
  expect(result.current.colorScheme).toBe(`light`);

  vi.mocked(useColorScheme).mockReturnValue(`dark`);
  rerender();
  expect(result.current.colorScheme).toBe(`dark`);

  vi.mocked(useColorScheme).mockReturnValue(null);
  rerender();
  expect(result.current.colorScheme).toBe(`light`);
});

test.each([
  [ColorSchemeOverrideKind.Light, `light`],
  [ColorSchemeOverrideKind.Light, `dark`],
  [ColorSchemeOverrideKind.Dark, `light`],
  [ColorSchemeOverrideKind.Dark, `dark`],
] as const)(`saved %s overrides system %s`, async (mode, systemTheme) => {
  await deviceStoreSet(colorSchemeOverrideSetting, { mode });
  vi.mocked(useColorScheme).mockReturnValue(systemTheme);
  const { result } = renderHook(() => useColorSchemeOverride(), {
    wrapper: Wrapper,
  });

  await waitFor(() => {
    expect(result.current).not.toBeNull();
  });
  expect(result.current.colorScheme).toBe(mode);
});

test(`restores the override before showing content and aligns navigation and status bar`, async () => {
  await deviceStoreSet(colorSchemeOverrideSetting, {
    mode: ColorSchemeOverrideKind.Dark,
  });
  render(
    <PylyThemeProvider>
      <div>App content</div>
    </PylyThemeProvider>,
    { wrapper: Wrapper },
  );

  expect(screen.queryByText(`App content`)).not.toBeInTheDocument();
  expect(screen.getByText(`Loading theme`)).toBeInTheDocument();
  await screen.findByText(`App content`);
  expect(screen.getByTestId(`app-theme`)).toHaveAttribute(`data-theme`, `dark`);
  expect(screen.getByTestId(`navigation-theme`)).toHaveAttribute(
    `data-dark`,
    `true`,
  );
  expect(screen.getByTestId(`status-bar`)).toHaveAttribute(
    `data-style`,
    `light`,
  );
});

test(`selects and persists overrides and clears them for Auto while offline`, async () => {
  onlineManager.setOnline(false);
  const { unmount } = render(
    <PylyThemeProvider>
      <AppearanceSettingsPage />
    </PylyThemeProvider>,
    { wrapper: Wrapper },
  );

  const select = await screen.findByRole(`button`, {
    name: `Color scheme`,
  });
  expect(select).toHaveTextContent(`Auto`);
  await selectColorScheme(`Dark`);

  await waitFor(() => {
    expect(
      screen.getByRole(`button`, { name: `Color scheme` }),
    ).toHaveTextContent(`Dark`);
  });
  expect(await deviceStoreGet(colorSchemeOverrideSetting)).toEqual({
    mode: `dark`,
  });
  expect(screen.getByTestId(`app-theme`)).toHaveAttribute(`data-theme`, `dark`);

  unmount();
  queryClient.clear();
  render(
    <PylyThemeProvider>
      <AppearanceSettingsPage />
    </PylyThemeProvider>,
    { wrapper: Wrapper },
  );
  expect(
    await screen.findByRole(`button`, { name: `Color scheme` }),
  ).toHaveTextContent(`Dark`);

  await selectColorScheme(`Auto`);
  await waitFor(() => {
    expect(screen.getByTestId(`app-theme`)).toHaveAttribute(
      `data-theme`,
      `light`,
    );
  });
  expect(await deviceStoreGet(colorSchemeOverrideSetting)).toBeNull();
  expect(
    localStorage.getItem(buildDeviceStoreKey(colorSchemeOverrideSetting)),
  ).toBeNull();
  expect(screen.getByTestId(`navigation-theme`)).toHaveAttribute(
    `data-dark`,
    `false`,
  );
  expect(screen.getByTestId(`status-bar`)).toHaveAttribute(
    `data-style`,
    `dark`,
  );
});

test(`suspends the selector during loading and disables it while saving`, async () => {
  const saving = Promise.withResolvers<undefined>();
  const set = deviceStore.deviceStoreSet;
  vi.spyOn(deviceStore, `deviceStoreSet`).mockImplementationOnce(
    async (entity, value) => {
      await saving.promise;
      await set(entity, value);
    },
  );
  render(<AppearanceSettingsPage />, { wrapper: Wrapper });
  expect(
    screen.queryByRole(`button`, { name: `Color scheme` }),
  ).not.toBeInTheDocument();
  expect(screen.getByText(`Loading theme`)).toBeInTheDocument();
  await waitFor(() => {
    expect(
      screen.getByRole(`button`, { name: `Color scheme` }),
    ).not.toBeDisabled();
  });

  await selectColorScheme(`Dark`);
  await waitFor(() => {
    expect(screen.getByRole(`button`, { name: `Color scheme` })).toBeDisabled();
  });
  expect(
    screen.queryByRole(`option`, { name: `Light` }),
  ).not.toBeInTheDocument();
  expect(deviceStore.deviceStoreSet).toHaveBeenCalledTimes(1);
  saving.resolve(undefined);
  await waitFor(() => {
    expect(
      screen.getByRole(`button`, { name: `Color scheme` }),
    ).toHaveTextContent(`Dark`);
  });
  expect(
    screen.getByRole(`button`, { name: `Color scheme` }),
  ).not.toBeDisabled();
});

test(`reports a failed override save without changing the active scheme and allows retry`, async () => {
  const log = vi.spyOn(console, `error`).mockImplementation(() => {});
  render(<AppearanceSettingsPage />, { wrapper: Wrapper });
  await waitFor(() => {
    expect(
      screen.getByRole(`button`, { name: `Color scheme` }),
    ).not.toBeDisabled();
  });
  vi.spyOn(localStorage, `setItem`).mockImplementationOnce(() => {
    throw new Error(`Storage is full`);
  });

  await selectColorScheme(`Dark`);
  expect(await screen.findByRole(`alert`)).toHaveTextContent(
    `Could not save your color scheme override`,
  );
  expect(log).toHaveBeenCalledWith(
    `Failed to save device store selection`,
    expect.any(Error),
  );
  expect(
    screen.getByRole(`button`, { name: `Color scheme` }),
  ).toHaveTextContent(`Auto`);

  await selectColorScheme(`Dark`);
  await waitFor(() => {
    expect(
      screen.getByRole(`button`, { name: `Color scheme` }),
    ).toHaveTextContent(`Dark`);
  });
  expect(screen.queryByRole(`alert`)).not.toBeInTheDocument();
});

test(`logs invalid stored values and falls back to Auto`, async () => {
  const log = vi.spyOn(console, `error`).mockImplementation(() => {});
  localStorage.setItem(
    buildDeviceStoreKey(colorSchemeOverrideSetting),
    JSON.stringify({ m: `invalid` }),
  );
  const { result } = renderHook(() => useColorSchemeOverride(), {
    wrapper: Wrapper,
  });
  await waitFor(() => {
    expect(result.current).not.toBeNull();
  });
  expect(result.current.override).toBeNull();
  expect(log).toHaveBeenCalled();
});
