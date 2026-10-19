import { useBookmarkToggle } from "@/client/ui/hooks/useBookmarkToggle";
import type { HanziWord } from "@/data/model";
import { Lozenge } from "./Lozenge";
import { Text } from "./Text";
import { Tooltip } from "./Tooltip";

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
    <Tooltip placement="top" sideOffset={6}>
      <Tooltip.Trigger
        accessibilityRole="button"
        accessibilityLabel="Bookmarked"
      >
        <Lozenge
          kind="icon"
          color="muted-fg"
          icon="bookmark-filled"
          accessibilityLabel="Bookmarked"
          iconTintColorClassName="accent-muted-fg"
        />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Text className="font-sans text-sm text-fg">
          Saved to your bookmarks.
        </Text>
      </Tooltip.Content>
    </Tooltip>
  );
}
