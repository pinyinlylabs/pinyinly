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
    `overDueCount` | `dueCount` | `newContentCount`
  > | null;
}) {
  const hasAnyItems =
    queueStats != null &&
    (queueStats.overDueCount > 0 ||
      queueStats.dueCount > 0 ||
      queueStats.newContentCount > 0);

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
      {queueStats != null && hasAnyItems ? (
        <StackedCountLozenges queueStats={queueStats} />
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

function StackedCountLozenges({
  queueStats,
}: {
  queueStats: Pick<
    SkillReviewQueue,
    `overDueCount` | `dueCount` | `newContentCount`
  >;
}) {
  const lozenges = [];
  let zIndex = 30; // Start with highest z-index for the top lozenge
  let topOffset = 0; // Start with no offset for the top lozenge

  // Add overdue lozenge (red, highest priority)
  if (queueStats.overDueCount > 0) {
    lozenges.push({
      count: queueStats.overDueCount,
      mode: `overdue` as const,
      zIndex: zIndex as 30 | 29 | 28,
      topOffset: topOffset as 0 | 1 | 2,
    });
    zIndex--;
    topOffset++;
  }

  // Add due lozenge (blue, medium priority)
  if (queueStats.dueCount > 0) {
    lozenges.push({
      count: queueStats.dueCount,
      mode: `due` as const,
      zIndex: zIndex as 30 | 29 | 28,
      topOffset: topOffset as 0 | 1 | 2,
    });
    zIndex--;
    topOffset++;
  }

  // Add new content lozenge (green, lowest priority)
  if (queueStats.newContentCount > 0) {
    lozenges.push({
      count: queueStats.newContentCount,
      mode: `new` as const,
      zIndex: zIndex as 30 | 29 | 28,
      topOffset: topOffset as 0 | 1 | 2,
    });
  }

  return (
    <>
      {lozenges.map((lozenge) => (
        <CountLozenge
          key={lozenge.mode}
          count={lozenge.count}
          mode={lozenge.mode}
          className={stackedLozengePillClass({
            zIndex: lozenge.zIndex,
            topOffset: lozenge.topOffset,
          })}
        />
      ))}
    </>
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

const stackedLozengePillClass = tv({
  base: ``,
  variants: {
    zIndex: {
      30: `z-30`,
      29: `z-20`,
      28: `z-10`,
    },
    topOffset: {
      0: `left-[52%] top-[60%]`, // Top lozenge fully visible
      1: `left-[54%] top-[62%]`, // Second lozenge slightly offset down and right
      2: `left-[56%] top-[64%]`, // Third lozenge more offset, showing just the edge
    },
  },
});
