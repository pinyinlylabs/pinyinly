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
  normalizePinyinUnit,
} from "@/data/pinyin";
import {
  getPinyinFinalToneKeyParams,
  pinyinFinalToneDescriptionSetting,
  pinyinFinalToneImageSetting,
  pinyinFinalToneNameSetting,
  pinyinFinalToneViewpointSetting,
  pinyinSoundDescriptionSetting,
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
  const finalLabelWithoutPrefix = finalLabel.startsWith(`-`)
    ? finalLabel.slice(1)
    : finalLabel;
  const maxToneCount = Math.max(
    1,
    ...TONE_IDS.map((tone) => finalFrequencies?.get(Number(tone)) ?? 0),
  );
  const toneHistogramRows = TONE_IDS.map((tone) => ({
    tone,
    pinyinLabel: `-${normalizePinyinUnit(`${finalLabelWithoutPrefix}${tone}`)}`,
    count: finalFrequencies?.get(Number(tone)) ?? 0,
  }));

  return (
    <View className="space-y-8">
      <WikiTitledBox title="Tone Histogram">
        <View className="gap-2 p-3">
          {toneHistogramRows.map(({ tone, pinyinLabel, count }) => (
            <View key={tone} className="gap-1">
              <View className="flex-row items-baseline justify-between">
                <View className="flex-row items-baseline gap-2">
                  <Text className="font-sans text-sm text-fg">
                    {pinyinLabel}
                  </Text>
                  <Text className="font-sans text-xs text-fg-dim">
                    Tone {tone}
                  </Text>
                </View>
                <Text className="font-sans text-xs text-fg-dim">{count}</Text>
              </View>
              <View className="h-2 rounded-full bg-fg/10">
                <View
                  className="h-2 rounded-full bg-cyan"
                  style={{ width: `${(count / maxToneCount) * 100}%` }}
                />
              </View>
            </View>
          ))}
        </View>
      </WikiTitledBox>

      <View className="space-y-6">
        {TONE_IDS.map((tone) => (
          <ToneTileEditor
            key={tone}
            finalSoundId={finalSoundId}
            finalName={finalName}
            tone={tone}
            isFocused={focusedTone === tone}
            onToneLayout={onToneLayout}
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
  toneAudioSource: PylyAudioSource;
}

function ToneTileEditor({
  finalSoundId,
  finalName,
  tone,
  isFocused,
  onToneLayout,
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
  const viewpointSetting = useUserSetting({
    setting: pinyinFinalToneViewpointSetting,
    key: descriptionSettingKey,
  });
  const locationDescriptionSetting = useUserSetting({
    setting: pinyinSoundDescriptionSetting,
    key: { soundId: finalSoundId },
  });
  const finalToneLocationName =
    finalToneNameSetting.value?.text ?? defaultFinalToneName;
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const toneLabel = `Tone ${tone} (${toneName})`;

  return (
    <WikiTitledBox
      title={toneLabel}
      className={`
        ${isFocused ? `border-cyan` : `border-fg-bg10`}
      `}
      onEditingChange={(nextIsEditMode) => {
        setIsEditMode(nextIsEditMode);
        if (!nextIsEditMode) {
          setShowAiModal(false);
        }
      }}
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
            readonly={!isEditMode}
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
          readonly={!isEditMode}
          previewHeight={200}
          tileSize={64}
          frameConstraint={{ aspectRatio: 2 }}
        />

        <InlineEditableSettingText
          variant="body"
          setting={pinyinFinalToneViewpointSetting}
          settingKey={descriptionSettingKey}
          readonly={!isEditMode}
          placeholder="From where are you viewing this scene? (for example, At the bottom of the stairs looking up)"
          multiline
        />

        {/* Description Field */}
        <InlineEditableSettingText
          variant="body"
          setting={pinyinFinalToneDescriptionSetting}
          settingKey={descriptionSettingKey}
          readonly={!isEditMode}
          placeholder="Describe what this tone position looks like..."
          multiline
        />
        {isEditMode ? (
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
        ) : null}

        {showAiModal && isEditMode ? (
          <AiSubLocationDescriptionModal
            label={finalToneLocationName}
            location={finalName}
            locationNotes={locationDescriptionSetting.value?.text ?? ``}
            sublocation={toneName}
            viewpoint={viewpointSetting.value?.text ?? ``}
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
