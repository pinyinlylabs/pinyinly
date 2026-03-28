import { composeHintText, parseHintText } from "@/client/ui/hintText";
import type { HanziText, PinyinUnit } from "@/data/model";
import {
  getHanziPronunciationHintKeyParams,
  hanziPronunciationHintExplanationSetting,
  hanziPronunciationHintTextSetting,
} from "@/data/userSettings";
import { useEffect } from "react";
import { useUserSetting } from "./useUserSetting";

interface HanziPronunciationHintState {
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

export function useHanziPronunciationHint(
  hanzi: HanziText,
  pinyinUnit: PinyinUnit,
): HanziPronunciationHintState {
  const settingKey = getHanziPronunciationHintKeyParams(hanzi, pinyinUnit);
  const hintSetting = useUserSetting({
    setting: hanziPronunciationHintTextSetting,
    key: settingKey,
  });
  const explanationSetting = useUserSetting({
    setting: hanziPronunciationHintExplanationSetting,
    key: settingKey,
  });

  const hintTextValue = getTextSettingValue(hintSetting.value);
  const explanationText = explanationSetting.value?.text ?? null;
  const parsedHintTextValue = parseHintText(hintTextValue);
  const hasInlineDescription = parsedHintTextValue.description != null;
  const mergedHintText = hasInlineDescription
    ? hintTextValue
    : (composeHintText(hintTextValue, explanationText) ?? hintTextValue);
  const parsedHint = parseHintText(mergedHintText);
  const hint = parsedHint.hint.length > 0 ? parsedHint.hint : undefined;
  const explanation = parsedHint.description ?? undefined;
  const hasText = (mergedHintText ?? ``).trim().length > 0;

  useEffect(() => {
    const hasLegacyExplanation = (explanationText ?? ``).trim().length > 0;

    if (!hasLegacyExplanation) {
      return;
    }

    // The new hint text already contains an inline description. Only clear legacy setting.
    if (hasInlineDescription) {
      explanationSetting.setValue(null);
      return;
    }

    const migratedHintText = composeHintText(hintTextValue, explanationText);
    if (migratedHintText != null && migratedHintText !== hintTextValue) {
      hintSetting.setValue({
        ...settingKey,
        text: migratedHintText,
      });
    }

    explanationSetting.setValue(null);
  }, [
    explanationSetting,
    explanationText,
    hasInlineDescription,
    hintSetting,
    hintTextValue,
    settingKey,
  ]);

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

    if ((explanationSetting.value?.text ?? ``).trim().length > 0) {
      explanationSetting.setValue(null);
    }
  };

  return {
    settingKey,
    text: mergedHintText,
    hint,
    explanation,
    hasText,
    setText,
  };
}
