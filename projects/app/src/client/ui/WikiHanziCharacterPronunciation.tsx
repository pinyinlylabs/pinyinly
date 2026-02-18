import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import {
  getHanziPronunciationHintKeyParams,
  getPinyinFinalToneKeyParams,
  hanziPronunciationHintExplanationSetting,
  hanziPronunciationHintImagePromptSetting,
  hanziPronunciationHintImageSetting,
  hanziPronunciationHintTextSetting,
  pinyinFinalToneDescriptionSetting,
  pinyinFinalToneNameSetting,
  pinyinSoundDescriptionSetting,
  pinyinSoundNameSetting,
} from "@/client/userSettings";
import type { HanziText, PinyinUnit } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  defaultToneNames,
  getDefaultFinalToneName,
  loadPylyPinyinChart,
  splitPinyinUnit,
} from "@/data/pinyin";
import type { RelativePathString } from "expo-router";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Text, View } from "react-native";
import { AiImageGenerationModal } from "./AiImageGenerationModal";
import { AiPronunciationHintModal } from "./AiPronunciationHintModal";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { ThreeSplitLinesDown } from "./ThreeSplitLinesDown";

export function WikiHanziCharacterPronunciation({
  hanzi,
  pinyinUnit,
  gloss,
}: {
  gloss: string;
  hanzi: HanziText;
  pinyinUnit: PinyinUnit;
}) {
  const splitPinyin = splitPinyinUnit(pinyinUnit);
  const skipSoundSettings = splitPinyin == null;
  const chart = loadPylyPinyinChart();

  const initialPinyinSound2 = useUserSetting(
    pinyinSoundNameSetting,
    skipSoundSettings
      ? { skip: true }
      : { soundId: splitPinyin.initialSoundId },
  );
  const finalPinyinSound2 = useUserSetting(
    pinyinSoundNameSetting,
    skipSoundSettings ? { skip: true } : { soundId: splitPinyin.finalSoundId },
  );
  const tonePinyinSound2 = useUserSetting(
    pinyinSoundNameSetting,
    skipSoundSettings ? { skip: true } : { soundId: splitPinyin.toneSoundId },
  );

  const initialDescriptionSetting = useUserSetting(
    pinyinSoundDescriptionSetting,
    skipSoundSettings
      ? { skip: true }
      : { soundId: splitPinyin.initialSoundId },
  );
  const finalDescriptionSetting = useUserSetting(
    pinyinSoundDescriptionSetting,
    skipSoundSettings ? { skip: true } : { soundId: splitPinyin.finalSoundId },
  );
  const toneDescriptionSetting = useUserSetting(
    pinyinSoundDescriptionSetting,
    skipSoundSettings ? { skip: true } : { soundId: splitPinyin.toneSoundId },
  );
  const finalToneDescriptionSetting = useUserSetting(
    pinyinFinalToneDescriptionSetting,
    skipSoundSettings
      ? { skip: true }
      : getPinyinFinalToneKeyParams(
          splitPinyin.finalSoundId,
          String(splitPinyin.tone),
        ),
  );
  const finalToneNameSetting = useUserSetting(
    pinyinFinalToneNameSetting,
    skipSoundSettings
      ? { skip: true }
      : getPinyinFinalToneKeyParams(
          splitPinyin.finalSoundId,
          String(splitPinyin.tone),
        ),
  );

  const initialPinyinSoundName = initialPinyinSound2?.value?.text;
  const finalPinyinSoundName = finalPinyinSound2?.value?.text;
  const tonePinyinSoundName = tonePinyinSound2?.value?.text;

  const initialSoundDescription =
    initialDescriptionSetting?.value?.text ?? null;
  const finalSoundDescription = finalDescriptionSetting?.value?.text ?? null;
  const toneSoundDescription = toneDescriptionSetting?.value?.text ?? null;
  const finalToneSceneDescription =
    finalToneDescriptionSetting?.value?.text ?? null;

  const initialLabel =
    splitPinyin == null
      ? ``
      : (chart.soundToCustomLabel[splitPinyin.initialSoundId] ??
        splitPinyin.initialSoundId);
  const finalLabel =
    splitPinyin == null
      ? ``
      : (chart.soundToCustomLabel[splitPinyin.finalSoundId] ??
        splitPinyin.finalSoundId);
  const toneDefaultName =
    splitPinyin == null
      ? ``
      : (defaultToneNames[String(splitPinyin.tone)] ??
        defaultPinyinSoundInstructions[splitPinyin.toneSoundId] ??
        String(splitPinyin.tone));
  const finalDisplayName = finalPinyinSoundName ?? finalLabel;
  const toneDisplayName = tonePinyinSoundName ?? toneDefaultName;
  const defaultFinalToneName = getDefaultFinalToneName({
    finalName: finalDisplayName,
    toneName: toneDisplayName,
  });
  const finalToneName =
    finalToneNameSetting?.value?.text ?? defaultFinalToneName;

  const hintSettingKey = getHanziPronunciationHintKeyParams(hanzi, pinyinUnit);
  const hintTextSetting = useUserSetting(
    hanziPronunciationHintTextSetting,
    hintSettingKey,
  );
  const hintExplanationSetting = useUserSetting(
    hanziPronunciationHintExplanationSetting,
    hintSettingKey,
  );
  const hintImageSetting = useUserSetting(
    hanziPronunciationHintImageSetting,
    hintSettingKey,
  );
  const imagePromptSetting = useUserSetting(
    hanziPronunciationHintImagePromptSetting,
    hintSettingKey,
  );
  const [showAiModal, setShowAiModal] = useState(false);
  const [showImageGenerationModal, setShowImageGenerationModal] =
    useState(false);

  const handleUploadError = (error: string) => {
    console.error(`Upload error:`, error);
  };

  return (
    <View className="mt-4 gap-2">
      <View className="mx-4">
        <Text className="pyly-body-subheading">Remember the pronunciation</Text>
      </View>

      <View className="mx-4 rounded-lg bg-fg/5">
        <View className="gap-4 p-4">
          <Text className="pyly-body">
            <Text className="pyly-bold">{hanzi}</Text> is pronounced{` `}
            <Text className="pyly-bold">{pinyinUnit}</Text>.
          </Text>

          <Text className="pyly-body">
            Use a story about &ldquo;
            <Text className="pyly-bold">{gloss}</Text>
            &rdquo; to remember the initial, the final, and the tone of{` `}
            <Text className="pyly-bold">{pinyinUnit}</Text>.
          </Text>
        </View>

        {splitPinyin == null ? null : (
          <View className="gap-4 p-4">
            <View className="">
              <Text className="pyly-body text-center">
                <Text className="pyly-bold">{pinyinUnit}</Text>
              </Text>
              <View className="px-[15%] py-2">
                <ThreeSplitLinesDown className="h-[10px] w-full" />
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <SoundLinkBlock
                    href={`/sounds/${splitPinyin.initialSoundId}`}
                    label={initialLabel}
                    name={initialPinyinSoundName ?? null}
                  />
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <SoundLinkBlock
                    href={`/sounds/${splitPinyin.finalSoundId}`}
                    label={finalLabel}
                    name={null}
                  />
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <SoundLinkBlock
                    href={`/sounds/${splitPinyin.toneSoundId}`}
                    label={
                      <>
                        {splitPinyin.tone}
                        <Text className="align-super text-[10px]">
                          {ordinalSuffix(splitPinyin.tone)}
                        </Text>
                      </>
                    }
                    name={null}
                  />
                </View>
              </View>
              <View className="mt-3 items-center gap-2">
                <FinalToneForkedArrow />
                <Link
                  href={
                    `/sounds/${splitPinyin.finalSoundId}?tone=${splitPinyin.tone}` as RelativePathString
                  }
                  asChild
                >
                  <RectButton variant="bare" className="items-center">
                    <SoundNameLabel>{finalToneName}</SoundNameLabel>
                  </RectButton>
                </Link>
              </View>
            </View>
          </View>
        )}
      </View>

      <View className="mx-4 mt-3 gap-3 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3">
        <Text className="pyly-body-subheading">Your pronunciation hint</Text>

        <View className="gap-2">
          <InlineEditableSettingText
            variant="hint"
            setting={hanziPronunciationHintTextSetting}
            settingKey={hintSettingKey}
            placeholder="Add a hint"
            renderDisplay={(value) => <Pylymark source={value} />}
          />

          <InlineEditableSettingText
            variant="hintExplanation"
            setting={hanziPronunciationHintExplanationSetting}
            settingKey={hintSettingKey}
            placeholder="Add an explanation"
            multiline
            renderDisplay={(value) => <Pylymark source={value} />}
          />
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-[13px] text-fg-dim">
            Want help brainstorming a hint?
          </Text>
          <RectButton
            variant="bare"
            onPress={() => {
              setShowAiModal(true);
            }}
            disabled={splitPinyin == null}
          >
            Use AI
          </RectButton>
        </View>

        <View className="gap-2 pt-2">
          <View className="gap-1">
            <Text className="pyly-body-subheading">Choose an image</Text>
            <Text className="text-[14px] text-fg-dim">
              Pick the image that should appear on the wiki page
            </Text>
          </View>

          <View className="flex-row items-center justify-between pb-2">
            <Text className="text-[13px] text-fg-dim">
              Want AI to create an image?
            </Text>
            <RectButton
              variant="bare"
              onPress={() => {
                setShowImageGenerationModal(true);
              }}
            >
              Generate image
            </RectButton>
          </View>

          <InlineEditableSettingImage
            setting={hanziPronunciationHintImageSetting}
            settingKey={hintSettingKey}
            previewHeight={200}
            tileSize={64}
            enablePasteDropZone
            frameConstraint={{ aspectRatio: 2 }}
            onUploadError={handleUploadError}
          />
        </View>
      </View>

      {showAiModal && splitPinyin != null ? (
        <AiPronunciationHintModal
          hanzi={hanzi}
          pinyinUnit={pinyinUnit}
          gloss={gloss}
          initial={{
            soundId: splitPinyin.initialSoundId,
            name: initialPinyinSoundName ?? null,
            description: initialSoundDescription,
          }}
          final={{
            soundId: splitPinyin.finalSoundId,
            name: finalPinyinSoundName ?? null,
            description: finalSoundDescription,
          }}
          tone={{
            soundId: splitPinyin.toneSoundId,
            name: tonePinyinSoundName ?? null,
            description: toneSoundDescription,
          }}
          toneNumber={splitPinyin.tone}
          finalToneScene={{ description: finalToneSceneDescription }}
          onApplyHint={({ text, explanation }) => {
            hintTextSetting.setValue({
              hanzi,
              pinyin: hintSettingKey.pinyin,
              text,
            });
            if (explanation != null && explanation.length > 0) {
              hintExplanationSetting.setValue({
                hanzi,
                pinyin: hintSettingKey.pinyin,
                text: explanation,
              });
            }
          }}
          onDismiss={() => {
            setShowAiModal(false);
          }}
        />
      ) : null}

      {showImageGenerationModal && (
        <AiImageGenerationModal
          initialPrompt={
            imagePromptSetting.value?.text ??
            ([hintTextSetting.value?.text, hintExplanationSetting.value?.text]
              .filter((v) => v != null && v.length > 0)
              .join(` - `) ||
              `Create an image representing ${hanzi} (${gloss}) pronounced ${pinyinUnit}`)
          }
          onConfirm={(assetId) => {
            hintImageSetting.setValue({
              imageId: assetId,
            });
            setShowImageGenerationModal(false);
          }}
          onDismiss={() => {
            setShowImageGenerationModal(false);
          }}
          onSavePrompt={(prompt) => {
            imagePromptSetting.setValue({
              hanzi,
              pinyin: hintSettingKey.pinyin,
              text: prompt,
            });
          }}
        />
      )}
    </View>
  );
}

