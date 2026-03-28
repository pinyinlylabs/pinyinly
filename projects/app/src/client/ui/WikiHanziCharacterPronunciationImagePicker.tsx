import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { HanziText, PinyinUnit } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  defaultToneNames,
  getDefaultFinalToneName,
  getFinalSoundLabel,
  getInitialSoundLabel,
  getToneSoundLabel,
  splitPinyinUnit,
} from "@/data/pinyin";
import {
  getPinyinFinalToneKeyParams,
  hanziPronunciationHintImagePromptSetting,
  hanziPronunciationHintImageSetting,
  pinyinFinalToneImageSetting,
  pinyinFinalToneNameSetting,
  pinyinSoundImageSetting,
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
  const tonePinyinSoundSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameSetting,
          key: { soundId: splitPinyin.toneSoundId },
        },
  );

  const initialLabel = getInitialSoundLabel(pinyinUnit);
  const finalLabel = getFinalSoundLabel(pinyinUnit);
  const toneDefaultName =
    splitPinyin == null
      ? ``
      : (defaultToneNames[String(splitPinyin.tone)] ??
        defaultPinyinSoundInstructions[splitPinyin.toneSoundId] ??
        String(splitPinyin.tone));
  const initialPinyinSoundName = initialPinyinSoundSetting?.value?.text;
  const finalDisplayName = finalPinyinSoundSetting?.value?.text ?? finalLabel;
  const toneDisplayName =
    tonePinyinSoundSetting?.value?.text ??
    getToneSoundLabel(pinyinUnit) ??
    toneDefaultName;
  const defaultFinalToneName = getDefaultFinalToneName({
    finalName: finalDisplayName,
    toneName: toneDisplayName,
  });

  const finalToneNameSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalToneNameSetting,
          key: getPinyinFinalToneKeyParams(
            splitPinyin.finalSoundId,
            String(splitPinyin.tone),
          ),
        },
  );
  const finalToneName =
    finalToneNameSetting?.value?.text ?? defaultFinalToneName;

  const finalToneName1Setting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalToneNameSetting,
          key: getPinyinFinalToneKeyParams(splitPinyin.finalSoundId, `1`),
        },
  );
  const finalToneName2Setting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalToneNameSetting,
          key: getPinyinFinalToneKeyParams(splitPinyin.finalSoundId, `2`),
        },
  );
  const finalToneName3Setting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalToneNameSetting,
          key: getPinyinFinalToneKeyParams(splitPinyin.finalSoundId, `3`),
        },
  );
  const finalToneName4Setting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalToneNameSetting,
          key: getPinyinFinalToneKeyParams(splitPinyin.finalSoundId, `4`),
        },
  );
  const finalToneName5Setting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalToneNameSetting,
          key: getPinyinFinalToneKeyParams(splitPinyin.finalSoundId, `5`),
        },
  );

  const toneNameByTone = {
    1: finalToneName1Setting?.value?.text,
    2: finalToneName2Setting?.value?.text,
    3: finalToneName3Setting?.value?.text,
    4: finalToneName4Setting?.value?.text,
    5: finalToneName5Setting?.value?.text,
  };

  const fallbackToneOrder = [1, 2, 4, 5, 3] as const;

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
          {
            id: `location-primary`,
            kind: `location`,
            defaultVisibleInRow: true,
            imageSetting: pinyinFinalToneImageSetting,
            imageSettingKey: getPinyinFinalToneKeyParams(
              splitPinyin.finalSoundId,
              String(splitPinyin.tone),
            ),
            label: finalToneName,
            missingPromptPrefill: `Generate just the scene for ${finalToneName}, without ${initialPinyinSoundName ?? initialLabel}.`,
          },
          ...([1, 2, 3, 4, 5] as const)
            .filter((tone) => tone !== splitPinyin.tone)
            .map((tone) => {
              const fallbackRank = fallbackToneOrder.indexOf(tone);
              const defaultToneName =
                defaultToneNames[String(tone)] ?? String(tone);
              const fallbackToneName =
                toneNameByTone[tone] ??
                getDefaultFinalToneName({
                  finalName: finalDisplayName,
                  toneName: defaultToneName,
                });

              return {
                id: `location-tone-${String(tone)}`,
                kind: `location` as const,
                defaultVisibleInRow: false,
                fallbackForId: `location-primary`,
                fallbackOrder: fallbackRank < 0 ? 999 : fallbackRank,
                fallbackHintLabel: `I don't have a reference image for ${finalToneName}, but ${fallbackToneName} might help.`,
                imageSetting: pinyinFinalToneImageSetting,
                imageSettingKey: getPinyinFinalToneKeyParams(
                  splitPinyin.finalSoundId,
                  String(tone),
                ),
                label: fallbackToneName,
              };
            }),
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
        enablePasteDropZone
        enableAiGeneration
        aiReferenceImages={aiReferenceImages}
        initialAiPrompt={
          imagePromptSetting.value?.text ??
          pronunciationHint.text ??
          `Create an image for ${hanzi} (${pinyinUnit}) - ${gloss}`
        }
        frameConstraint={{ aspectRatio: 2 }}
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
