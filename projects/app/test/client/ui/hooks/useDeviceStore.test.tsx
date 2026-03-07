// @vitest-environment happy-dom

import { DeviceStoreProvider } from "#client/ui/DeviceStoreProvider.tsx";
import type { UseDeviceStoreResult } from "#client/ui/hooks/useDeviceStore.ts";
import { useDeviceStore } from "#client/ui/hooks/useDeviceStore.ts";
import type { HanziWord } from "#data/model.ts";
import { r } from "#util/rizzle.ts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { act } from "react";
import { test as baseTest, beforeEach, expect } from "vitest";

function typeChecks<_T>(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

baseTest(`useDeviceStore setValue types`, () => {
  const testSetting = r.entity(`test.toggle`, {
    enabled: r.boolean(`e`),
  });
  const testSettingWithKeyParam = r.entity(`test.hint.[hanziWord]`, {
    hanziWord: r.string().alias(`h`),
    text: r.string().alias(`t`),
  });

  type ToggleSetValue = UseDeviceStoreResult<typeof testSetting>[`setValue`];

  typeChecks(() => {
    const setValue = null as unknown as ToggleSetValue;
    setValue({ enabled: true });
    setValue((prev) => ({ enabled: !(prev?.enabled ?? false) }));
    setValue(null);
    // @ts-expect-error wrong field for entity shape
    setValue({ text: `nope` });
    // @ts-expect-error wrong value type
    setValue({ enabled: `true` });
  });

  type HintSetValue = UseDeviceStoreResult<
    typeof testSettingWithKeyParam
  >[`setValue`];

  typeChecks(() => {
    const setValue = null as unknown as HintSetValue;
    setValue({ hanziWord: `` as HanziWord, text: `hint` });
    setValue(null);
    // @ts-expect-error missing key field
    setValue({ text: `hint` });
    // @ts-expect-error wrong field for entity shape
    setValue({ hanziWord: `` as HanziWord, imageId: `x` });
  });
});

const testContextProviders = () =>
  function TestWrapper({ children }: PropsWithChildren) {
    const queryClient = new QueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <DeviceStoreProvider.Context.Provider value={{ queryClient }}>
          {children}
        </DeviceStoreProvider.Context.Provider>
      </QueryClientProvider>
    );
  };

beforeEach(() => {
  localStorage.clear();
});

baseTest(`loads, updates, and clears device store values`, async () => {
  const testSetting = r.entity(`test.toggle`, {
    enabled: r.boolean(`e`),
  });

  const { result, unmount } = renderHook(() => useDeviceStore(testSetting), {
    wrapper: testContextProviders(),
  });

  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });

  expect(result.current.value).toBeNull();

  act(() => {
    result.current.setValue({ enabled: true });
  });

  await waitFor(() => {
    expect(result.current.value?.enabled).toBe(true);
  });

  act(() => {
    result.current.setValue((prev, isLoading) => {
      expect(prev).toEqual({ enabled: true });
      expect(isLoading).toBe(false);
      return { enabled: false };
    });
  });

  await waitFor(() => {
    expect(result.current.value?.enabled).toBe(false);
  });

  act(() => {
    result.current.setValue(null);
  });

  await waitFor(() => {
    expect(result.current.value).toBeNull();
  });

  unmount();
});
