import { breakpoints } from "@/client/ui/breakpoints";
import { QuizQueueLozenge } from "@/client/ui/QuizQueueLozenge";
import { useVisualViewportSize } from "@/client/ui/hooks/useVisualViewportSize";
import { MobileNavMenu } from "@/client/ui/MobileNavMenu";
import { Link } from "expo-router";
import { useState } from "react";
import { Pressable } from "react-native";
import { tv } from "tailwind-variants";
import { Icon } from "./Icon";

export function QuizQueueButton() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const visualViewport = useVisualViewportSize();
  const isSm = visualViewport != null && visualViewport.width >= breakpoints.sm;

  const buttonContent = (
    <>
      <Icon size={32} className="self-center text-fg" icon="inbox-filled" />
      <QuizQueueLozenge className="absolute left-[52%] top-[60%] border-2 border-solid border-bg" />
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

const queueButtonClass = tv({
  base: `
    relative size-[32px] flex-row justify-center

    md:justify-start
  `,
});
