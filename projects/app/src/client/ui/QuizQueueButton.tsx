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
      {hasAnyItems ? <StackedCountLozenges queueStats={queueStats} /> : null}
    </Link>
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
  // Determine which lozenges to show and their stacking order
  const lozenges: {
    count: number;
    mode: `overdue` | `due` | `new`;
    stackIndex: number;
  }[] = [];

  let stackIndex = 0;

  // Add lozenges in stacking order (top to bottom)
  if (queueStats.overDueCount > 0) {
    lozenges.push({
      count: queueStats.overDueCount,
      mode: `overdue`,
      stackIndex: stackIndex++,
    });
  }
  if (queueStats.dueCount > 0) {
    lozenges.push({
      count: queueStats.dueCount,
      mode: `due`,
      stackIndex: stackIndex++,
    });
  }
  if (queueStats.newContentCount > 0) {
    lozenges.push({
      count: queueStats.newContentCount,
      mode: `new`,
      stackIndex: stackIndex++,
    });
  }

  return (
    <>
      {lozenges.map(({ count, mode, stackIndex }) => (
        <CountLozenge
          key={mode}
          count={count}
          mode={mode}
          stackIndex={stackIndex}
        />
      ))}
    </>
  );
}

function CountLozenge({
  count,
  mode,
  stackIndex,
  className,
}: {
  count: number;
  mode: `overdue` | `due` | `new`;
  stackIndex: number;
  className?: string;
}) {
  const countText = count >= 999 ? `999+` : `${count}`;

  // Calculate positioning based on stack index
  const stackOffsets = {
    left: 52 + stackIndex * 6, // Start at 52%, move right by 6% per stack
    top: 60 + stackIndex * 3, // Start at 60%, move down by 3% per stack
    zIndex: 30 - stackIndex * 10, // Start at z-30, decrease by 10 per stack
  };

  return (
    <Reanimated.View
      entering={ZoomIn.easing(Easing.quad).delay(stackIndex * 50)}
      className={countLozengePillClass({ mode, className })}
      style={{
        left: `${stackOffsets.left}%`,
        top: `${stackOffsets.top}%`,
        zIndex: stackOffsets.zIndex,
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
    absolute flex h-[20px] min-w-[20px] items-center justify-center rounded-full border-2
    border-solid border-bg px-[4px]
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
