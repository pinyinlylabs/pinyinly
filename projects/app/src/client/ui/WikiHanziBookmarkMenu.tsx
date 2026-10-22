import { use } from "react";
import { useRouter } from "expo-router";
import { useBookmarkToggle } from "@/client/ui/hooks/useBookmarkToggle";
import type { HanziText, HanziWord } from "@/data/model";
import { DropdownMenu2 } from "./DropdownMenu2";
import { RectButton } from "./RectButton";
import { Text } from "./Text";
import { WikiHanziModalContext } from "./WikiHanziModalContext";

export function WikiHanziBookmarkMenu({
  hanziWord,
  hanzi,
  onModalDismiss,
}: {
  hanziWord: HanziWord | null;
  hanzi: HanziText;
  onModalDismiss?: () => void;
}) {
  const modalContext = use(WikiHanziModalContext);
  const router = useRouter();

  if (modalContext != null && onModalDismiss == null) {
    throw new Error(`WikiHanziBookmarkMenu in a modal requires onModalDismiss`);
  }

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
        {modalContext == null ? null : (
          <DropdownMenu2.Item
            onPress={() => {
              onModalDismiss?.();
              router.push(`/wiki/${encodeURIComponent(hanzi)}`);
            }}
          >
            <Text>Open page</Text>
          </DropdownMenu2.Item>
        )}
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
