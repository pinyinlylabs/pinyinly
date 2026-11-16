import {
  colorSchemeOverrideSetting,
  ThemeSwapIntervalKind,
  themeSwapIntervalSetting,
} from "@/client/theme";
import { useDeviceStoreSuspenseQuery } from "@/client/ui/hooks/useDeviceStore";
import ms from "ms";
import { useEffect, useState } from "react";
import { useColorScheme } from "react-native";

const themeSwapIntervalMs = {
  [ThemeSwapIntervalKind.Every5Seconds]: ms(`5s`),
  [ThemeSwapIntervalKind.Every2Minutes]: ms(`2m`),
  [ThemeSwapIntervalKind.Every5Minutes]: ms(`5m`),
  [ThemeSwapIntervalKind.Hourly]: ms(`1h`),
  [ThemeSwapIntervalKind.Daily]: ms(`1d`),
} satisfies Record<
  (typeof ThemeSwapIntervalKind)[keyof typeof ThemeSwapIntervalKind],
  number
>;

export function useColorSchemeOverride() {
  const query = useDeviceStoreSuspenseQuery(colorSchemeOverrideSetting);
  const swapQuery = useDeviceStoreSuspenseQuery(themeSwapIntervalSetting);
  const systemTheme = useColorScheme();
  const override = query.data?.mode ?? null;
  const swapInterval = swapQuery.data?.interval ?? null;
  const swapDuration =
    swapInterval == null ? null : themeSwapIntervalMs[swapInterval];
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (swapInterval == null || swapDuration == null) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    const update = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      const currentDate = new Date(currentTime);
      const delay =
        swapInterval === ThemeSwapIntervalKind.Hourly
          ? ms(`1h`) -
            (currentDate.getMinutes() * ms(`1m`) +
              currentDate.getSeconds() * ms(`1s`) +
              currentDate.getMilliseconds())
          : swapInterval === ThemeSwapIntervalKind.Daily
            ? new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate() + 1,
              ).getTime() - currentTime
            : swapDuration - (currentTime % swapDuration);
      timeout = setTimeout(update, delay);
    };
    update();
    return () => {
      clearTimeout(timeout);
    };
  }, [swapInterval, swapDuration]);

  const swapIndex =
    swapInterval === ThemeSwapIntervalKind.Hourly
      ? new Date(now).getHours()
      : swapInterval === ThemeSwapIntervalKind.Daily
        ? (() => {
            const date = new Date(now);
            return (
              Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) /
              ms(`1d`)
            );
          })()
        : swapDuration == null
          ? null
          : Math.floor(now / swapDuration);

  const colorScheme =
    swapIndex == null
      ? (override ?? (systemTheme === `dark` ? `dark` : `light`))
      : swapIndex % 2 === 1
        ? `light`
        : `dark`;

  return { override, colorScheme };
}
