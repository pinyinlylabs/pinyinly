import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { HanziWord } from "@/data/model";
import {
  getStudyWordKeyParams,
  studyWordItemSetting,
} from "@/data/userSettings";

export interface UseStudyToggleResult {
  isStudying: boolean;
  isLoading: boolean;
  toggle: () => void;
  add: () => void;
  remove: () => void;
}

/**
 * Hook to toggle a word's Study membership.
 * Provides isStudying state and toggle/add/remove functions.
 */
export function useStudyToggle(hanziWord: HanziWord): UseStudyToggleResult {
  const keyParams = getStudyWordKeyParams(hanziWord);
  const setting = useUserSetting({
    setting: studyWordItemSetting,
    key: keyParams,
  });

  const isStudying = setting.value != null;
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
    if (isStudying) {
      remove();
    } else {
      add();
    }
  };

  return {
    isStudying,
    isLoading,
    toggle,
    add,
    remove,
  };
}
