// @vitest-environment happy-dom

import { deviceStoreGetByStorageKey } from "#client/deviceStore.ts";
import { afterEach, expect, test, vi } from "vitest";

afterEach(() => {
  vi.unstubAllGlobals();
});

test(`returns no device value when browser storage is unavailable during SSR`, async () => {
  vi.stubGlobal(`localStorage`, undefined);

  await expect(
    deviceStoreGetByStorageKey(`hhh.settings.appearance.theme`),
  ).resolves.toBeNull();
});
