import {
  defaultPinyinSoundGroupNames,
  defaultPinyinSoundGroupThemes,
} from "@/data/pinyin";
import type { RizzleAnyEntity } from "@/util/rizzle";
import type {
  UserSettingKeyInput,
  UserSettingTextEntity,
} from "./useUserSetting";
import {
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupThemeSetting,
} from "./useUserSetting";

/**
 * Returns the default value for a user setting text entity based on its type and key.
 * This is used to provide a fallback value when the user has not set a custom value.
 */
export function useUserSettingTextDefaultValue<T extends UserSettingTextEntity>(
  setting: T,
  settingKey: UserSettingKeyInput<T>,
): string | undefined {
  switch (setting as RizzleAnyEntity) {
    case pinyinSoundGroupNameSetting: {
      const { soundGroupId } = settingKey as UserSettingKeyInput<
        typeof pinyinSoundGroupNameSetting
      >;
      return defaultPinyinSoundGroupNames[soundGroupId];
    }

    case pinyinSoundGroupThemeSetting: {
      const { soundGroupId } = settingKey as UserSettingKeyInput<
        typeof pinyinSoundGroupThemeSetting
      >;
      return defaultPinyinSoundGroupThemes[soundGroupId];
    }

    default:
      return undefined;
  }
}
