import { getUserSettingDefaultValue } from "@/data/userSettings";
import type {
  UserSettingEntityLike,
  UserSettingKeyInput,
  UserSettingTextEntity,
} from "./useUserSetting";

/**
 * Returns the default value for a user setting text entity based on its type and key.
 * This is used to provide a fallback value when the user has not set a custom value.
 */
export function useUserSettingTextDefaultValue<T extends UserSettingTextEntity>(
  setting: UserSettingEntityLike<T>,
  settingKey: UserSettingKeyInput<T>,
): string | undefined {
  const value = getUserSettingDefaultValue(setting, settingKey);
  if (value == null || typeof value[`text`] !== `string`) {
    return undefined;
  }
  return value[`text`];
}
