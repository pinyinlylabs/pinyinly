import {
  getHanziPronunciationHintKeyParams,
  getPinyinFinalToneKeyParams,
  hanziPronunciationHintExplanationSetting,
  hanziPronunciationHintImageSetting,
  hanziPronunciationHintTextSetting,
  pinyinFinalToneDescriptionSetting,
  pinyinSoundDescriptionSetting,
  pinyinSoundNameSetting,
  useUserSetting,
} from "@/client/ui/hooks/useUserSetting";
import type { HanziText, PinyinUnit } from "@/data/model";
import { splitPinyinUnit } from "@/data/pinyin";
import type { ReactNode } from "react";
import { useState } from "react";
import { Text, View } from "react-native";
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

  const initialPinyinSoundName = initialPinyinSound2?.value?.text;
  const finalPinyinSoundName = finalPinyinSound2?.value?.text;
  const tonePinyinSoundName = tonePinyinSound2?.value?.text;

  const initialSoundDescription =
    initialDescriptionSetting?.value?.text ?? null;
  const finalSoundDescription = finalDescriptionSetting?.value?.text ?? null;
  const toneSoundDescription = toneDescriptionSetting?.value?.text ?? null;
  const finalToneSceneDescription =
    finalToneDescriptionSetting?.value?.text ?? null;

  const hintSettingKey = getHanziPronunciationHintKeyParams(hanzi, pinyinUnit);
  const hintTextSetting = useUserSetting(
    hanziPronunciationHintTextSetting,
    hintSettingKey,
  );
  const hintExplanationSetting = useUserSetting(
    hanziPronunciationHintExplanationSetting,
    hintSettingKey,
  );
  const [showAiModal, setShowAiModal] = useState(false);

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
                  <Text className="pyly-body text-center text-fg/50">
                    {splitPinyin.initialSoundId}
                  </Text>
                  {initialPinyinSoundName == null ? null : (
                    <ArrowToSoundName>
                      {initialPinyinSoundName}
                    </ArrowToSoundName>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {splitPinyin.finalSoundId}
                  </Text>
                  {finalPinyinSoundName == null ? null : (
                    <ArrowToSoundName>{finalPinyinSoundName}</ArrowToSoundName>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {splitPinyin.tone}
                    <Text className="align-super text-[10px]">
                      {ordinalSuffix(splitPinyin.tone)}
                    </Text>
                  </Text>
                  {tonePinyinSoundName == null ? null : (
                    <ArrowToSoundName>{tonePinyinSoundName}</ArrowToSoundName>
                  )}
                </View>
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
          <Text className="pyly-body-subheading">Choose an image</Text>
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
    </View>
  );
}

function ArrowToSoundName({ children }: { children: ReactNode }) {
  return (
    <>
      <DownArrow />
      <Text className="pyly-body pyly-ref text-center">{children}</Text>
    </>
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
