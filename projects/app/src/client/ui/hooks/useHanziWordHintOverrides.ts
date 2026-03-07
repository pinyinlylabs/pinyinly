import { parseImageCrop } from "@/client/ui/imageCrop";
import type { HanziWord } from "@/data/model";
import {
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
} from "@/data/userSettings";
import { useUserSetting } from "./useUserSetting";

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
  const hintSetting = useUserSetting({
    setting: hanziWordMeaningHintTextSetting,
    key: { hanziWord },
  });
  const explanationSetting = useUserSetting({
    setting: hanziWordMeaningHintExplanationSetting,
    key: { hanziWord },
  });
  const imageSetting = useUserSetting({
    setting: hanziWordMeaningHintImageSetting,
    key: { hanziWord },
  });
  const hint = hintSetting.value?.text ?? undefined;
  const explanation = explanationSetting.value?.text ?? undefined;
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
