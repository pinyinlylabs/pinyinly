import type { StudyWordItem } from "@/client/query";
import type { HanziWord } from "@/data/model";
import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import {
  getStudyWordKeyParams,
  studyWordItemSetting,
} from "@/data/userSettings";
import { useLiveQuery } from "@tanstack/react-db";

export type { StudyWordItem };

export interface UseStudyWordsListResult {
  words: StudyWordItem[];
  isLoading: boolean;
  addWord: (hanziWord: HanziWord) => void;
  removeWord: (hanziWord: HanziWord) => void;
}

/**
 * Hook to manage the user's Study list.
 * Queries decoded Study words and provides helpers to add/remove words.
 */
export function useStudyWordsList(): UseStudyWordsListResult {
  const db = useDb();
  const r = useRizzle();

  const { data: words, isLoading } = useLiveQuery(
    (q) =>
      q
        .from({ word: db.studyWordsCollection })
        .orderBy(({ word }) => word.createdAt, `desc`),
    [db.studyWordsCollection],
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
