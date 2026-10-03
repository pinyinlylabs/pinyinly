import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { StudyList } from "@/client/ui/StudyList";
import { WikiDictionarySearch } from "@/client/ui/WikiDictionarySearch";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export default function WikiIndexPage() {
  return (
    <View className="gap-6">
      <View className="gap-2">
        <Text className="pyly-body-title">Wiki</Text>
        <HeaderTitleProvider.ScrollTrigger title="Wiki" />
        <Text className="pyly-body-caption text-muted-fg">
          Explore characters, words, and meanings with stories, breakdowns, and
          pronunciation.
        </Text>
      </View>

      <WikiDictionarySearch />

      <StudyList showSeeAllLink limit={10} />
    </View>
  );
}
