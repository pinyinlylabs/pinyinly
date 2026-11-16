import { r } from "@/util/rizzle";
import { z } from "zod";

const colorSchemeOverrideKindSchema = z.enum({
  Light: `light`,
  Dark: `dark`,
});
export const ColorSchemeOverrideKind = colorSchemeOverrideKindSchema.enum;

const simpleCronIntervalKindSchema = z.enum({
  Every5Seconds: `*/5 * * * * *`,
  Every2Minutes: `0 */2 * * * *`,
  Every5Minutes: `0 */5 * * * *`,
  Hourly: `0 0 * * * *`,
  Daily: `0 0 0 * * *`,
});
export const SimpleCronIntervalKind = simpleCronIntervalKindSchema.enum;

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

export const devThemeSwapIntervalSetting = r.entity(
  `settings.developer.themeSwapInterval`,
  {
    interval: r
      .enum(SimpleCronIntervalKind, {
        [SimpleCronIntervalKind.Every5Seconds]: `*/5 * * * * *`,
        [SimpleCronIntervalKind.Every2Minutes]: `0 */2 * * * *`,
        [SimpleCronIntervalKind.Every5Minutes]: `0 */5 * * * *`,
        [SimpleCronIntervalKind.Hourly]: `0 0 * * * *`,
        [SimpleCronIntervalKind.Daily]: `0 0 0 * * *`,
      })
      .alias(`i`),
  },
);
