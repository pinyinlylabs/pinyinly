import type { UserSettingEntityLike } from "@/client/ui/hooks/useUserSetting";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { ToggleButton } from "@/client/ui/ToggleButton";
import type { UserSettingToggleableEntity } from "@/data/userSettings";

export function UserSettingToggleButton({
  entity,
}: {
  entity: UserSettingEntityLike<UserSettingToggleableEntity>;
}) {
  const { isLoading, value, setValue } = useUserSetting({ setting: entity });

  return (
    <ToggleButton
      isActive={isLoading ? null : (value?.enabled ?? false)}
      onPress={() => {
        setValue((prev) => {
          const prevEnabled = prev?.enabled ?? false;
          return { ...prev, enabled: !prevEnabled };
        });
      }}
    />
  );
}
