import { loadDictionary } from "@/dictionary";
import { useDebounce } from "@uidotdev/usehooks";
import { Link } from "expo-router";
import { use, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { DictionarySearchResult } from "./dictionarySearch";
import { searchDictionaryEntries } from "./dictionarySearch";
import { Icon } from "./Icon";
import { PageSheetModal } from "./PageSheetModal";
import { RectButton } from "./RectButton";
import { TextInputSingle } from "./TextInputSingle";

export function QuickSearchModal({
  devUiSnapshotMode,
  onDismiss,
}: {
  devUiSnapshotMode?: boolean;
  onDismiss: () => void;
}) {
  return (
    <PageSheetModal
      onDismiss={onDismiss}
      devUiSnapshotMode={devUiSnapshotMode}
      suspenseFallback={<Text className="text-fg-dim">Loading…</Text>}
    >
      {({ dismiss }) => <ModalContent onDismiss={dismiss} />}
    </PageSheetModal>
  );
}

function ModalContent({ onDismiss }: { onDismiss: () => void }) {
  const dictionary = use(loadDictionary());
  const [query, setQuery] = useState(``);

  const trimmedQuery = useDebounce(query.trim(), 200);

  const hasQuery = trimmedQuery.length > 0;
  const results = searchDictionaryEntries(dictionary.allEntries, trimmedQuery);

  return (
    <View className="min-h-[200px] flex-1 bg-bg-high">
      <View className="h-12 flex-row items-center gap-2 border-b border-b-fg/10 px-4">
        <Icon icon="search" size={20} className="text-fg-dim" />
        <TextInputSingle
          autoFocus
          placeholder="Search dictionary"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          className="flex-1"
          variant="bare"
        />
        <Pressable
          className="rounded bg-fg/10 p-1.5"
          onPress={() => {
            onDismiss();
          }}
        >
          <Text className="text-[8px] text-fg">ESC</Text>
        </Pressable>
      </View>

      {hasQuery === false ? (
        <RecentQueries />
      ) : results.length === 0 ? (
        <NoResults
          query={trimmedQuery}
          onChangeQuery={(query) => {
            setQuery(query);
          }}
        />
      ) : (
        results.map((result) => (
          <SearchResultItem
            key={result.hanziWord}
            result={result}
            onSelect={onDismiss}
          />
        ))
      )}
    </View>
  );
}

function SearchResultItem({
  result,
  onSelect,
}: {
  result: DictionarySearchResult;
  onSelect: () => void;
}) {
  return (
    <Link
      href={`/wiki/${encodeURIComponent(result.hanzi)}`}
      onPress={onSelect}
      className={`
        flex flex-row items-start gap-4 px-5 py-2

        hover:bg-fg/5
      `}
    >
      <View className="gap-0.5">
        <View className="flex-1 flex-row items-center gap-2">
          <Text className="text-lg font-normal text-fg-loud">
            {result.hanzi}
          </Text>
          {result.gloss == null ? null : (
            <Text className="text-sm text-fg">{result.gloss}</Text>
          )}
        </View>
        {result.pinyin == null ? null : (
          <Text className="text-xs text-fg-dim">{result.pinyin}</Text>
        )}
      </View>
    </Link>
  );
}

function RecentQueries() {
  return (
    <View className="items-center px-4 py-16">
      <Text className="font-sans text-lg text-fg-dim">No recent searches</Text>
    </View>
  );
}

function NoResults({
  query,
  onChangeQuery,
}: {
  query: string;
  onChangeQuery: (newQuery: string) => void;
}) {
  return (
    <View className="items-center px-4 pb-8 pt-10">
      <Text className="mb-10 font-sans text-lg text-fg-dim">
        No results for &quot;<Text className={`text-fg`}>{query}</Text>&quot;
      </Text>

      <View className="w-full items-start gap-2">
        <Text className="font-sans text-sm font-medium uppercase">
          Try searching for
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {[`learn`, `学`, `good`, `coffee`].map((suggestion) => (
            <RectButton
              key={suggestion}
              onPress={() => {
                onChangeQuery(suggestion);
              }}
              variant="rounded"
            >
              {suggestion}
            </RectButton>
          ))}
        </View>
      </View>
    </View>
  );
}
