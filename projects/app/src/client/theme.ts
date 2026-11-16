import { r } from "@/util/rizzle";
import { z } from "zod";

const colorSchemeOverrideKindSchema = z.enum({
  Light: `light`,
  Dark: `dark`,
});
export const ColorSchemeOverrideKind = colorSchemeOverrideKindSchema.enum;

const themeSwapIntervalKindSchema = z.enum({
  Every5Seconds: `5s`,
  Every2Minutes: `2m`,
  Every5Minutes: `5m`,
  Hourly: `hourly`,
  Daily: `daily`,
});
export const ThemeSwapIntervalKind = themeSwapIntervalKindSchema.enum;

export const colorSchemeOverrideSetting = r.entity(
  `settings.appearance.theme`,
  {
    mode: r
      .enum(ColorSchemeOverrideKind, {
        [ColorSchemeOverrideKind.Light]: `light`,
        [ColorSchemeOverrideKind.Dark]: `dark`,
      })
      .alias(`m`),
  },
);

export const themeSwapIntervalSetting = r.entity(
  `settings.developer.themeSwapInterval`,
  {
    interval: r
      .enum(ThemeSwapIntervalKind, {
        [ThemeSwapIntervalKind.Every5Seconds]: `5s`,
        [ThemeSwapIntervalKind.Every2Minutes]: `2m`,
        [ThemeSwapIntervalKind.Every5Minutes]: `5m`,
        [ThemeSwapIntervalKind.Hourly]: `hourly`,
        [ThemeSwapIntervalKind.Daily]: `daily`,
      })
      .alias(`i`),
  },
);
