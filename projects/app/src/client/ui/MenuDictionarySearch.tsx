import type { HanziText, HanziWord, PinyinText } from "@/data/model";
import {
  matchAllPinyinUnits,
  normalizePinyinText,
  normalizePinyinUnit,
  splitPinyinUnitTone,
} from "@/data/pinyin";
import { hanziFromHanziWord, loadDictionary } from "@/dictionary";
import { flip, offset, shift, useFloating } from "@floating-ui/react-native";
import { useRouter } from "expo-router";
import { use, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { IconImage } from "./IconImage";
import { TextInputSingle } from "./TextInputSingle";
import { Portal } from "./Portal";

type SearchResult = {
  hanziWord: HanziWord;
  hanzi: HanziText;
  gloss?: string;
  pinyin?: PinyinText;
  score: number;
};

const hanziQueryRegex = /[\u3400-\u9FFF]/;

const gap = 8;

export function MenuDictionarySearch() {
  const router = useRouter();
  const dictionary = use(loadDictionary());
  const [query, setQuery] = useState(``);
  const [isFocused, setIsFocused] = useState(false);
  const [blurTimeoutId, setBlurTimeoutId] = useState<
    ReturnType<typeof setTimeout> | undefined
  >();

  const { refs, floatingStyles } = useFloating({
    placement: `bottom`,
    sameScrollView: false,
    middleware: [shift({ padding: gap }), flip({ padding: gap }), offset(gap)],
  });

  const trimmedQuery = query.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const hasQuery = trimmedQuery.length > 0;
  const hasHanziQuery = hanziQueryRegex.test(trimmedQuery);
  const queryPinyin = normalizePinyinForSearch(lowerQuery);
  const results = hasQuery
    ? findDictionaryMatches(dictionary.allEntries, {
        query: trimmedQuery,
        lowerQuery,
        hasHanziQuery,
        queryPinyin,
      })
    : [];

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
      <View ref={refs.setReference} collapsable={false}>
        <IconImage
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
            ref={refs.setFloating}
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

function findDictionaryMatches(
  entries: readonly [
    HanziWord,
    { gloss: readonly string[]; pinyin?: readonly PinyinText[] | null },
  ][],
  params: {
    query: string;
    lowerQuery: string;
    hasHanziQuery: boolean;
    queryPinyin: ReturnType<typeof normalizePinyinForSearch>;
  },
): SearchResult[] {
  const { query, lowerQuery, hasHanziQuery, queryPinyin } = params;
  const resultsByWord = new Map<HanziWord, SearchResult>();

  for (const [hanziWord, meaning] of entries) {
    const hanzi = hanziFromHanziWord(hanziWord);
    let bestScore: number | null = null;

    if (hasHanziQuery) {
      const hanziScore = scoreMatch(hanzi, query, 0);
      if (hanziScore != null) {
        bestScore = pickBestScore(bestScore, hanziScore);
      }
    }

    for (const gloss of meaning.gloss) {
      const glossScore = scoreMatch(gloss.toLowerCase(), lowerQuery, 10);
      if (glossScore != null) {
        bestScore = pickBestScore(bestScore, glossScore);
      }
    }

    if (meaning.pinyin != null) {
      for (const pinyin of meaning.pinyin) {
        const pinyinScore = scorePinyinMatch(pinyin, queryPinyin, 20);
        if (pinyinScore != null) {
          bestScore = pickBestScore(bestScore, pinyinScore);
        }
      }
    }

    if (bestScore == null) {
      continue;
    }

    const existing = resultsByWord.get(hanziWord);
    const score = existing ? Math.min(existing.score, bestScore) : bestScore;

    resultsByWord.set(hanziWord, {
      hanziWord,
      hanzi,
      gloss: meaning.gloss[0],
      pinyin: meaning.pinyin?.[0] ?? undefined,
      score,
    });
  }

  return [...resultsByWord.values()]
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      if (a.hanzi.length !== b.hanzi.length) {
        return a.hanzi.length - b.hanzi.length;
      }
      return a.hanzi.localeCompare(b.hanzi);
    })
    .slice(0, 10);
}

function scoreMatch(
  haystack: string,
  needle: string,
  baseScore: number,
): number | null {
  if (haystack === needle) {
    return baseScore;
  }
  if (haystack.startsWith(needle)) {
    return baseScore + 1;
  }
  if (haystack.includes(needle)) {
    return baseScore + 2;
  }
  return null;
}

function pickBestScore(current: number | null, candidate: number): number {
  if (current == null) {
    return candidate;
  }
  return Math.min(current, candidate);
}

function normalizePinyinForSearch(value: string): {
  diacritic: string;
  toneless: string;
} {
  const diacritic = normalizePinyinText(value).toLowerCase();
  const units = matchAllPinyinUnits(diacritic);
  if (units.length === 0) {
    return { diacritic, toneless: diacritic };
  }

  const tonelessUnits = units.map(
    (unit) => splitPinyinUnitTone(normalizePinyinUnit(unit)).tonelessUnit,
  );

  return {
    diacritic,
    toneless: tonelessUnits.join(` `),
  };
}

function scorePinyinMatch(
  pinyin: PinyinText,
  queryPinyin: ReturnType<typeof normalizePinyinForSearch>,
  baseScore: number,
): number | null {
  const normalized = normalizePinyinForSearch(pinyin);
  const queryDiacritic = collapseWhitespace(queryPinyin.diacritic);
  const queryToneless = collapseWhitespace(queryPinyin.toneless);
  const pinyinDiacritic = collapseWhitespace(normalized.diacritic);
  const pinyinToneless = collapseWhitespace(normalized.toneless);

  const diacriticScore = scoreMatch(pinyinDiacritic, queryDiacritic, baseScore);
  if (diacriticScore != null) {
    return diacriticScore;
  }

  return scoreMatch(pinyinToneless, queryToneless, baseScore + 1);
}

function collapseWhitespace(value: string): string {
  return value.replaceAll(/\s+/g, ``);
}
