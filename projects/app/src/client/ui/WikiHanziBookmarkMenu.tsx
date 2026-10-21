import { useBookmarkToggle } from "@/client/ui/hooks/useBookmarkToggle";
import type { HanziWord } from "@/data/model";
import { DropdownMenu2 } from "./DropdownMenu2";
import { RectButton } from "./RectButton";
import { Text } from "./Text";

export function WikiHanziBookmarkMenu({
  hanziWord,
}: {
  hanziWord: HanziWord | null;
}) {
  return (
    <DropdownMenu2>
      <DropdownMenu2.Trigger asChild>
        <RectButton
          variant="bare"
          iconStart="more-horizontal"
          accessibilityLabel="More options"
        />
      </DropdownMenu2.Trigger>
      <DropdownMenu2.Content align="end" sideOffset={4}>
        {hanziWord == null ? (
          <DropdownMenu2.Item disabled>
            <Text>Bookmark</Text>
          </DropdownMenu2.Item>
        ) : (
          <BookmarkMenuItem hanziWord={hanziWord} />
        )}
      </DropdownMenu2.Content>
    </DropdownMenu2>
  );
}

function BookmarkMenuItem({ hanziWord }: { hanziWord: HanziWord }) {
  const { isBookmarked, isLoading, toggle } = useBookmarkToggle(hanziWord);
  return (
    <DropdownMenu2.CheckboxItem
      checked={isBookmarked}
      disabled={isLoading}
      onCheckedChange={toggle}
    >
      <Text>Bookmark</Text>
    </DropdownMenu2.CheckboxItem>
  );
}
