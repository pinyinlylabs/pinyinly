import { BookmarkList } from "@/client/ui/BookmarkList";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { RectButton } from "@/client/ui/RectButton";
import { useDb } from "@/client/ui/hooks/useDb";
import { useLiveQuery } from "@tanstack/react-db";
import { View } from "@/client/ui/View";

export default function BookmarksPage() {
  const db = useDb();
  const { data: words, isLoading } = useLiveQuery(
    (q) => q.from({ word: db.bookmarkedHanziWordsCollection }),
    [db.bookmarkedHanziWordsCollection],
  );

  return (
    <View className="gap-5">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/skills">Skills</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/skills/bookmark">Bookmarks</Breadcrumbs.Item>
      </Breadcrumbs>

      <HeaderTitleProvider.ScrollTrigger title="Bookmarks" />
      <View className="items-end">
        <RectButton
          href="/learn/study"
          iconStart="chevron-right"
          disabled={isLoading || words.length === 0}
        >
          Practice
        </RectButton>
      </View>
      <BookmarkList />
    </View>
  );
}
