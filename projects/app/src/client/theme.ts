import { r } from "@/util/rizzle";
import { z } from "zod";

const colorSchemeOverrideKindSchema = z.enum({
  Light: `light`,
  Dark: `dark`,
});
export const ColorSchemeOverrideKind = colorSchemeOverrideKindSchema.enum;

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
