import { loadDictionary } from "@/dictionary";
import { flip, offset, shift, useFloating } from "@floating-ui/react-native";
import { useRouter } from "expo-router";
import { use, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Icon } from "./Icon";
import { Portal } from "./Portal";
import { searchDictionaryEntries } from "./quickSearch";
import { TextInputSingle } from "./TextInputSingle";

const gap = 8;

export function MenuDictionarySearch() {
  const router = useRouter();
  const dictionary = use(loadDictionary());
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
  const results = searchDictionaryEntries(dictionary.allEntries, trimmedQuery);

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
            {results.length === 0 ? (
              <View className="px-3 py-2">
                <Text className="text-sm text-fg-dim">No matches</Text>
              </View>
            ) : (
              results.map((result) => (
                <Pressable
                  key={result.hanziWord}
                  onPress={() => {
                    handleSelect(result.hanzi);
                  }}
                  className={`
                    flex-row items-center gap-2 px-3 py-2

                    hover:bg-fg/5
                  `}
                >
                  <Text className="text-lg font-semibold text-fg-loud">
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
                </Pressable>
              ))
            )}
          </View>
        </Portal>
      ) : null}
    </View>
  );
}
