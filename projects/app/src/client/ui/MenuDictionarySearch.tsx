import { flip, offset, shift, useFloating } from "@floating-ui/react-native";
import type { HanziWord } from "@/data/model";
import { eq, useLiveQuery } from "@tanstack/react-db";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useQuickSearch } from "./hooks/useQuickSearch";
import { useDb } from "./hooks/useDb";
import { Icon } from "./Icon";
import { Portal } from "./Portal";
import { TextInputSingle } from "./TextInputSingle";

const gap = 8;

export function MenuDictionarySearch() {
  const router = useRouter();
  const [query, setQuery] = useState(``);
  const [isFocused, setIsFocused] = useState(false);
  const [blurTimeoutId, setBlurTimeoutId] = useState<
    ReturnType<typeof setTimeout> | undefined
  >();

  const {
    refs: { setFloating, setReference },
    floatingStyles,
  } = useFloating({
    placement: `bottom`,
    sameScrollView: false,
    middleware: [shift({ padding: gap }), flip({ padding: gap }), offset(gap)],
  });

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length > 0;
  const results = useQuickSearch(trimmedQuery);
  const displayResults = results.filter(
    (result) => result.kind !== `pinyinSound`,
  );

  const showResults = hasQuery && isFocused;

  const handleFocus = () => {
    if (blurTimeoutId != null) {
      clearTimeout(blurTimeoutId);
      setBlurTimeoutId(undefined);
    }
    setIsFocused(true);
  };

  const handleBlur = () => {
    const timeoutId = setTimeout(() => {
      setIsFocused(false);
      setBlurTimeoutId(undefined);
    }, 120);
    setBlurTimeoutId(timeoutId);
  };

  const handleSelect = (hanzi: string) => {
    setQuery(``);
    setIsFocused(false);
    router.push(`/wiki/${encodeURIComponent(hanzi)}`);
  };

  return (
    <View className="w-[200px]">
      <View ref={setReference} collapsable={false}>
        <Icon
          icon="search"
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-dim"
        />
        <TextInputSingle
          placeholder="Search dictionary"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className="pl-9"
        />
      </View>
      {showResults ? (
        <Portal>
          <View
            ref={setFloating}
            collapsable={false}
            style={floatingStyles}
            className="shadow-lg overflow-hidden rounded-xl border border-fg/10 bg-bg-high"
          >
            {displayResults.length === 0 ? (
              <View className="px-3 py-2">
                <Text className="font-sans text-sm text-fg-dim">
                  No matches
                </Text>
              </View>
            ) : (
              displayResults.map((result) => (
                <Pressable
                  key={
                    result.kind === `wikiDirect`
                      ? `wikiDirect:${result.hanzi}`
                      : result.hanziWord
                  }
                  onPress={() => {
                    handleSelect(result.hanzi);
                  }}
                  className={`
                    flex-row items-center gap-2 px-3 py-2

                    hover:bg-fg/5
                  `}
                >
                  <Text className="font-sans text-lg font-semibold text-fg-loud">
                    {result.hanzi}
                  </Text>
                  <View className="flex-1">
                    {result.kind === `hanziWord` ? (
                      <HanziWordSearchMeta hanziWord={result.hanziWord} />
                    ) : (
                      (result.kind satisfies `wikiDirect`,
                      (
                        <Text className="font-sans text-sm text-fg">
                          Open wiki page
                        </Text>
                      ))
                    )}
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </Portal>
      ) : null}
    </View>
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
        <Text className="font-sans text-sm text-fg">
          {dictionaryEntry.gloss[0]}
        </Text>
      )}
      {dictionaryEntry?.pinyin?.[0] == null ? null : (
        <Text className="font-sans text-xs text-fg-dim">
          {dictionaryEntry.pinyin[0]}
        </Text>
      )}
    </>
  );
}
