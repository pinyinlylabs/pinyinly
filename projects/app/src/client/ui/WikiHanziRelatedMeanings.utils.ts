import type { DictionarySearchEntry } from "@/client/query";
import type { HanziText } from "@/data/model";
import { arrayFilterUnique } from "@pinyinly/lib/collections";

const maxRelatedEntries = 5;

export interface RelatedMeaningMatch {
  entry: DictionarySearchEntry;
  similarityScore: number;
}

export function buildRelatedMeaningMatches({
  currentEntries,
  allEntries,
  hanzi,
}: {
  currentEntries: readonly DictionarySearchEntry[];
  allEntries: readonly DictionarySearchEntry[];
  hanzi: HanziText;
}) {
  const currentGlosses = currentEntries
    .flatMap((entry) => entry.gloss)
    .map(normalizeGloss)
    .filter((gloss) => gloss.length > 0)
    .filter(arrayFilterUnique())
    .sort();

  if (currentGlosses.length === 0) {
    return [];
  }

  const currentGlossTokens = new Set(
    currentGlosses.flatMap((gloss) => tokenizeGloss(gloss)),
  );

  return allEntries
    .filter((entry) => entry.hanzi !== hanzi)
    .map((entry) => {
      const candidateGlosses = entry.gloss
        .map(normalizeGloss)
        .filter((gloss) => gloss.length > 0)
        .filter(arrayFilterUnique())
        .sort();

      const candidateGlossTokens = new Set(
        candidateGlosses.flatMap((gloss) => tokenizeGloss(gloss)),
      );

      const sharedTokenCount = [...candidateGlossTokens].reduce(
        (count, token) => count + (currentGlossTokens.has(token) ? 1 : 0),
        0,
      );

      const unionTokenCount =
        currentGlossTokens.size + candidateGlossTokens.size - sharedTokenCount;

      const similarityScore =
        unionTokenCount === 0 ? 0 : sharedTokenCount / unionTokenCount;

      return {
        entry,
        similarityScore,
      };
    })
    .filter(({ similarityScore }) => similarityScore > 0)
    .filter(arrayFilterUnique(({ entry }) => entry.hanziWord))
    .sort((a, b) => {
      if (a.similarityScore !== b.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }

      return (
        a.entry.hskSortKey - b.entry.hskSortKey ||
        a.entry.hanziCharacterCount - b.entry.hanziCharacterCount ||
        a.entry.hanziWord.localeCompare(b.entry.hanziWord)
      );
    })
    .slice(0, maxRelatedEntries);
}

function normalizeGloss(gloss: string) {
  return gloss.trim().toLowerCase().replaceAll(/\s+/gu, ` `);
}

function tokenizeGloss(gloss: string) {
  return (
    normalizeGloss(gloss)
      .match(/[a-z]+(?:'[a-z]+)?/gu)
      ?.filter((token) => token.length > 2)
      .filter((token) => !commonGlossWords.has(token)) ?? []
  );
}

const commonGlossWords = new Set([
  `a`,
  `an`,
  `and`,
  `as`,
  `at`,
  `be`,
  `by`,
  `for`,
  `from`,
  `in`,
  `into`,
  `of`,
  `on`,
  `or`,
  `the`,
  `to`,
  `with`,
]);
