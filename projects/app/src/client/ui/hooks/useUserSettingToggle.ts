import { getUserSettingDefaultValue } from "@/data/userSettings";
import type { UserSettingToggleableEntity } from "@/data/userSettings";
import type { UserSettingEntityLike } from "./useUserSetting";
import { useUserSetting } from "./useUserSetting";

export function useUserSettingToggle(
  setting: UserSettingEntityLike<UserSettingToggleableEntity>,
  defaultEnabled?: boolean,
) {
  const { isLoading, value, setValue } = useUserSetting({ setting });
  const settingDefault = getUserSettingDefaultValue(setting, {});
  const isEnabled =
    value?.enabled ??
    defaultEnabled ??
    (typeof settingDefault?.[`enabled`] === `boolean`
      ? settingDefault[`enabled`]
      : false);

  return {
    isLoading,
    isEnabled,
    setEnabled: (enabled: boolean) => {
      setValue((prev) => ({ ...prev, enabled }));
    },
  };
}
