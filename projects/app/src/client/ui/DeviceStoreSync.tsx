import { useAuth } from "@/client/auth";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { userNameSetting } from "@/data/userSettings";
import { useEffect } from "react";

/**
 * Syncs user settings to the device store (DeviceSession cache).
 *
 * This component ensures that whenever a user setting is updated via Replicache,
 * the corresponding value in the DeviceSession cache is also updated. This keeps
 * the local cache in sync with the centralized setting, so UI components that read
 * from the cache (like the account switcher) always show current values.
 *
 * Rendered as a sibling to other session-scoped providers so it automatically
 * syncs settings for any active SessionStoreProvider.
 */
export function DeviceStoreSync({ dbName }: { dbName: string }) {
  const userName = useUserSetting(userNameSetting).value?.text ?? null;
  const { setDeviceSessionUserName } = useAuth();

  // Sync userName from setting to auth state (DeviceSession cache)
  useEffect(() => {
    setDeviceSessionUserName({ dbName, userName });
  }, [setDeviceSessionUserName, dbName, userName]);

  return null;
}
