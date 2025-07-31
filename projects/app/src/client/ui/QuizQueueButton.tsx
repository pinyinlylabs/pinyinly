import type { SkillReviewQueue } from "@/data/skills";
import { Link } from "expo-router";
import { Text } from "react-native";
import Reanimated, { Easing, ZoomIn } from "react-native-reanimated";
import { tv } from "tailwind-variants";
import { IconImage } from "./IconImage";

export function QuizQueueButton({
  queueStats,
}: {
  queueStats: Pick<
    SkillReviewQueue,
    `overDueCount` | `dueCount` | `newCount`
  > | null;
}) {
  const queueCount =
    queueStats == null
      ? null
      : queueStats.overDueCount + queueStats.dueCount + queueStats.newCount;
  return (
    <Link
      href="/history"
      className={`
        relative size-[32px] flex-row justify-center

        md:justify-start
      `}
    >
      <IconImage
        size={32}
        className="self-center text-fg"
        source={require(`@/assets/icons/inbox-filled.svg`)}
      />
      {queueStats == null || queueCount == null ? null : queueCount > 0 ? (
        <CountLozenge
          count={queueCount}
          mode={
            queueStats.overDueCount > 0
              ? `overdue`
              : queueStats.dueCount > 0
                ? `due`
                : `new`
          }
        />
      ) : null}
    </Link>
  );
}

function CountLozenge({
  count,
  mode,
  className,
}: {
  count: number;
  mode: `overdue` | `due` | `new`;
  className?: string;
}) {
  const countText = count >= 999 ? `999+` : `${count}`;
  return (
    <Reanimated.View
      entering={ZoomIn.easing(Easing.quad)}
      className={countLozengePillClass({ mode, className })}
    >
      <Text className="text-[10px] font-bold tabular-nums text-bg">
        {countText}
      </Text>
    </Reanimated.View>
  );
}

const countLozengePillClass = tv({
  base: `
    absolute left-[52%] top-[60%] flex h-[20px] min-w-[20px] items-center justify-center
    rounded-full border-2 border-solid border-bg px-[4px]
  `,
  variants: {
    mode: {
      overdue: `bg-brick`,
      due: `bg-cyanold`,
      new: `bg-wasabi`,
    },
  },
  defaultVariants: {
    mode: `overdue`,
  },
});
