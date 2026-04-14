import { useSoundEffect } from "@/client/ui/hooks/useSoundEffect";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { AiSubLocationDescriptionModal } from "@/client/ui/AiSubLocationDescriptionModal";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { RectButton } from "@/client/ui/RectButton";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import type { PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  defaultToneNames,
  getDefaultFinalToneName,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import {
  getPinyinFinalToneKeyParams,
  pinyinFinalToneDescriptionSetting,
  pinyinFinalToneImageSetting,
  pinyinFinalToneNameSetting,
  pinyinSoundNameSetting,
} from "@/data/userSettings";
import { loadFinalToneFrequencies } from "@/dictionary";
import type { PylyAudioSource } from "@pinyinly/audio-sprites/client";
import { use, useState } from "react";
import { Text, View } from "react-native";

const TONE_IDS = [`1`, `2`, `3`, `4`, `5`] as const;
type ToneId = (typeof TONE_IDS)[number];

interface PinyinFinalToneEditorProps {
  finalSoundId: PinyinSoundId;
  focusedTone?: string | null;
  onToneLayout?: (tone: string, layoutY: number) => void;
  toneAudioSourceByTone?: Partial<Record<ToneId, PylyAudioSource>>;
}

/**
 * Editor for pinyin final+tone details. Renders a section with all five tones,
 * allowing the user to add descriptions and images for each tone position within a final.
 */
export function PinyinFinalToneEditor({
  finalSoundId,
  focusedTone,
  onToneLayout,
  toneAudioSourceByTone,
}: PinyinFinalToneEditorProps) {
  const chart = loadPylyPinyinChart();
  const finalLabel = chart.soundToCustomLabel[finalSoundId] ?? finalSoundId;
  const finalNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: finalSoundId },
  });
  const finalName = finalNameSetting.value?.text ?? finalLabel;
  const frequencies = use(loadFinalToneFrequencies());
  const finalFrequencies = frequencies.get(finalSoundId);

  return (
    <View className="space-y-8">
      <View className="space-y-6">
        {TONE_IDS.map((tone) => (
          <ToneTileEditor
            key={tone}
            finalSoundId={finalSoundId}
            finalName={finalName}
            tone={tone}
            isFocused={focusedTone === tone}
            onToneLayout={onToneLayout}
            frequency={finalFrequencies?.get(Number(tone)) ?? 0}
            toneAudioSource={toneAudioSourceByTone?.[tone] ?? null}
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
  frequency: number;
  toneAudioSource: PylyAudioSource;
}

function ToneTileEditor({
  finalSoundId,
  finalName,
  tone,
  isFocused,
  onToneLayout,
  frequency,
  toneAudioSource,
}: ToneTileEditorProps) {
  const playTone = useSoundEffect(toneAudioSource);
  const toneSoundId = tone as PinyinSoundId;

  // Get user-set tone name, fallback to default
  const toneNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: toneSoundId },
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
  const finalToneNameSetting = useUserSetting({
    setting: pinyinFinalToneNameSetting,
    key: descriptionSettingKey,
  });
  const descriptionSetting = useUserSetting({
    setting: pinyinFinalToneDescriptionSetting,
    key: descriptionSettingKey,
  });
  const finalToneLocationName =
    finalToneNameSetting.value?.text ?? defaultFinalToneName;
  const [showAiModal, setShowAiModal] = useState(false);
  const toneLabel =
    frequency > 0 ? `Tone ${tone} (${frequency})` : `Tone ${tone}`;

  return (
    <WikiTitledBox
      title={toneLabel}
      className={`
        ${isFocused ? `border-cyan` : `border-fg-bg10`}
      `}
      onLayout={(event) => {
        onToneLayout?.(tone, event.nativeEvent.layout.y);
      }}
    >
      <View className="gap-2 p-3">
        <View className="ml-2 flex-row flex-wrap items-baseline gap-2">
          {toneAudioSource == null ? null : (
            <RectButton
              variant="bare2"
              iconStart="speaker-2"
              onPressIn={playTone}
            >
              Play
            </RectButton>
          )}
          <InlineEditableSettingText
            variant="body"
            setting={pinyinFinalToneNameSetting}
            settingKey={descriptionSettingKey}
            placeholder="Name this tone location"
            // oxlint-disable-next-line typescript/no-deprecated
            defaultValue={defaultFinalToneName}
            displayClassName="text-base font-medium text-fg"
            emptyClassName="text-base font-medium text-fg-dim"
            inputClassName="text-base font-medium text-fg"
          />
        </View>

        {/* Image Uploader */}
        <InlineEditableSettingImage
          enableAiGeneration
          setting={pinyinFinalToneImageSetting}
          settingKey={imageSettingKey}
          previewHeight={200}
          tileSize={64}
          frameConstraint={{ aspectRatio: 2 }}
        />

        {/* Description Field */}
        <View>
          <InlineEditableSettingText
            variant="body"
            setting={pinyinFinalToneDescriptionSetting}
            settingKey={descriptionSettingKey}
            placeholder="Describe what this tone position looks like..."
            multiline
          />
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="font-sans text-[13px] text-fg-dim">
              Need help making this sublocation more vivid?
            </Text>
            <RectButton
              variant="bare"
              onPress={() => {
                setShowAiModal(true);
              }}
            >
              Use AI
            </RectButton>
          </View>
        </View>

        {showAiModal ? (
          <AiSubLocationDescriptionModal
            label={finalToneLocationName}
            location={finalName}
            sublocation={toneName}
            onApplyDescription={(description) => {
              descriptionSetting.setValue({
                soundId: finalSoundId,
                tone,
                text: description,
              });
              setShowAiModal(false);
            }}
            onDismiss={() => {
              setShowAiModal(false);
            }}
          />
        ) : null}
      </View>
    </WikiTitledBox>
  );
}
