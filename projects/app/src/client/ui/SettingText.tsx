import type {
  UserSettingEntityLike,
  UserSettingKeyInput,
} from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { UserSettingTextEntity } from "@/data/userSettings";
import type { IsExhaustedRest } from "@pinyinly/lib/types";
import type { ReactNode } from "react";
import { Text } from "react-native";
import { useUserSettingTextDefaultValue } from "./hooks/useUserSettingTextDefaultValue";

interface SettingTextProps<T extends UserSettingTextEntity> {
  setting: UserSettingEntityLike<T>;
  settingKey: UserSettingKeyInput<T>;
  fallback?: string;
  className?: string;
}

export function SettingText<T extends UserSettingTextEntity>({
  setting,
  settingKey,
  fallback,
  className,
  ...rest
}: SettingTextProps<T>): ReactNode {
  true satisfies IsExhaustedRest<typeof rest>;

  let { value } = useUserSetting({ setting, key: settingKey });
  if (value?.text.length === 0) {
    value = null;
  }
  const defaultValue = useUserSettingTextDefaultValue(setting, settingKey);

  const text = value?.text ?? defaultValue ?? fallback ?? null;

  return text == null || className == null ? (
    text
  ) : (
    <Text className={className}>{text}</Text>
  );
}
