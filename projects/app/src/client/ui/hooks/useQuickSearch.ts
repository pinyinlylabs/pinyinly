import type { DictionarySearchEntry } from "@/client/query";
import type {
  HanziText,
  HanziWord,
  PinyinSoundId,
  PinyinText,
} from "@/data/model";
import {
  matchAllPinyinUnits,
  normalizePinyinText,
  normalizePinyinUnit,
  splitPinyinUnitTone,
} from "@/data/pinyin";
import { useLiveQuery } from "@tanstack/react-db";
import { useDb } from "./useDb";

export type QuickSearchResultKind = `hanziWord` | `wikiDirect` | `pinyinSound`;

export type QuickSearchDictionaryResultSourceKind = `builtIn` | `user`;

export type QuickSearchHanziWordResult = {
  kind: `hanziWord`;
  sourceKind: QuickSearchDictionaryResultSourceKind;
  hanziWord: HanziWord;
  hanzi: HanziText;
  meaningKey: string;
  gloss?: string;
  pinyin?: PinyinText;
  sortKey: string;
  score: number;
};

export type QuickSearchWikiDirectResult = {
  kind: `wikiDirect`;
  hanzi: HanziText;
  sortKey: string;
  score: number;
};

export type QuickSearchPinyinSoundResult = {
  kind: `pinyinSound`;
  pinyinSoundId: PinyinSoundId;
  sortKey: string;
  score: number;
};

export type QuickSearchResult =
  | QuickSearchHanziWordResult
  | QuickSearchWikiDirectResult
  | QuickSearchPinyinSoundResult;

type DictionarySearchOptions = {
  limit?: number;
};

const hanziQueryRegex = /[\u3400-\u9FFF]/;

export function quickSearch(
  entries: readonly DictionarySearchEntry[],
  query: string,
  options: DictionarySearchOptions = {},
): readonly QuickSearchResult[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return [];
  }

  const lowerQuery = trimmedQuery.toLowerCase();
  const hasHanziQuery = hanziQueryRegex.test(trimmedQuery);
  const queryPinyin = normalizePinyinForSearch(lowerQuery);
  const limit = Math.max(1, options.limit ?? 10);

  const results = findHanziWordMatches(
    entries,
    {
      query: trimmedQuery,
      lowerQuery,
      hasHanziQuery,
      queryPinyin,
    },
    limit,
  );

  if (
    hasHanziQuery &&
    !results.some(
      (result) => result.hanzi === trimmedQuery && result.score <= 1,
    )
  ) {
    const wikiDirectResult: QuickSearchWikiDirectResult = {
      kind: `wikiDirect`,
      hanzi: trimmedQuery as HanziText,
      sortKey: trimmedQuery,
      score: 2,
    };

    return [wikiDirectResult, ...results].slice(0, limit);
  }

  return results;
}

function findHanziWordMatches(
  entries: readonly DictionarySearchEntry[],
  params: {
    query: string;
    lowerQuery: string;
    hasHanziQuery: boolean;
    queryPinyin: ReturnType<typeof normalizePinyinForSearch>;
  },
  limit: number,
): QuickSearchHanziWordResult[] {
  const { query, lowerQuery, hasHanziQuery, queryPinyin } = params;
  const resultsByWord = new Map<HanziWord, QuickSearchHanziWordResult>();

  for (const entry of entries) {
    const { hanziWord, hanzi } = entry;
    let bestScore: number | null = null;
    let bestGloss: string | undefined;
    let bestPinyin: PinyinText | undefined;

    if (hasHanziQuery) {
      const hanziScore = scoreMatch(hanzi, query, 0);
      if (hanziScore != null) {
        bestScore = pickBestScore(bestScore, hanziScore);
      }
    }

    for (const gloss of entry.gloss) {
      const glossScore = scoreMatch(gloss.toLowerCase(), lowerQuery, 10);
      if (glossScore == null) {
        continue;
      }

      if (bestScore == null || glossScore < bestScore) {
        bestScore = glossScore;
        bestGloss = gloss;
      }
    }

    if (entry.pinyin != null) {
      for (const pinyin of entry.pinyin) {
        const pinyinScore = scorePinyinMatch(
          pinyin as PinyinText,
          queryPinyin,
          20,
        );
        if (pinyinScore == null) {
          continue;
        }

        if (bestScore == null || pinyinScore < bestScore) {
          bestScore = pinyinScore;
          bestPinyin = pinyin as PinyinText;
        }
      }
    }

    if (bestScore == null) {
      continue;
    }

    const existing = resultsByWord.get(hanziWord);
    if (existing == null || bestScore < existing.score) {
      resultsByWord.set(hanziWord, {
        kind: `hanziWord`,
        sourceKind: entry.sourceKind,
        hanziWord,
        hanzi,
        meaningKey: entry.meaningKey,
        gloss: bestGloss ?? entry.gloss[0],
        pinyin: bestPinyin ?? (entry.pinyin?.[0] as PinyinText | undefined),
        score: bestScore,
        sortKey: hanzi,
      });
    }
  }

  return [...resultsByWord.values()]
    .sort((a, b) => {
      if (a.score !== b.score) {
        return a.score - b.score;
      }
      if (a.sortKey.length !== b.sortKey.length) {
        return a.sortKey.length - b.sortKey.length;
      }
      return a.sortKey.localeCompare(b.sortKey);
    })
    .slice(0, limit);
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

/**
 * Searches the dictionary collection against `query` and returns matching
 * results. Encapsulates the TanStack DB live-query and `quickSearch` call so
 * that callers don't have to repeat the boilerplate. When TanStack DB gains
 * server-side filtering support the optimisation can be applied here without
 * touching any call sites.
 */
export function useQuickSearch(
  query: string,
  options: DictionarySearchOptions = {},
): readonly QuickSearchResult[] {
  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) => q.from({ entry: db.dictionarySearch }),
    [db.dictionarySearch],
  );
  return quickSearch(dictionarySearchEntries, query, options);
}
