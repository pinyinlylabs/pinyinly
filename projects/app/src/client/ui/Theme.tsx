import { invariant } from "@pinyinly/lib/invariant";
import type { PropsWithChildren } from "react";
import type { ThemeName } from "uniwind";
import { ScopedTheme, useUniwind } from "uniwind";

type LightModeStripped<T> = T extends `light-${infer U}`
  ? U
  : T extends `dark-${infer U}`
    ? U
    : never;

export type PylyThemeName =
  | ThemeName
  | LightModeStripped<ThemeName>
  | `default`;

export function Theme({
  children,
  theme,
}: PropsWithChildren<{ theme?: PylyThemeName }>) {
  const { theme: parentTheme } = useUniwind();

  if (theme == null) {
    return <>{children}</>;
  }

  const parentLightOrDark = /^(?:light|dark)\b/u.exec(parentTheme)?.[0];
  const isLightOrDark = /^(?:light|dark)\b/u.test(theme);

  if (theme === `default`) {
    invariant(
      parentLightOrDark != null,
      `Theme must be used within a parent Theme`,
    );
    theme = parentLightOrDark as ThemeName;
  } else // Turn a theme like "danger-panel" into "light-danger-panel" or
  // "dark-danger-panel" depending on the parent theme.
  if (!isLightOrDark) {
    invariant(
      parentLightOrDark != null,
      `Theme must be used within a parent Theme`,
    );
    theme = `${parentLightOrDark}-${theme}` as ThemeName;
  }

  return <ScopedTheme theme={theme as ThemeName}>{children}</ScopedTheme>;
}
