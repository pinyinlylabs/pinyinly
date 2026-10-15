import type { BookmarkedWordItem } from "@/client/query";
import type { HanziWord } from "@/data/model";
import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import {
  getStudyWordKeyParams,
  studyWordItemSetting,
} from "@/data/userSettings";
import { useLiveQuery } from "@tanstack/react-db";

export type { BookmarkedWordItem };

export interface UseBookmarksListResult {
  words: BookmarkedWordItem[];
  isLoading: boolean;
  addWord: (hanziWord: HanziWord) => void;
  removeWord: (hanziWord: HanziWord) => void;
}

/**
 * Hook to manage the user's bookmarks.
 * Queries decoded bookmarks and provides helpers to add/remove words.
 */
export function useBookmarksList(): UseBookmarksListResult {
  const db = useDb();
  const r = useRizzle();

  const { data: words, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ word: db.bookmarkedWordsCollection })
        .orderBy(({ word }) => word.createdAt, `desc`),
    [db.bookmarkedWordsCollection],
  );

  const addWord = (hanziWord: HanziWord) => {
    const keyParams = getStudyWordKeyParams(hanziWord);
    const settingKey = studyWordItemSetting.entity.marshalKey(keyParams);

    const value = studyWordItemSetting.encodeStoredValue(keyParams, {
      hanziWord,
      createdAt: new Date(),
    });

    void r.mutate.setSetting({
      key: settingKey,
      value,
      now: new Date(),
      skipHistory: false,
      historyId: undefined,
    });
  };

  const removeWord = (hanziWord: HanziWord) => {
    const keyParams = getStudyWordKeyParams(hanziWord);
    const settingKey = studyWordItemSetting.entity.marshalKey(keyParams);

    void r.mutate.setSetting({
      key: settingKey,
      value: null,
      now: new Date(),
      skipHistory: false,
      historyId: undefined,
    });
  };

  return {
    words,
    isLoading,
    addWord,
    removeWord,
  };
}
