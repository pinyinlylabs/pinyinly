import { BookmarksList } from "@/client/ui/BookmarksList";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { View } from "react-native";

export default function BookmarksPage() {
  return (
    <View className="gap-3">
      <Breadcrumbs>
        <Breadcrumbs.Item href="/wiki">Wiki</Breadcrumbs.Item>
        <Breadcrumbs.Item href="/bookmarks">Bookmarks</Breadcrumbs.Item>
      </Breadcrumbs>

      <BookmarksList />
    </View>
  );
}
