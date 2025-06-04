import type { SkillReviewQueue } from "@/data/skills";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export function QuizQueueButton({
  queueStats,
}: {
  queueStats: Pick<
    SkillReviewQueue,
    `overDueCount` | `dueCount` | `newCount`
  > | null;
}) {
  return (
    <View
      className={`
        relative size-[32px] flex-row justify-center

        md:justify-start
      `}
    >
      <Image
        source={require(`@/assets/icons/inbox-filled.svg`)}
        className="size-[32px] shrink self-center text-foreground"
        tintColor="currentColor"
        contentFit="fill"
      />
      {queueStats == null ? null : queueStats.overDueCount > 0 ? (
        <CountLozenge count={queueStats.overDueCount} mode="overdue" />
      ) : queueStats.dueCount > 0 ? (
        <CountLozenge count={queueStats.dueCount} mode="due" />
      ) : queueStats.newCount > 0 ? (
        <CountLozenge count={queueStats.newCount} mode="new" />
      ) : (
        <CheckBadge />
      )}
    </View>
  );
}

function CheckBadge() {
  return (
    <View className="absolute left-[55%] top-[62%] size-quiz-px rounded-full bg-background p-[2px]">
      <Image
        source={require(`@/assets/icons/check.svg`)}
        className="size-[12px] self-center rounded-full bg-foreground/30 text-foreground"
        tintColor="currentColor"
        contentFit="fill"
      />
    </View>
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
  const countText = count >= 100 ? `99+` : `${count}`;
  return (
    <View className={countLozengePillClass({ mode, className })}>
      <Text className="text-[10px] font-bold text-background">{countText}</Text>
    </View>
  );
}

const countLozengePillClass = tv({
  base: `
    absolute left-[52%] top-[60%] flex h-[20px] min-w-[20px] items-center justify-center
    rounded-full border-2 border-solid border-background px-[4px]
  `,
  variants: {
    mode: {
      overdue: `bg-red-9`,
      due: `bg-cyan-10`,
      new: `bg-lime-10`,
    },
  },
  defaultVariants: {
    mode: `overdue`,
  },
});
