import {
  getPinyinSoundLocationDisplaySummary,
  usePinyinSoundLocations,
} from "@/client/ui/hooks/usePinyinSoundLocations";
import { usePinyinSoundActors } from "@/client/ui/hooks/usePinyinSoundActors";
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
  pinyinFinalSoundLocationSelectionSetting,
  actorIdentityImageSetting,
  locationIdentityImageSetting,
  pinyinSoundNameTextSetting,
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
  const placeDirectory = usePinyinSoundLocations();
  const actorDirectory = usePinyinSoundActors();
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
          setting: pinyinSoundNameTextSetting,
          key: { soundId: splitPinyin.initialSoundId },
        },
  );
  const finalPinyinSoundSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameTextSetting,
          key: { soundId: splitPinyin.finalSoundId },
        },
  );
  const finalPlaceSelectionSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalSoundLocationSelectionSetting,
          key: { soundId: splitPinyin.finalSoundId },
        },
  );

  const initialLabel = getInitialSoundLabel(pinyinUnit);
  const finalLabel = getFinalSoundLabel(pinyinUnit);
  const initialPinyinSoundName = initialPinyinSoundSetting?.value?.text;
  const finalDisplayName = finalPinyinSoundSetting?.value?.text ?? finalLabel;
  const selectedInitialActorId =
    splitPinyin == null
      ? null
      : (actorDirectory.soundActorIdBySoundId.get(splitPinyin.initialSoundId) ??
        null);
  const selectedInitialActor =
    selectedInitialActorId == null
      ? null
      : (actorDirectory.actors.find(
          (entry) => entry.actorId === selectedInitialActorId,
        ) ?? null);
  const selectedFinalLocationId =
    finalPlaceSelectionSetting?.value?.locationId ?? null;
  const selectedFinalLocation =
    selectedFinalLocationId == null
      ? null
      : (placeDirectory.locations.find(
          (place) => place.locationId === selectedFinalLocationId,
        ) ?? null);
  const selectedFinalPlaceDisplay =
    selectedFinalLocation == null
      ? null
      : getPinyinSoundLocationDisplaySummary(selectedFinalLocation);
  const finalLocationLabel =
    selectedFinalPlaceDisplay?.name == null ||
    selectedFinalPlaceDisplay.name.trim().length === 0
      ? finalDisplayName
      : selectedFinalPlaceDisplay.name;

  const aiReferenceImages: AiReferenceImageDeclaration[] | undefined =
    splitPinyin == null
      ? undefined
      : [
          ...(selectedInitialActor == null
            ? []
            : [
                {
                  id: `actor-primary`,
                  kind: `actor` as const,
                  defaultVisibleInRow: true,
                  imageSetting: actorIdentityImageSetting,
                  imageSettingKey: { actorId: selectedInitialActor.actorId },
                  label:
                    selectedInitialActor.name ??
                    initialPinyinSoundName ??
                    initialLabel,
                  missingPromptPrefill: `Generate a clear close-up of ${selectedInitialActor.name ?? initialPinyinSoundName ?? initialLabel} only, with no scene background.`,
                },
              ]),
          ...(selectedFinalLocation == null
            ? []
            : [
                {
                  id: `location-primary`,
                  kind: `location` as const,
                  defaultVisibleInRow: true,
                  imageSetting: locationIdentityImageSetting,
                  imageSettingKey: {
                    locationId: selectedFinalLocation.locationId,
                  },
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
