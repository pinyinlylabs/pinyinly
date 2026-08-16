import { nonNullable } from "@pinyinly/lib/invariant";
import type { PropsWithChildren } from "react";
import type { ThemeName } from "uniwind";
import { ScopedTheme, useUniwind } from "uniwind";

type LightModeStripped<T> = T extends `light-${infer U}`
  ? U
  : T extends `dark-${infer U}`
    ? U
    : never;

export type PylyThemeName = ThemeName | LightModeStripped<ThemeName>;

export function Theme({
  children,
  theme,
}: PropsWithChildren<{ theme: PylyThemeName }>) {
  const { theme: parentTheme } = useUniwind();

  // Turn a theme like "danger-panel" into "light-danger-panel" or
  // "dark-danger-panel" depending on the parent theme.
  const isLightOrDark = /^(?:light|dark)\b/u.test(theme);
  if (!isLightOrDark) {
    const parentThemePrefix = nonNullable(
      /^(?:light|dark)\b/u.exec(parentTheme)?.[0],
    );
    theme = `${parentThemePrefix}-${theme}` as ThemeName;
  }

  return <ScopedTheme theme={theme as ThemeName}>{children}</ScopedTheme>;
}
