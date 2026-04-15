import { useSkillQueue } from "@/client/ui/hooks/useSkillQueue";
import { Text } from "react-native";
import Reanimated, { Easing, ZoomIn } from "react-native-reanimated";
import { tv } from "tailwind-variants";

export function QuizQueueLozenge({
  className,
}: {
  className?: string;
} = {}) {
  const queueContextValue = useSkillQueue();

  if (queueContextValue.loading === true) {
    return null;
  }

  const queueStats = queueContextValue.reviewQueue;

  const queueCount =
    queueStats.overDueCount + queueStats.dueCount + queueStats.newContentCount;

  if (queueCount === 0) {
    return null;
  }

  const mode =
    queueStats.overDueCount > 0
      ? (`overdue` as const)
      : queueStats.dueCount > 0
        ? (`due` as const)
        : (`new` as const);

  return <CountLozenge count={queueCount} mode={mode} className={className} />;
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
      <Text className="font-sans text-[10px] font-bold tabular-nums text-bg">
        {countText}
      </Text>
    </Reanimated.View>
  );
}

const countLozengePillClass = tv({
  base: `flex h-[20px] min-w-[20px] items-center justify-center rounded-full px-[4px]`,
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
