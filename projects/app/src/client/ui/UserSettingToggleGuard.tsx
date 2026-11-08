import { useUserSettingToggle } from "@/client/ui/hooks/useUserSettingToggle";
import type { UserSettingEntityLike } from "@/client/ui/hooks/useUserSetting";
import type { UserSettingToggleableEntity } from "@/data/userSettings";
import type { ReactNode } from "react";

export function UserSettingToggleGuard({
  setting,
  children,
}: {
  setting?: UserSettingEntityLike<UserSettingToggleableEntity>;
  children: ReactNode;
}) {
  return setting == null ? (
    <>{children}</>
  ) : (
    <UserSettingToggleGuardEnabled setting={setting}>
      {children}
    </UserSettingToggleGuardEnabled>
  );
}

function UserSettingToggleGuardEnabled({
  setting,
  children,
}: {
  setting: UserSettingEntityLike<UserSettingToggleableEntity>;
  children: ReactNode;
}): ReactNode {
  const { isEnabled } = useUserSettingToggle(setting);
  return isEnabled ? children : null;
}
