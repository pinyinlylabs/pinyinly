import type { SkillReviewQueue } from "@/data/skills";
import { breakpoints } from "@/client/ui/breakpoints";
import { useVisualViewportSize } from "@/client/ui/hooks/useVisualViewportSize";
import { MobileNavMenu } from "@/client/ui/MobileNavMenu";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, Text } from "react-native";
import Reanimated, { Easing, ZoomIn } from "react-native-reanimated";
import { tv } from "tailwind-variants";
import { Icon } from "./Icon";

export function QuizQueueButton({
  queueStats,
}: {
  queueStats: Pick<
    SkillReviewQueue,
    `overDueCount` | `dueCount` | `newContentCount`
  > | null;
}) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const visualViewport = useVisualViewportSize();
  const isSm = visualViewport != null && visualViewport.width >= breakpoints.sm;
  const queueCount =
    queueStats == null
      ? null
      : queueStats.overDueCount +
        queueStats.dueCount +
        queueStats.newContentCount;

  const buttonContent = (
    <>
      <Icon size={32} className="self-center text-fg" icon="inbox-filled" />
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
    </>
  );

  if (visualViewport != null && !isSm) {
    return (
      <>
        <Pressable
          onPress={() => {
            setIsMobileNavOpen(true);
          }}
          className={queueButtonClass()}
        >
          {buttonContent}
        </Pressable>
        <MobileNavMenu
          isOpen={isMobileNavOpen}
          onClose={() => {
            setIsMobileNavOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <Link href="/history" className={queueButtonClass()}>
      {buttonContent}
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
      <Text className="font-sans text-[10px] font-bold tabular-nums text-bg">
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

const queueButtonClass = tv({
  base: `
    relative size-[32px] flex-row justify-center

    md:justify-start
  `,
});
