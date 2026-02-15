import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { UserSettingToggleableEntity } from "@/client/ui/hooks/useUserSetting";
import { ToggleButton } from "@/client/ui/ToggleButton";

export function UserSettingToggleButton({
  entity,
}: {
  entity: UserSettingToggleableEntity;
}) {
  const { isLoading, value, setValue } = useUserSetting(entity);

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
