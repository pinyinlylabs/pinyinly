import type { DeviceStoreToggleableEntity } from "@/client/deviceStore";
import { deviceStoreGet } from "@/client/deviceStore";
import { r } from "./rizzle";

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function devToolsSlowQuerySleepIfEnabled(): Promise<void> {
  const setting = await deviceStoreGet(slowQueriesSetting);
  if (setting?.enabled ?? false) {
    await sleep(1000);
  }
}

export const slowQueriesSetting = r.entity(`settings.developer.slowQueries`, {
  enabled: r.boolean(`e`),
}) satisfies DeviceStoreToggleableEntity;
