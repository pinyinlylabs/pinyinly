// @vitest-environment happy-dom

import { DbProvider } from "#client/ui/DbProvider.tsx";
import { useNewQueryClient } from "#client/ui/hooks/useNewQueryClient.ts";
import { LegacyStudySelectionsCleanup } from "#client/ui/LegacyStudySelectionsCleanup.tsx";
import { RizzleProvider } from "#client/ui/RizzleProvider.tsx";
import type { Rizzle } from "#data/rizzleSchema.ts";
import {
  getStudyWordKeyParams,
  studyWordItemSetting,
} from "#data/userSettings.ts";
import { dbFixture, rizzleFixture } from "#test/util/rizzleHelpers.ts";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test as baseTest,
  vi,
} from "vitest";

const legacyStudySelectionsCleanupExpiresAt =
  LegacyStudySelectionsCleanup.expiresAt;
const test = baseTest.extend(rizzleFixture).extend(dbFixture);

beforeEach(() => {
  vi.useFakeTimers({ toFake: [`Date`] });
  vi.setSystemTime(legacyStudySelectionsCleanupExpiresAt - 1000);
});
afterEach(() => {
  vi.useRealTimers();
});

function providers(rizzle: Rizzle) {
  return function Wrapper({ children }: PropsWithChildren) {
    const queryClient = useNewQueryClient();
    return (
      <QueryClientProvider client={queryClient}>
        <RizzleProvider.Context.Provider value={rizzle}>
          <DbProvider>{children}</DbProvider>
        </RizzleProvider.Context.Provider>
      </QueryClientProvider>
    );
  };
}

describe(`LegacyStudySelectionsCleanup()`, () => {
  test(`warns when this temporary cleanup has passed its deletion date`, () => {
    if (vi.getRealSystemTime() >= legacyStudySelectionsCleanupExpiresAt) {
      process.stderr.write(
        `WARNING: Delete LegacyStudySelectionsCleanup.tsx, its test, and the SessionStoreProvider reference: cleanup expired at ${new Date(legacyStudySelectionsCleanupExpiresAt).toISOString()}.\n`,
      );
    }
  });

  test(`is a no-op at and after expiry without requiring store providers`, () => {
    for (const now of [
      legacyStudySelectionsCleanupExpiresAt,
      legacyStudySelectionsCleanupExpiresAt + 1,
    ]) {
      vi.setSystemTime(now);
      const rendered = render(<LegacyStudySelectionsCleanup />);
      expect(rendered.container).toBeEmptyDOMElement();
      rendered.unmount();
    }
  });

  test(`removes legacy entries before expiry and preserves exact meanings`, async ({
    db,
    rizzle,
  }) => {
    const legacyKey = `${studyWordItemSetting.entity.keyPrefix}好`;
    const keyParams = getStudyWordKeyParams(`好:good`);
    const exactKey = studyWordItemSetting.entity.marshalKey(keyParams);
    const value = studyWordItemSetting.encodeStoredValue(keyParams, {
      ...keyParams,
      createdAt: new Date(),
    });
    for (const key of [legacyKey, exactKey, `userName`]) {
      await rizzle.mutate.setSetting({
        key,
        value,
        now: new Date(),
        skipHistory: true,
      });
    }
    await db.settingCollection.preload();
    expect(db.settingCollection.get(legacyKey)?.value).toEqual(value);
    const rendered = render(<LegacyStudySelectionsCleanup />, {
      wrapper: providers(rizzle),
    });
    await waitFor(() => {
      expect(db.settingCollection.get(legacyKey)?.value ?? null).toBeNull();
      expect(db.settingCollection.get(exactKey)?.value).toEqual(value);
      expect(db.settingCollection.get(`userName`)?.value).toEqual(value);
    });
    rendered.rerender(<LegacyStudySelectionsCleanup />);
    expect(db.settingCollection.get(exactKey)?.value).toEqual(value);
    rendered.unmount();
  });

  test(`does not clean newly synced entries after expiry in an already mounted session`, async ({
    db,
    rizzle,
  }) => {
    const rendered = render(<LegacyStudySelectionsCleanup />, {
      wrapper: providers(rizzle),
    });
    await db.settingCollection.preload();
    vi.setSystemTime(legacyStudySelectionsCleanupExpiresAt);
    const key = `${studyWordItemSetting.entity.keyPrefix}好`;
    const keyParams = getStudyWordKeyParams(`好:good`);
    const value = studyWordItemSetting.encodeStoredValue(keyParams, {
      ...keyParams,
      createdAt: new Date(),
    });
    await act(async () => {
      await rizzle.mutate.setSetting({
        key,
        value,
        now: new Date(),
        skipHistory: true,
      });
    });
    await waitFor(() => {
      expect(db.settingCollection.get(key)?.value).toEqual(value);
    });
    rendered.unmount();
  });
});
