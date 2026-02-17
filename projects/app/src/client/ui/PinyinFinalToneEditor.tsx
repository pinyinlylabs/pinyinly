import type {
  UserSettingImageEntity,
  UserSettingTextEntity,
} from "@/client/ui/hooks/useUserSetting";
import {
  getPinyinFinalToneKeyParams,
  pinyinFinalToneDescriptionSetting,
  pinyinFinalToneImageSetting,
  pinyinFinalToneNameSetting,
  pinyinSoundNameSetting,
  useUserSetting,
} from "@/client/ui/hooks/useUserSetting";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import type { PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  defaultToneNames,
  getDefaultFinalToneName,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { Text, View } from "react-native";

const TONE_IDS = [`1`, `2`, `3`, `4`, `5`] as const;

interface PinyinFinalToneEditorProps {
  finalSoundId: PinyinSoundId;
  focusedTone?: string | null;
  onToneLayout?: (tone: string, layoutY: number) => void;
}

/**
 * Editor for pinyin final+tone details. Renders a section with all five tones,
 * allowing the user to add descriptions and images for each tone position within a final.
 */
export function PinyinFinalToneEditor({
  finalSoundId,
  focusedTone,
  onToneLayout,
}: PinyinFinalToneEditorProps) {
  const chart = loadPylyPinyinChart();
  const finalLabel = chart.soundToCustomLabel[finalSoundId] ?? finalSoundId;
  const finalNameSetting = useUserSetting(pinyinSoundNameSetting, {
    soundId: finalSoundId,
  });
  const finalName = finalNameSetting.value?.text ?? finalLabel;

  return (
    <View className="space-y-8">
      <View>
        <Text className="text-lg font-semibold text-fg">Tone Details</Text>
        <Text className="mt-1 text-sm text-fg-dim">
          Add descriptions and images for each tone position within this final.
        </Text>
      </View>

      <View className="space-y-6">
        {TONE_IDS.map((tone) => (
          <ToneTileEditor
            key={tone}
            finalSoundId={finalSoundId}
            finalName={finalName}
            tone={tone}
            isFocused={focusedTone === tone}
            onToneLayout={onToneLayout}
          />
        ))}
      </View>
    </View>
  );
}

interface ToneTileEditorProps {
  finalSoundId: PinyinSoundId;
  finalName: string;
  tone: string;
  isFocused: boolean;
  onToneLayout?: (tone: string, layoutY: number) => void;
}

function ToneTileEditor({
  finalSoundId,
  finalName,
  tone,
  isFocused,
  onToneLayout,
}: ToneTileEditorProps) {
  const toneSoundId = tone as PinyinSoundId;

  // Get user-set tone name, fallback to default
  const toneNameSetting = useUserSetting(pinyinSoundNameSetting, {
    soundId: toneSoundId,
  });
  const toneName =
    toneNameSetting.value?.text ??
    defaultToneNames[tone] ??
    defaultPinyinSoundInstructions[toneSoundId] ??
    tone;

  const defaultFinalToneName = getDefaultFinalToneName({
    finalName,
    toneName,
  });

  const descriptionSettingKey = getPinyinFinalToneKeyParams(finalSoundId, tone);
  const imageSettingKey = getPinyinFinalToneKeyParams(finalSoundId, tone);
  const descriptionSetting =
    pinyinFinalToneDescriptionSetting as unknown as UserSettingTextEntity;
  const imageSetting =
    pinyinFinalToneImageSetting as unknown as UserSettingImageEntity;

  return (
    <View
      className={`
        rounded-lg border bg-fg-bg5 p-4

        ${isFocused ? `border-cyan` : `border-fg-bg10`}
      `}
      onLayout={(event) => {
        onToneLayout?.(tone, event.nativeEvent.layout.y);
      }}
    >
      <View className="mb-4 flex-row flex-wrap items-baseline gap-2">
        <Text className="text-base font-medium text-fg">Tone {tone}:</Text>
        <InlineEditableSettingText
          variant="body"
          setting={pinyinFinalToneNameSetting}
          settingKey={descriptionSettingKey}
          placeholder="Name this tone location"
          defaultValue={defaultFinalToneName}
          displayClassName="text-base font-medium text-fg"
          emptyClassName="text-base font-medium text-fg-dim"
          inputClassName="text-base font-medium text-fg"
        />
      </View>

      <View className="space-y-4">
        {/* Description Field */}
        <View>
          <InlineEditableSettingText
            variant="body"
            setting={descriptionSetting}
            settingKey={descriptionSettingKey}
            placeholder="Describe what this tone position looks like..."
            multiline
          />
        </View>

        {/* Image Uploader */}
        <View className="gap-2 pt-2">
          <Text className="pyly-body-subheading">Image</Text>
          <InlineEditableSettingImage
            setting={imageSetting}
            settingKey={imageSettingKey}
            previewHeight={200}
            tileSize={64}
            enablePasteDropZone
            frameConstraint={{ aspectRatio: 2 }}
          />
        </View>
      </View>
    </View>
  );
}
