import type { UserDictionaryEntry } from "@/client/query";
import type { HanziText, PinyinText } from "@/data/model";
import {
  getUserHanziMeaningKeyParams,
  userHanziMeaningGlossSetting,
  userHanziMeaningNoteSetting,
  userHanziMeaningPinyinSetting,
} from "@/data/userSettings";
import { useCallback } from "react";
import { useUserSetting } from "./useUserSetting";

export interface UseUserHanziMeaningOptions {
  hanzi: HanziText;
  meaningKey: string;
}

export interface AddUserMeaningOptions {
  gloss: string;
  pinyin?: PinyinText;
  note?: string;
}

export interface UseUserHanziMeaningReturn {
  /**
   * The current meaning value, or null if it doesn't exist.
   */
  value: UserDictionaryEntry | null;

  /**
   * Whether the meaning data is loading.
   */
  isLoading: boolean;

  /**
   * Add or update the user-defined meaning.
   */
  set: (options: AddUserMeaningOptions) => void;

  /**
   * Remove the user-defined meaning.
   */
  remove: () => void;

  /**
   * The generated or provided meaningKey.
   */
  meaningKey: string;
}

/**
 * Hook for managing a single user-defined meaning for a hanzi character.
 * If no meaningKey is provided, a new one will be generated when `set()` is called.
 * User meanings use auto-generated meaningKeys prefixed with "u_" to avoid
 * conflicts with dictionary meanings.
 */
export function useUserHanziMeaning({
  hanzi,
  meaningKey,
}: UseUserHanziMeaningOptions): UseUserHanziMeaningReturn {
  const keyParams = getUserHanziMeaningKeyParams(hanzi, meaningKey);

  const glossSetting = useUserSetting({
    setting: userHanziMeaningGlossSetting,
    key: keyParams,
  });

  const pinyinSetting = useUserSetting({
    setting: userHanziMeaningPinyinSetting,
    key: keyParams,
  });

  const noteSetting = useUserSetting({
    setting: userHanziMeaningNoteSetting,
    key: keyParams,
  });

  const set = useCallback(
    (options: AddUserMeaningOptions) => {
      // Set gloss (required)
      glossSetting.setValue({
        hanzi,
        meaningKey,
        text: options.gloss,
      });

      // Set pinyin (optional)
      if (options.pinyin != null && options.pinyin.length > 0) {
        pinyinSetting.setValue({
          hanzi,
          meaningKey,
          text: options.pinyin,
        });
      } else {
        pinyinSetting.setValue(null);
      }

      // Set note (optional)
      if (options.note != null && options.note.length > 0) {
        noteSetting.setValue({
          hanzi,
          meaningKey,
          text: options.note,
        });
      } else {
        noteSetting.setValue(null);
      }
    },
    [hanzi, meaningKey, glossSetting, pinyinSetting, noteSetting],
  );

  const remove = useCallback(() => {
    glossSetting.setValue(null);
    pinyinSetting.setValue(null);
    noteSetting.setValue(null);
  }, [glossSetting, pinyinSetting, noteSetting]);

  // Reconstruct the UserDictionaryEntry value from individual settings
  const value: UserDictionaryEntry | null =
    glossSetting.value == null
      ? null
      : {
          hanzi,
          meaningKey,
          gloss: glossSetting.value.text,
          pinyin: pinyinSetting.value?.text,
          note: noteSetting.value?.text,
        };

  const isLoading =
    glossSetting.isLoading || pinyinSetting.isLoading || noteSetting.isLoading;

  return {
    value,
    isLoading,
    set,
    remove,
    meaningKey,
  };
}
