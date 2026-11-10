import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderProvider } from "@/client/ui/HeaderProvider";
import { BookmarkList } from "@/client/ui/BookmarkList";
import { WikiDictionarySearch } from "@/client/ui/WikiDictionarySearch";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export default function WikiIndexPage() {
  return (
    <View className="gap-6">
      <View className="gap-2">
        <View className="gap-1">
          <Breadcrumbs>
            <Breadcrumbs.Item href="/wiki">Wiki</Breadcrumbs.Item>
          </Breadcrumbs>
          <HeaderProvider.ScrollTrigger title="Wiki" />
        </View>
        <Text className="pyly-body-caption text-muted-fg">
          Explore characters, words, and meanings with stories, breakdowns, and
          pronunciation.
        </Text>
      </View>

      <WikiDictionarySearch />

      <BookmarkList showSeeAllLink limit={10} />
    </View>
  );
}
