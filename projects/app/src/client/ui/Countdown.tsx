import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useEffect, useState } from "react";
import { Text } from "@/client/ui/Text";

function diffValue(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

const oneSecondMs = 1000;
const oneMinuteMs = 60 * oneSecondMs;
const oneHourDiffMs = 60 * oneMinuteMs;
const oneDayDiffMs = 24 * oneHourDiffMs;

function countdownUpdatePeriod(date: Date): number {
  const diffMs = date.getTime() - Date.now();
  if (diffMs > oneDayDiffMs) {
    return 10 * oneMinuteMs;
  } else if (diffMs > oneHourDiffMs) {
    return oneMinuteMs;
  } else if (diffMs > 0) {
    return oneSecondMs;
  }
  return Number.MAX_SAFE_INTEGER;
}

export const Countdown = ({ date }: { date: Date }) => {
  const [, setTick] = useState(0);

  const value = diffValue(date);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTick((tick) => tick + 1);
    }, countdownUpdatePeriod(date));

    return () => {
      clearTimeout(timer);
    };
  }, [date]);

  return <Text className={`font-sans font-bold text-fg`}>⏱️ {value}</Text>;
};
