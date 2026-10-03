import { useStudyToggle } from "@/client/ui/hooks/useStudyToggle";
import type { HanziWord } from "@/data/model";
import { RectButton } from "./RectButton";

export function StudyButton({ hanziWord }: { hanziWord: HanziWord }) {
  const { isStudying, isLoading, toggle } = useStudyToggle(hanziWord);

  return (
    <RectButton
      variant={isStudying ? `filled` : `outline`}
      iconStart={isStudying ? `bookmark-filled` : `bookmark`}
      onPress={toggle}
      disabled={isLoading}
      className="min-w-32"
    >
      {isStudying ? `Studying` : `Study`}
    </RectButton>
  );
}
