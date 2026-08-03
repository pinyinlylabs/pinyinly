import { parseHintText } from "@/client/ui/hintText";
import type { HanziText, PinyinUnit } from "@/data/model";
import {
  getHanziPronunciationMnemonicKeyParams,
  pronunciationMnemonicTextSetting,
} from "@/data/userSettings";
import { useUserSetting } from "./useUserSetting";

interface HanziPronunciationMnemonicState {
  settingKey: { hanzi: HanziText; pinyin: string };
  text: string | null;
  hint?: string;
  explanation?: string;
  hasText: boolean;
  setText: (text: string | null | undefined) => void;
}

function getTextSettingValue(value: unknown): string | null {
  if (typeof value !== `object` || value == null) {
    return null;
  }

  const record = value as { text?: unknown; t?: unknown };

  if (typeof record.text === `string`) {
    return record.text;
  }

  return typeof record.t === `string` ? record.t : null;
}

export function useHanziPronunciationMnemonic(
  hanzi: HanziText,
  pinyinUnit: PinyinUnit,
): HanziPronunciationMnemonicState {
  const settingKey = getHanziPronunciationMnemonicKeyParams(hanzi, pinyinUnit);
  const hintSetting = useUserSetting({
    setting: pronunciationMnemonicTextSetting,
    key: settingKey,
  });

  const hintTextValue = getTextSettingValue(hintSetting.value);
  const parsedHint = parseHintText(hintTextValue);
  const hint = parsedHint.hint.length > 0 ? parsedHint.hint : undefined;
  const explanation = parsedHint.description ?? undefined;
  const hasText = (hintTextValue ?? ``).trim().length > 0;

  const setText = (text: string | null | undefined) => {
    const sanitized = text?.trim() ?? ``;

    if (sanitized.length === 0) {
      hintSetting.setValue(null);
    } else {
      hintSetting.setValue({
        ...settingKey,
        text: sanitized,
      });
    }
  };

  return {
    settingKey,
    text: hintTextValue,
    hint,
    explanation,
    hasText,
    setText,
  };
}
