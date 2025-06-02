import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { useCallback, useEffect, useState } from "react";
import { Text } from "react-native";

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
  const [value, setValue] = useState(() => diffValue(date));

  const updateValue = useCallback(() => {
    setValue(diffValue(date));
  }, [date]);

  useEffect(() => {
    updateValue();
    const timer = setTimeout(() => {
      updateValue();
    }, countdownUpdatePeriod(date));

    return () => {
      clearTimeout(timer);
    };
  }, [date, updateValue]);

  return <Text className={`font-bold text-foreground`}>⏱️ {value}</Text>;
};
