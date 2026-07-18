import {
  getPinyinSoundPlaceDisplaySummary,
  usePinyinSoundPlaces,
} from "@/client/ui/hooks/usePinyinSoundPlaces";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { HanziText, PinyinUnit } from "@/data/model";
import {
  getFinalSoundLabel,
  getInitialSoundLabel,
  splitPinyinUnit,
} from "@/data/pinyin";
import {
  hanziPronunciationHintImagePromptSetting,
  hanziPronunciationHintImageSetting,
  pinyinFinalSoundPlaceSelectionSetting,
  pinyinSoundImageSetting,
  pinyinSoundLocationIdentityImageSetting,
  pinyinSoundNameSetting,
} from "@/data/userSettings";
import { Text, View } from "react-native";
import type { AiReferenceImageDeclaration } from "./AiImageGenerationPanel";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { useHanziPronunciationHint } from "./hooks/useHanziPronunciationHint";

export function WikiHanziCharacterPronunciationImagePicker({
  gloss,
  hanzi,
  pinyinUnit,
  onChangeImageId,
}: {
  gloss: string;
  hanzi: HanziText;
  pinyinUnit: PinyinUnit;
  onChangeImageId: (nextImageId: string | null) => void;
}) {
  const splitPinyin = splitPinyinUnit(pinyinUnit);
  const placeDirectory = usePinyinSoundPlaces();
  const pronunciationHint = useHanziPronunciationHint(hanzi, pinyinUnit);
  const hintSettingKey = pronunciationHint.settingKey;
  const imagePromptSetting = useUserSetting({
    setting: hanziPronunciationHintImagePromptSetting,
    key: hintSettingKey,
  });

  const initialPinyinSoundSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameSetting,
          key: { soundId: splitPinyin.initialSoundId },
        },
  );
  const finalPinyinSoundSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameSetting,
          key: { soundId: splitPinyin.finalSoundId },
        },
  );
  const finalPlaceSelectionSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalSoundPlaceSelectionSetting,
          key: { soundId: splitPinyin.finalSoundId },
        },
  );

  const initialLabel = getInitialSoundLabel(pinyinUnit);
  const finalLabel = getFinalSoundLabel(pinyinUnit);
  const initialPinyinSoundName = initialPinyinSoundSetting?.value?.text;
  const finalDisplayName = finalPinyinSoundSetting?.value?.text ?? finalLabel;
  const selectedFinalPlaceId =
    finalPlaceSelectionSetting?.value?.placeId ?? null;
  const selectedFinalPlace =
    selectedFinalPlaceId == null
      ? null
      : (placeDirectory.places.find(
          (place) => place.placeId === selectedFinalPlaceId,
        ) ?? null);
  const selectedFinalPlaceDisplay =
    selectedFinalPlace == null
      ? null
      : getPinyinSoundPlaceDisplaySummary(selectedFinalPlace);
  const finalLocationLabel =
    selectedFinalPlaceDisplay?.name == null ||
    selectedFinalPlaceDisplay.name.trim().length === 0
      ? finalDisplayName
      : selectedFinalPlaceDisplay.name;

  const aiReferenceImages: AiReferenceImageDeclaration[] | undefined =
    splitPinyin == null
      ? undefined
      : [
          {
            id: `actor-primary`,
            kind: `actor`,
            defaultVisibleInRow: true,
            imageSetting: pinyinSoundImageSetting,
            imageSettingKey: { soundId: splitPinyin.initialSoundId },
            label: initialPinyinSoundName ?? initialLabel,
            missingPromptPrefill: `Generate a clear close-up of ${initialPinyinSoundName ?? initialLabel} only, with no scene background.`,
          },
          ...(selectedFinalPlace == null
            ? []
            : [
                {
                  id: `location-primary`,
                  kind: `location` as const,
                  defaultVisibleInRow: true,
                  imageSetting: pinyinSoundLocationIdentityImageSetting,
                  imageSettingKey: { placeId: selectedFinalPlace.placeId },
                  label: finalLocationLabel,
                  missingPromptPrefill: `Generate just the scene for ${finalLocationLabel}, without ${initialPinyinSoundName ?? initialLabel}.`,
                },
              ]),
        ];

  return (
    <View className="gap-2 pt-2">
      <View className="gap-1">
        <Text className="pyly-body-subheading">Choose an image</Text>
        <Text className="font-sans text-[14px] text-fg-dim">
          Pick the image that should appear on the wiki page
        </Text>
      </View>

      <InlineEditableSettingImage
        setting={hanziPronunciationHintImageSetting}
        settingKey={hintSettingKey}
        previewHeight={200}
        tileSize={64}
        enableAiGeneration
        aiReferenceImages={aiReferenceImages}
        initialAiPrompt={
          imagePromptSetting.value?.text ??
          pronunciationHint.text ??
          `Create an image for ${hanzi} (${pinyinUnit}) - ${gloss}`
        }
        aspectRatio="16:9"
        onUploadError={(error) => {
          console.error(`Upload error:`, error);
        }}
        onSaveAiPrompt={(prompt) => {
          imagePromptSetting.setValue({
            ...hintSettingKey,
            text: prompt,
          });
        }}
        onChangeImageId={onChangeImageId}
      />
    </View>
  );
}
