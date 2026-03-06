import { useDb } from "@/client/ui/hooks/useDb";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import {
  getPrioritizedWordKeyParams,
  prioritizedWordItemSetting,
} from "@/data/userSettings";
import { useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";

export interface PriorityWordItem {
  word: string;
  createdAt: Date;
  note?: string;
}

export interface UsePriorityWordsListResult {
  words: PriorityWordItem[];
  isLoading: boolean;
  addWord: (word: string, note?: string) => void;
  removeWord: (word: string) => void;
}

/**
 * Hook to manage the user's priority words list.
 * Queries all priority word settings and provides helpers to add/remove words.
 */
export function usePriorityWordsList(): UsePriorityWordsListResult {
  const db = useDb();
  const r = useRizzle();

  const { data: settingsData, isLoading } = useLiveQuery(
    (q) => q.from({ setting: db.settingCollection }),
    [db.settingCollection],
  );

  const words = useMemo(() => {
    const settingPrefix = `pwi/`;
    const items: PriorityWordItem[] = [];

    for (const setting of settingsData) {
      if (!setting.key.startsWith(settingPrefix)) {
        continue;
      }

      const value = setting.value;
      if (value == null) {
        continue;
      }

      const wordFromValue = value[`w`];
      const wordFromKey = setting.key.slice(settingPrefix.length);
      const word =
        typeof wordFromValue === `string` && wordFromValue.length > 0
          ? wordFromValue
          : wordFromKey;
      const createdAt = value[`c`];
      const note = value[`n`];

      if (typeof word !== `string`) {
        continue;
      }

      items.push({
        word,
        createdAt:
          createdAt instanceof Date ? createdAt : new Date(createdAt as string),
        note: typeof note === `string` ? note : undefined,
      });
    }

    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return items;
  }, [settingsData]);

  const addWord = (word: string, note?: string) => {
    const keyParams = getPrioritizedWordKeyParams(word);
    const settingKey = prioritizedWordItemSetting.entity.marshalKey(keyParams);

    const value = prioritizedWordItemSetting.entity.marshalValue({
      word,
      createdAt: new Date(),
      note: note ?? undefined,
    });

    void r.mutate.setSetting({
      key: settingKey,
      value,
      now: new Date(),
      skipHistory: false,
      historyId: undefined,
    });
  };

  const removeWord = (word: string) => {
    const keyParams = getPrioritizedWordKeyParams(word);
    const settingKey = prioritizedWordItemSetting.entity.marshalKey(keyParams);

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
