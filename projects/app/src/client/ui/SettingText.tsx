import type {
  UserSettingEntityLike,
  UserSettingKeyInput,
  UserSettingTextEntity,
} from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { useUserSettingTextDefaultValue } from "./hooks/useUserSettingTextDefaultValue";

interface SettingTextProps<T extends UserSettingTextEntity> {
  setting: UserSettingEntityLike<T>;
  settingKey: UserSettingKeyInput<T>;
}

export function SettingText<T extends UserSettingTextEntity>({
  setting,
  settingKey,
}: SettingTextProps<T>): string {
  const { value } = useUserSetting(setting, settingKey);
  const defaultValue = useUserSettingTextDefaultValue(setting, settingKey);

  return value?.text ?? defaultValue ?? ``;
}
