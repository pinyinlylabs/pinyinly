import { useBookmarkToggle } from "@/client/ui/hooks/useBookmarkToggle";
import type { HanziWord } from "@/data/model";
import { RectButton } from "./RectButton";

export function BookmarkButton({ hanziWord }: { hanziWord: HanziWord }) {
  const { isBookmarked, isLoading, toggle } = useBookmarkToggle(hanziWord);

  return (
    <RectButton
      variant={isBookmarked ? `filled` : `outline`}
      iconStart={isBookmarked ? `bookmark-filled` : `bookmark`}
      onPress={toggle}
      disabled={isLoading}
      className="min-w-32"
    >
      {isBookmarked ? `Bookmarked` : `Bookmark`}
    </RectButton>
  );
}
