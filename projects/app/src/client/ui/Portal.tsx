import type { PropsWithChildren } from "react";
import { Portal as TeleportPortal } from "react-native-teleport";
import { ScopedTheme, useUniwind } from "uniwind";

export function Portal({ children }: PropsWithChildren) {
  const { theme } = useUniwind();

  return (
    <TeleportPortal hostName="root">
      <ScopedTheme theme={theme}>{children}</ScopedTheme>
    </TeleportPortal>
  );
}