function SoundLinkBlock({
  href,
  label,
  name,
}: {
  href: string;
  label: ReactNode;
  name: string | null;
}) {
  return (
    <View className="w-full items-center gap-1">
      <Link href={href as RelativePathString} asChild>
        <RectButton variant="bare">
          <Text className="pyly-body pyly-ref text-center text-fg/50">
            {label}
          </Text>
        </RectButton>
      </Link>
      {name == null ? null : (
        <>
          <DownArrow />
          <Link href={href as RelativePathString} asChild>
            <RectButton variant="bare">
              <SoundNameLabel>{name}</SoundNameLabel>
            </RectButton>
          </Link>
        </>
      )}
    </View>
  );
}

function SoundNameLabel({ children }: { children: ReactNode }) {
  return <Text className="pyly-body pyly-ref text-center">{children}</Text>;
}

function FinalToneForkedArrow() {
  return (
    <View className="w-full gap-1">
      {/* TODO: Swap in a responsive Rive animation when available. */}
      <View className="flex-row gap-4">
        <View className="flex-1" />
        <View className="flex-1 items-center">
          <DownArrow />
        </View>
        <View className="flex-1 items-center">
          <DownArrow />
        </View>
      </View>
      <View className="flex-row gap-4">
        <View className="flex-1" />
        <View className="flex-1 items-center">
          <Text className="pyly-body text-fg/40">\\ /</Text>
        </View>
        <View className="flex-1" />
      </View>
      <View className="items-center">
        <DownArrow />
      </View>
    </View>
  );
}

function DownArrow() {
  return <Text className="pyly-body h-6 text-fg/40">↓</Text>;
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) {
    return `th`;
  }
  switch (n % 10) {
    case 1: {
      return `st`;
    }
    case 2: {
      return `nd`;
    }
    case 3: {
      return `rd`;
    }
    default: {
      return `th`;
    }
  }
}
