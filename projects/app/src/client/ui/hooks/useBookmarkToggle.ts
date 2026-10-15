import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { HanziWord } from "@/data/model";
import {
  getStudyWordKeyParams,
  studyWordItemSetting,
} from "@/data/userSettings";

export interface UseBookmarkToggleResult {
  isBookmarked: boolean;
  isLoading: boolean;
  toggle: () => void;
  add: () => void;
  remove: () => void;
}

/**
 * Hook to toggle a word's bookmark membership.
 * Provides isBookmarked state and toggle/add/remove functions.
 */
export function useBookmarkToggle(
  hanziWord: HanziWord,
): UseBookmarkToggleResult {
  const keyParams = getStudyWordKeyParams(hanziWord);
  const setting = useUserSetting({
    setting: studyWordItemSetting,
    key: keyParams,
  });

  const isBookmarked = setting.value != null;
  const isLoading = setting.isLoading;

  const add = () => {
    setting.setValue({
      hanziWord,
      createdAt: new Date(),
    });
  };

  const remove = () => {
    setting.setValue(null);
  };

  const toggle = () => {
    if (isBookmarked) {
      remove();
    } else {
      add();
    }
  };

  return {
    isBookmarked,
    isLoading,
    toggle,
    add,
    remove,
  };
}
