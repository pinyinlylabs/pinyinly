// @vitest-environment happy-dom

import { DbProvider } from "#client/ui/DbProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.js";
import {
  autoCheckUserSetting,
  useUserSetting,
} from "#client/ui/hooks/useUserSetting.ts";
import type { UseUserSettingResult } from "#client/ui/hooks/useUserSetting.ts";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import type { HanziWord } from "#data/model.ts";
import type { Rizzle } from "#data/rizzleSchema.ts";
import { r } from "#util/rizzle.ts";
import { rizzleFixture } from "#test/util/rizzleHelpers.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { act } from "react";
import { expect, test as baseTest } from "vitest";

const testWithRizzle = baseTest.extend(rizzleFixture);

function typeChecks<_T>(..._args: unknown[]) {
  // This function is only used for type checking, so it should never be called.
}

baseTest(`useUserSetting setValue types`, () => {
  const testSetting = r.entity(`test.toggle`, {
    enabled: r.boolean(`e`),
  });
  const testSettingWithKeyParam = r.entity(`test.hint.[hanziWord]`, {
    hanziWord: r.string().alias(`h`),
    text: r.string().alias(`t`),
  });

  type ToggleSetValue = UseUserSettingResult<typeof testSetting>[`setValue`];

  typeChecks(() => {
    const setValue = null as unknown as ToggleSetValue;
    setValue({ enabled: true });
    setValue((prev) => ({ enabled: !(prev?.enabled ?? false) }));
    // @ts-expect-error wrong field for entity shape
    setValue({ text: `nope` });
    // @ts-expect-error wrong value type
    setValue({ enabled: `true` });
  });

  type HintSetValue = UseUserSettingResult<
    typeof testSettingWithKeyParam
  >[`setValue`];

  typeChecks(() => {
    const setValue = null as unknown as HintSetValue;
    setValue({ hanziWord: `` as HanziWord, text: `hint` });
    // @ts-expect-error missing key field
    setValue({ text: `hint` });
    // @ts-expect-error wrong field for entity shape
    setValue({ hanziWord: `` as HanziWord, imageId: `x` });
  });
});

const testContextProviders = (opts: { rizzle: Rizzle }) =>
  function TestWrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();

    return (
      <QueryClientProvider client={queryClient}>
        <RizzleProvider.Context.Provider value={opts.rizzle}>
          <DbProvider>{children}</DbProvider>
        </RizzleProvider.Context.Provider>
      </QueryClientProvider>
    );
  };

testWithRizzle(`returns null when skipped`, ({ rizzle }) => {
  const { result, unmount } = renderHook(
    () => useUserSetting(autoCheckUserSetting, { skip: true }),
    { wrapper: testContextProviders({ rizzle }) },
  );

  expect(result.current).toBeNull();
  unmount();
});

testWithRizzle(`loads and updates setting values`, async ({ rizzle }) => {
  const { result, unmount } = renderHook(
    () => useUserSetting(autoCheckUserSetting),
    {
      wrapper: testContextProviders({ rizzle }),
    },
  );

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
    result.current.setValue((prev) => ({ enabled: !(prev?.enabled ?? false) }));
  });

  await waitFor(() => {
    expect(result.current.value?.enabled).toBe(false);
  });

  unmount();
});
