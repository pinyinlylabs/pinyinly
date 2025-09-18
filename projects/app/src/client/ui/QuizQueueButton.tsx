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
    `overDueCount` | `dueCount` | `newContentCount` | `retryCount`
  > | null;
}) {
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
      {queueStats == null ? null : <StackedLozenges queueStats={queueStats} />}
    </Link>
  );
}

function StackedLozenges({
  queueStats,
}: {
  queueStats: Pick<
    SkillReviewQueue,
    `overDueCount` | `dueCount` | `newContentCount` | `retryCount`
  >;
}) {
  // Collect the active queue types with their counts and priority order
  const queueTypes: {
    count: number;
    mode: `retry` | `overdue` | `due` | `new`;
    priority: number;
  }[] = [];

  if (queueStats.retryCount > 0) {
    queueTypes.push({
      count: queueStats.retryCount,
      mode: `retry`,
      priority: 0, // highest priority (top)
    });
  }
  if (queueStats.overDueCount > 0) {
    queueTypes.push({
      count: queueStats.overDueCount,
      mode: `overdue`,
      priority: 1,
    });
  }
  if (queueStats.dueCount > 0) {
    queueTypes.push({
      count: queueStats.dueCount,
      mode: `due`,
      priority: 2,
    });
  }
  if (queueStats.newContentCount > 0) {
    queueTypes.push({
      count: queueStats.newContentCount,
      mode: `new`,
      priority: 3, // lowest priority (bottom)
    });
  }

  // Sort by priority (highest priority first, will be rendered on top)
  queueTypes.sort((a, b) => a.priority - b.priority);

  if (queueTypes.length === 0) {
    return null;
  }

  return (
    <>
      {queueTypes.map(({ count, mode }, index) => (
        <CountLozenge key={mode} count={count} mode={mode} stackIndex={index} />
      ))}
    </>
  );
}

function CountLozenge({
  count,
  mode,
  stackIndex = 0,
  className,
}: {
  count: number;
  mode: `retry` | `overdue` | `due` | `new`;
  stackIndex?: number;
  className?: string;
}) {
  const countText = count >= 999 ? `999+` : `${count}`;
  return (
    <Reanimated.View
      entering={ZoomIn.easing(Easing.quad)}
      className={countLozengePillClass({ mode, className })}
      style={{
        // Stack lozenges with slight offset to show the edge of lower ones
        zIndex: 10 - stackIndex, // Higher priority = higher z-index
        transform: [{ translateX: stackIndex * -2 }], // Slight left offset for stacked effect
      }}
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
      retry: `bg-red`, // bright red for retry items
      overdue: `bg-brick`,
      due: `bg-cyanold`,
      new: `bg-wasabi`,
    },
  },
  defaultVariants: {
    mode: `overdue`,
  },
});
