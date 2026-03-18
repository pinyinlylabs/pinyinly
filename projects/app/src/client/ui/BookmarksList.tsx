import { usePriorityWordsList } from "@/client/ui/hooks/usePriorityWordsList";
import { useQuickSearch } from "@/client/ui/hooks/useQuickSearch";
import { format } from "date-fns/format";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";
import { TextInputSingle } from "./TextInputSingle";

const maxResults = 12;

export function BookmarksList() {
  const router = useRouter();
  const { words, isLoading, addWord, removeWord } = usePriorityWordsList();
  const [query, setQuery] = useState(``);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const searchResults = useQuickSearch(trimmedQuery, { limit: maxResults });
  const addableSearchResults = searchResults.filter(
    (result) => result.kind === `hanziWord`,
  );
  const existingWords = new Set(words.map((item) => item.word));

  const handleAdd = (word: string) => {
    addWord(word);
    setQuery(``);
  };

  return (
    <View className="gap-6">
      <View className="gap-3">
        <Text className="pyly-body-heading">Add a word</Text>
        <View className="relative">
          <Icon
            icon="search"
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-dim"
          />
          <TextInputSingle
            placeholder="Search by hanzi, pinyin, or English"
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
            className="pl-10"
          />
        </View>

        {hasQuery ? (
          addableSearchResults.length === 0 ? (
            <Text className="pyly-body-caption text-fg-dim">
              No matches yet.
            </Text>
          ) : (
            <View className="gap-2">
              {addableSearchResults.map((result) => {
                const alreadyAdded = existingWords.has(result.hanziWord);
                return (
                  <Pressable
                    key={result.hanziWord}
                    disabled={alreadyAdded}
                    onPress={() => {
                      handleAdd(result.hanziWord);
                    }}
                    className={`
                      flex-row items-center gap-3 rounded-xl border border-fg/10 bg-bg-high px-4
                      py-3

                      hover:bg-fg/5
                    `}
                  >
                    <Text className="text-2xl font-semibold text-fg-loud">
                      {result.hanzi}
                    </Text>
                    <View className="flex-1">
                      {result.gloss == null ? null : (
                        <Text className="text-sm text-fg">{result.gloss}</Text>
                      )}
                      {result.pinyin == null ? null : (
                        <Text className="text-xs text-fg-dim">
                          {result.pinyin}
                        </Text>
                      )}
                    </View>
                    <Icon
                      icon={
                        alreadyAdded
                          ? `check-circled-filled`
                          : `add-circled-filled`
                      }
                      size={20}
                      className={alreadyAdded ? `text-fg` : `text-fg-dim`}
                    />
                  </Pressable>
                );
              })}
            </View>
          )
        ) : null}

        <Text className="pyly-body-caption text-fg-dim">
          Search and tap a result to add it to your bookmarks.
        </Text>
      </View>

      <View className="gap-3">
        <Text className="pyly-body-heading">Bookmarks ({words.length})</Text>

        {isLoading ? (
          <Text className="pyly-body-caption text-fg-dim">Loading...</Text>
        ) : words.length === 0 ? (
          <View className="rounded-lg bg-fg/5 p-6">
            <Text className="pyly-body text-center text-fg-dim">
              No bookmarks yet. Add words above to get started!
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {words.map((item) => {
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
                  <Text className="text-2xl font-semibold text-fg-loud">
                    {item.word}
                  </Text>
                  <View className="flex-1 gap-1">
                    <Text className="text-xs text-fg-dim">
                      Added {format(item.createdAt, `MMM d, yyyy`)}
                    </Text>
                    {item.note == null ? null : (
                      <Text className="text-sm text-fg">{item.note}</Text>
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
