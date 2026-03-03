import { searchDictionaryEntries } from "@/client/ui/quickSearch";
import { loadDictionary } from "@/dictionary";
import { useRouter } from "expo-router";
import { use, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { Icon } from "./Icon";
import { TextInputSingle } from "./TextInputSingle";

const maxResults = 24;

export function WikiDictionarySearch() {
  const router = useRouter();
  const dictionary = use(loadDictionary());
  const [query, setQuery] = useState(``);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const results = searchDictionaryEntries(dictionary.allEntries, trimmedQuery, {
    limit: maxResults,
  });

  const handleSelect = (hanzi: string) => {
    router.push(`/wiki/${encodeURIComponent(hanzi)}`);
  };

  return (
    <View className="gap-4">
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
        results.length === 0 ? (
          <Text className="pyly-body-caption text-fg-dim">No matches yet.</Text>
        ) : (
          <View className="gap-2">
            {results.map((result) => (
              <Pressable
                key={result.hanziWord}
                onPress={() => {
                  handleSelect(result.hanzi);
                }}
                className={resultCardClass()}
              >
                <Text className="text-2xl font-semibold text-fg-loud">
                  {result.hanzi}
                </Text>
                <View className="flex-1">
                  {result.gloss == null ? null : (
                    <Text className="text-sm text-fg">{result.gloss}</Text>
                  )}
                  {result.pinyin == null ? null : (
                    <Text className="text-xs text-fg-dim">{result.pinyin}</Text>
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        )
      ) : (
        <Text className="pyly-body-caption text-fg-dim">
          Try a character, word, or meaning to jump into the wiki.
        </Text>
      )}
    </View>
  );
}

const resultCardClass = tv({
  base: `
    flex-row items-center gap-3 rounded-xl border border-fg/10 bg-bg-high px-4 py-3

    hover:bg-fg/5
  `,
});
