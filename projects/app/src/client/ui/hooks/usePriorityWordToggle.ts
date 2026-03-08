import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import {
  getPrioritizedWordKeyParams,
  prioritizedWordItemSetting,
} from "@/data/userSettings";

export interface UsePriorityWordToggleResult {
  isPriority: boolean;
  isLoading: boolean;
  toggle: () => void;
  add: (options?: { note?: string }) => void;
  remove: () => void;
}

/**
 * Hook to toggle a word's priority status.
 * Provides isPriority state and toggle/add/remove functions.
 */
export function usePriorityWordToggle(
  word: string,
): UsePriorityWordToggleResult {
  const keyParams = getPrioritizedWordKeyParams(word);
  const setting = useUserSetting({
    setting: prioritizedWordItemSetting,
    key: keyParams,
  });

  const isPriority = setting.value != null;
  const isLoading = setting.isLoading;

  const add = (options?: { note?: string }) => {
    setting.setValue({
      word,
      createdAt: new Date(),
      note: options?.note,
    });
  };

  const remove = () => {
    setting.setValue(null);
  };

  const toggle = () => {
    if (isPriority) {
      remove();
    } else {
      add();
    }
  };

  return {
    isPriority,
    isLoading,
    toggle,
    add,
    remove,
  };
}
