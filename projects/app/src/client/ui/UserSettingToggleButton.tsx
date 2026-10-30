import { useUserSettingToggle } from "@/client/ui/hooks/useUserSettingToggle";
import { ToggleButton } from "@/client/ui/ToggleButton";
import type { UserSettingEntityLike } from "@/client/ui/hooks/useUserSetting";
import type { UserSettingToggleableEntity } from "@/data/userSettings";

export function UserSettingToggleButton({
  entity,
  accessibilityLabel,
}: {
  entity: UserSettingEntityLike<UserSettingToggleableEntity>;
  accessibilityLabel?: string;
}) {
  const { isLoading, isEnabled, setEnabled } = useUserSettingToggle(entity);

  return (
    <ToggleButton
      isActive={isLoading ? null : isEnabled}
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        setEnabled(!isEnabled);
      }}
    />
  );
}
