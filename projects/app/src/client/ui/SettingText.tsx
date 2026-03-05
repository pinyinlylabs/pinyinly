import type {
  UserSettingEntityLike,
  UserSettingKeyInput,
} from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { UserSettingTextEntity } from "@/data/userSettings";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import { useUserSettingTextDefaultValue } from "./hooks/useUserSettingTextDefaultValue";

interface SettingTextProps<T extends UserSettingTextEntity> {
  setting: UserSettingEntityLike<T>;
  settingKey: UserSettingKeyInput<T>;
  fallback?: string;
}

export function SettingText<T extends UserSettingTextEntity>({
  setting,
  settingKey,
  fallback,
  ...rest
}: SettingTextProps<T>): string | null {
  true satisfies IsExhaustedRest<typeof rest>;

  let { value } = useUserSetting(setting, settingKey);
  if (value?.text.length === 0) {
    value = null;
  }
  const defaultValue = useUserSettingTextDefaultValue(setting, settingKey);

  return value?.text ?? defaultValue ?? fallback ?? null;
}
