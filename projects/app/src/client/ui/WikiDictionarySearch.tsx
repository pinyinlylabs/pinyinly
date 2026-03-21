import { usePriorityWordToggle } from "@/client/ui/hooks/usePriorityWordToggle";
import { useQuickSearch } from "@/client/ui/hooks/useQuickSearch";
import type { HanziWord } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { useDb } from "./hooks/useDb";
import { Icon } from "./Icon";
import { TextInputSingle } from "./TextInputSingle";

const maxResults = 24;

export function WikiDictionarySearch() {
  const router = useRouter();
  const [query, setQuery] = useState(``);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const results = useQuickSearch(trimmedQuery, { limit: maxResults });
  const displayResults = results.filter(
    (result) => result.kind !== `pinyinSound`,
  );

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
        displayResults.length === 0 ? (
          <Text className="pyly-body-caption text-fg-dim">No matches yet.</Text>
        ) : (
          <View className="gap-2">
            {displayResults.map((result) => (
              <SearchResultCard
                key={
                  result.kind === `wikiDirect`
                    ? `wikiDirect:${result.hanzi}`
                    : result.hanziWord
                }
                result={result}
                onSelect={handleSelect}
              />
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

interface SearchResultCardProps {
  result: {
    kind: `hanziWord` | `wikiDirect` | `pinyinSound`;
    hanzi: string;
    hanziWord?: HanziWord;
  };
  onSelect: (hanzi: string) => void;
}

function SearchResultCard({ result, onSelect }: SearchResultCardProps) {
  const { isPriority, toggle } = usePriorityWordToggle(result.hanzi);
  const showBookmark = result.kind === `hanziWord`;

  return (
    <Pressable
      onPress={() => {
        onSelect(result.hanzi);
      }}
      className={resultCardClass()}
    >
      <Text className="text-2xl font-semibold text-fg-loud">
        {result.hanzi}
      </Text>
      <View className="flex-1">
        {result.kind === `wikiDirect` ? (
          <Text className="text-sm text-fg">Open wiki page</Text>
        ) : result.kind === `hanziWord` && result.hanziWord != null ? (
          <HanziWordSearchMeta hanziWord={result.hanziWord} />
        ) : null}
      </View>
      {showBookmark ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="p-2"
        >
          <Icon
            icon={isPriority ? `bookmark-filled` : `bookmark`}
            size={20}
            className="text-fg-dim"
          />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function HanziWordSearchMeta({ hanziWord }: { hanziWord: HanziWord }) {
  const db = useDb();
  const { data: dictionaryEntry } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanziWord, hanziWord))
        .select(({ entry }) => ({ gloss: entry.gloss, pinyin: entry.pinyin }))
        .findOne(),
    [db.dictionarySearch, hanziWord],
  );

  return (
    <>
      {dictionaryEntry?.gloss[0] == null ? null : (
        <Text className="text-sm text-fg">{dictionaryEntry.gloss[0]}</Text>
      )}
      {dictionaryEntry?.pinyin?.[0] == null ? null : (
        <Text className="text-xs text-fg-dim">{dictionaryEntry.pinyin[0]}</Text>
      )}
    </>
  );
}

const resultCardClass = tv({
  base: `
    flex-row items-center gap-3 rounded-xl border border-fg/10 bg-bg-high px-4 py-3

    hover:bg-fg/5
  `,
});
