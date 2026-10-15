import { useBookmarkToggle } from "@/client/ui/hooks/useBookmarkToggle";
import type { HanziWord } from "@/data/model";
import { Lozenge } from "./Lozenge";

export function WikiHanziBookmarkLozenge({
  hanziWord,
}: {
  hanziWord: HanziWord | null;
}) {
  return hanziWord == null ? null : <BookmarkStatus hanziWord={hanziWord} />;
}

function BookmarkStatus({ hanziWord }: { hanziWord: HanziWord }) {
  const { isBookmarked } = useBookmarkToggle(hanziWord);

  if (!isBookmarked) {
    return null;
  }

  return (
    <Lozenge
      kind="icon"
      color="blue"
      className="bg-transparent"
      icon="bookmark-filled"
      accessibilityLabel="Bookmarked"
      iconTintColorClassName="accent-blue"
    />
  );
}
