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
import { hanziFromHanziWord } from "@/dictionary";

export type QuickSearchResultKind = `hanziWord` | `pinyinSound`;

export type QuickSearchHanziWordResult = {
  kind: `hanziWord`;
  hanziWord: HanziWord;
  hanzi: HanziText;
  gloss?: string;
  pinyin?: PinyinText;
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
  | QuickSearchPinyinSoundResult;

type DictionaryEntries = readonly [
  HanziWord,
  { gloss: readonly string[]; pinyin?: readonly PinyinText[] | null },
][];

type DictionarySearchOptions = {
  limit?: number;
};

const hanziQueryRegex = /[\u3400-\u9FFF]/;

export function quickSearch(
  entries: DictionaryEntries,
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

  return findHanziWordMatches(
    entries,
    {
      query: trimmedQuery,
      lowerQuery,
      hasHanziQuery,
      queryPinyin,
    },
    limit,
  );
}

export function searchDictionaryEntries(
  entries: DictionaryEntries,
  query: string,
  options: DictionarySearchOptions = {},
): readonly QuickSearchHanziWordResult[] {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return [];
  }

  const lowerQuery = trimmedQuery.toLowerCase();
  const hasHanziQuery = hanziQueryRegex.test(trimmedQuery);
  const queryPinyin = normalizePinyinForSearch(lowerQuery);
  const limit = Math.max(1, options.limit ?? 10);

  return findHanziWordMatches(
    entries,
    {
      query: trimmedQuery,
      lowerQuery,
      hasHanziQuery,
      queryPinyin,
    },
    limit,
  );
}

function findHanziWordMatches(
  entries: DictionaryEntries,
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
      kind: `hanziWord`,
      hanziWord,
      hanzi,
      gloss: meaning.gloss[0],
      pinyin: meaning.pinyin?.[0] ?? undefined,
      score,
      sortKey: hanzi,
    });
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
