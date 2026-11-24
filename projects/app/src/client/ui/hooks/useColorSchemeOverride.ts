import {
  colorSchemeOverrideSetting,
  devThemeSwapIntervalSetting,
  SimpleCronIntervalKind,
} from "@/client/theme";
import { useDeviceStoreSuspenseQuery } from "@/client/ui/hooks/useDeviceStore";
import {
  simpleCronIntervalMs,
  useSimpleCronInterval,
} from "@/client/ui/hooks/useSimpleCronInterval";
import ms from "ms";
import { useColorScheme } from "react-native";

export function getThemeSwapColorScheme(
  interval:
    | (typeof SimpleCronIntervalKind)[keyof typeof SimpleCronIntervalKind]
    | null,
  now: number,
): `light` | `dark` | null {
  if (interval == null) {
    return null;
  }

  const swapIndex =
    interval === SimpleCronIntervalKind.Hourly
      ? new Date(now).getHours()
      : interval === SimpleCronIntervalKind.Daily
        ? (() => {
            const date = new Date(now);
            return (
              Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
              ms(`1d`)
            );
          })()
        : Math.floor(now / simpleCronIntervalMs[interval]);

  return swapIndex % 2 === 1 ? `light` : `dark`;
}

export function useColorSchemeOverride() {
  const query = useDeviceStoreSuspenseQuery(colorSchemeOverrideSetting);
  const swapQuery = useDeviceStoreSuspenseQuery(devThemeSwapIntervalSetting);
  const systemTheme = useColorScheme();
  const override = query.data?.mode ?? null;
  const swapInterval = swapQuery.data?.interval ?? null;
  const now = useSimpleCronInterval(swapInterval);
  const colorScheme =
    now == null
      ? `light`
      : (getThemeSwapColorScheme(swapInterval, now) ??
        override ??
        (systemTheme === `dark` ? `dark` : `light`));

  return { override, colorScheme };
}
