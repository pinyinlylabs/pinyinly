import { BookmarksList } from "@/client/ui/BookmarksList";
import { Text, View } from "react-native";

export default function BookmarksPage() {
  return (
    <View className="gap-5">
      {/* Header */}
      <View>
        <Text className="pyly-body-title">Bookmarks</Text>
      </View>

      {/* Bookmarks list */}
      <BookmarksList />
    </View>
  );
}
