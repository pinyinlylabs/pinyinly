import { formatBuildTimestampVersion, formatRelativeTime } from "@/util/date";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";
import { z } from "zod";

// oxlint-disable-next-line unicorn/prefer-top-level-await -- Zod's schema fallback, not a Promise.
const buildTimestampSchema = z.iso
  .datetime()
  .transform((timestamp): Date | null => new Date(timestamp))
  .catch(() => null);

export function BuildTimestampStamp() {
  const [isShowingRelative, setIsShowingRelative] = useState(false);
  const timestamp = buildTimestampSchema.parse(
    process.env.EXPO_PUBLIC_BUILD_TIMESTAMP,
  );
  const hasTimestamp = timestamp !== null;

  useEffect(() => {
    if (!isShowingRelative || !hasTimestamp) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsShowingRelative(false);
    }, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, [hasTimestamp, isShowingRelative]);

  if (timestamp === null) {
    return null;
  }

  const version = formatBuildTimestampVersion(timestamp);
  const relativeTime = formatRelativeTime(timestamp);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isShowingRelative ? relativeTime : version}
      accessibilityHint="Tap to show relative update time briefly."
      className="
        mt-2 items-end px-5 py-1

        web:cursor-default! web:outline-none

        web:focus:outline-none

        web:focus-visible:outline-none
      "
      onPress={() => {
        setIsShowingRelative(true);
      }}
    >
      <View className="relative min-w-24 items-end">
        <Text
          accessible={false}
          className={`
            font-mono text-[10px] leading-4 text-fg/50 opacity-50 transition-opacity duration-300
            ease-in-out

            ${isShowingRelative ? `opacity-0` : `opacity-100`}
          `}
        >
          {version}
        </Text>
        <Text
          accessible={false}
          className={`
            absolute top-0 right-0 font-mono text-[10px] leading-4 text-fg/50 opacity-50
            transition-opacity duration-300 ease-in-out

            ${isShowingRelative ? `opacity-100` : `opacity-0`}
          `}
        >
          {relativeTime}
        </Text>
      </View>
    </Pressable>
  );
}
