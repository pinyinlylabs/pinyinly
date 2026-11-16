import { SimpleCronIntervalKind } from "@/client/theme";
import ms from "ms";
import { useEffect, useState } from "react";

export const simpleCronIntervalMs = {
  [SimpleCronIntervalKind.Every5Seconds]: ms(`5s`),
  [SimpleCronIntervalKind.Every2Minutes]: ms(`2m`),
  [SimpleCronIntervalKind.Every5Minutes]: ms(`5m`),
  [SimpleCronIntervalKind.Hourly]: ms(`1h`),
  [SimpleCronIntervalKind.Daily]: ms(`1d`),
} satisfies Record<
  (typeof SimpleCronIntervalKind)[keyof typeof SimpleCronIntervalKind],
  number
>;

export function useSimpleCronInterval(
  interval:
    | (typeof SimpleCronIntervalKind)[keyof typeof SimpleCronIntervalKind]
    | null,
) {
  const [now, setNow] = useState(() => Date.now());
  const duration = interval == null ? null : simpleCronIntervalMs[interval];

  useEffect(() => {
    if (interval == null || duration == null) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout>;
    const update = () => {
      const currentTime = Date.now();
      setNow(currentTime);
      const currentDate = new Date(currentTime);
      const delay =
        interval === SimpleCronIntervalKind.Hourly
          ? ms(`1h`) -
            (currentDate.getMinutes() * ms(`1m`) +
              currentDate.getSeconds() * ms(`1s`) +
              currentDate.getMilliseconds())
          : interval === SimpleCronIntervalKind.Daily
            ? new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                currentDate.getDate() + 1,
              ).getTime() - currentTime
            : duration - (currentTime % duration);
      timeout = setTimeout(update, delay);
    };
    update();
    return () => {
      clearTimeout(timeout);
    };
  }, [duration, interval]);

  return now;
}
