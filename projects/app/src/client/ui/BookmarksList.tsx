import { usePriorityWordsList } from "@/client/ui/hooks/usePriorityWordsList";
import { format } from "date-fns/format";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";

export function BookmarksList({
  showSeeAllLink = false,
  limit,
}: {
  showSeeAllLink?: boolean;
  limit?: number;
}) {
  const router = useRouter();
  const { words, isLoading, removeWord } = usePriorityWordsList();
  const visibleWords = limit == null ? words : words.slice(0, limit);

  return (
    <View className="gap-6">
      <View className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <Text className="pyly-body-heading">Bookmarks ({words.length})</Text>

          {showSeeAllLink ? (
            <Pressable
              onPress={() => {
                router.push(`/bookmarks`);
              }}
              className={`
                rounded-md px-2 py-1

                hover:bg-fg/5
              `}
            >
              <Text className="pyly-body-caption text-fg-dim">See all</Text>
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <Text className="pyly-body-caption text-fg-dim">Loading...</Text>
        ) : words.length === 0 ? (
          <View className="rounded-lg bg-fg/5 p-6">
            <Text className="pyly-body text-center text-fg-dim">
              No bookmarks yet.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {visibleWords.map((item) => {
              // Extract hanzi from hanziword (part before ':')
              const hanziParts = item.word.split(`:`);
              const hanzi = hanziParts[0] ?? item.word;

              return (
                <Pressable
                  key={item.word}
                  onPress={() => {
                    router.push(`/wiki/${encodeURIComponent(hanzi)}`);
                  }}
                  className={`
                    flex-row items-center gap-3 rounded-lg border border-fg/10 bg-bg-high px-4 py-3

                    hover:bg-fg/5
                  `}
                >
                  <Text className="font-sans text-2xl font-semibold text-fg-loud">
                    {item.word}
                  </Text>
                  <View className="flex-1 gap-1">
                    <Text className="font-sans text-xs text-fg-dim">
                      Added {format(item.createdAt, `MMM d, yyyy`)}
                    </Text>
                    {item.note == null ? null : (
                      <Text className="font-sans text-sm text-fg">
                        {item.note}
                      </Text>
                    )}
                  </View>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      removeWord(item.word);
                    }}
                    className={`
                      rounded-lg p-2

                      hover:bg-fg/5
                    `}
                  >
                    <Icon icon="close" size={16} className="text-fg-dim" />
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}
