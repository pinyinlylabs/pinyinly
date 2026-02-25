import type {
  UserSettingKeyInput,
  UserSettingTextEntity,
} from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { ReactNode } from "react";

interface SettingTextProps<T extends UserSettingTextEntity> {
  setting: T;
  settingKey: UserSettingKeyInput<T>;
  defaultValue?: string;
}

export function SettingText<T extends UserSettingTextEntity>({
  setting,
  settingKey,
  defaultValue,
}: SettingTextProps<T>): ReactNode {
  "use memo";
  const { value } = useUserSetting(setting, settingKey);

  return value?.text ?? defaultValue ?? ``;
}
