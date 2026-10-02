import { useSkillQueue } from "@/client/ui/hooks/useSkillQueue";
import { Text } from "@/client/ui/Text";
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
      <Text className="font-sans text-[10px] font-bold text-bg tabular-nums">
        {countText}
      </Text>
    </Reanimated.View>
  );
}

const countLozengePillClass = tv({
  base: `flex h-5 min-w-5 items-center justify-center rounded-full px-1`,
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
