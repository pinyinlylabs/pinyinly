import { composeHintText, parseHintText } from "@/client/ui/hintText";
import { parseImageCrop } from "@/client/ui/imageCrop";
import type { HanziWord } from "@/data/model";
import {
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
} from "@/data/userSettings";
import { useEffect } from "react";
import { useUserSetting } from "./useUserSetting";

interface HanziWordMeaningHintState {
  text: string | null;
  hint?: string;
  explanation?: string;
  hasText: boolean;
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

export function useHanziWordMeaningHint(
  hanziWord: HanziWord | null | undefined,
): HanziWordMeaningHintState {
  const settingKey = hanziWord == null ? null : { hanziWord };
  const hintSetting = useUserSetting(
    settingKey == null
      ? null
      : { setting: hanziWordMeaningHintTextSetting, key: settingKey },
  );
  const explanationSetting = useUserSetting(
    settingKey == null
      ? null
      : { setting: hanziWordMeaningHintExplanationSetting, key: settingKey },
  );

  const hintTextValue = getTextSettingValue(hintSetting?.value);
  const explanationText = explanationSetting?.value?.text ?? null;
  const mergedHintText =
    composeHintText(hintTextValue, explanationText) ?? hintTextValue;
  const parsedHint = parseHintText(mergedHintText);
  const hint = parsedHint.hint.length > 0 ? parsedHint.hint : undefined;
  const explanation = parsedHint.description ?? undefined;
  const hasText = (mergedHintText ?? ``).trim().length > 0;

  useEffect(() => {
    if (hanziWord == null) {
      return;
    }

    if (hintSetting == null || explanationSetting == null) {
      return;
    }

    const migratedHintText = composeHintText(hintTextValue, explanationText);
    if (migratedHintText == null || migratedHintText === hintTextValue) {
      return;
    }

    hintSetting.setValue({
      hanziWord,
      text: migratedHintText,
    });

    if ((explanationText ?? ``).trim().length > 0) {
      explanationSetting.setValue(null);
    }
  }, [
    explanationSetting,
    explanationText,
    hanziWord,
    hintSetting,
    hintTextValue,
  ]);

  return {
    text: mergedHintText,
    hint,
    explanation,
    hasText,
  };
}

export interface HanziWordHintOverrides {
  hint?: string;
  explanation?: string;
  imageId?: string;
  imageCrop?: ReturnType<typeof parseImageCrop>;
  imageWidth?: number;
  imageHeight?: number;
  hasOverrides: boolean;
}

export function useHanziWordHintOverrides(
  hanziWord: HanziWord,
): HanziWordHintOverrides {
  const hintState = useHanziWordMeaningHint(hanziWord);
  const imageSetting = useUserSetting({
    setting: hanziWordMeaningHintImageSetting,
    key: { hanziWord },
  });
  const { hint, explanation } = hintState;
  const imageId = imageSetting.value?.imageId ?? undefined;
  const imageCrop = parseImageCrop(imageSetting.value?.imageCrop);
  const imageWidthRaw = imageSetting.value?.imageWidth as unknown;
  const imageHeightRaw = imageSetting.value?.imageHeight as unknown;
  const imageWidth =
    typeof imageWidthRaw === `number` ? imageWidthRaw : undefined;
  const imageHeight =
    typeof imageHeightRaw === `number` ? imageHeightRaw : undefined;
  const hasOverrides =
    hint != null ||
    explanation != null ||
    imageId != null ||
    imageCrop.kind === `rect`;

  return {
    hint,
    explanation,
    imageId,
    imageCrop,
    imageWidth,
    imageHeight,
    hasOverrides,
  };
}

export function useSelectedHint(hanziWord: HanziWord): string | undefined {
  return useHanziWordHintOverrides(hanziWord).hint;
}
