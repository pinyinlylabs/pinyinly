import type { UserSettingEntityLike } from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { ToggleButton } from "@/client/ui/ToggleButton";
import type { UserSettingToggleableEntity } from "@/data/userSettings";

export function UserSettingToggleButton({
  entity,
  defaultEnabled = false,
  accessibilityLabel,
}: {
  entity: UserSettingEntityLike<UserSettingToggleableEntity>;
  defaultEnabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { isLoading, value, setValue } = useUserSetting({ setting: entity });

  return (
    <ToggleButton
      isActive={isLoading ? null : (value?.enabled ?? defaultEnabled)}
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        setValue((prev) => {
          const prevEnabled = prev?.enabled ?? defaultEnabled;
          return { ...prev, enabled: !prevEnabled };
        });
      }}
    />
  );
}
