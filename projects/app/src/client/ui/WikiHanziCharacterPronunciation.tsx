import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import {
  getHanziPronunciationHintKeyParams,
  hanziPronunciationHintExplanationSetting,
  hanziPronunciationHintImageSetting,
  hanziPronunciationHintTextSetting,
} from "@/client/hooks/useUserSetting";
import { pinyinSoundsQuery } from "@/client/query";
import type { HanziText, PinyinUnit } from "@/data/model";
import { splitPinyinUnit } from "@/data/pinyin";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { ThreeSplitLinesDown } from "./ThreeSplitLinesDown";
import { HintImageSettingPicker } from "./HintImageSettingPicker";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";

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
  const r = useReplicache();
  const { data: pinyinSounds } = useRizzleQueryPaged(pinyinSoundsQuery(r));

  const initialPinyinSound =
    splitPinyin == null ? null : pinyinSounds?.get(splitPinyin.initialSoundId);
  const finalPinyinSound =
    splitPinyin == null ? null : pinyinSounds?.get(splitPinyin.finalSoundId);
  const tonePinyinSound =
    splitPinyin == null ? null : pinyinSounds?.get(splitPinyin.toneSoundId);

  const hintSettingKey = getHanziPronunciationHintKeyParams(hanzi, pinyinUnit);

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
                  {initialPinyinSound == null ? null : (
                    <ArrowToSoundName>
                      {initialPinyinSound.name}
                    </ArrowToSoundName>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {splitPinyin.finalSoundId}
                  </Text>
                  {finalPinyinSound == null ? null : (
                    <ArrowToSoundName>{finalPinyinSound.name}</ArrowToSoundName>
                  )}
                </View>
                <View className="flex-1 items-center gap-1 border-fg/10">
                  <Text className="pyly-body text-center text-fg/50">
                    {splitPinyin.tone}
                    <Text className="align-super text-[10px]">
                      {ordinalSuffix(splitPinyin.tone)}
                    </Text>
                  </Text>
                  {tonePinyinSound == null ? null : (
                    <ArrowToSoundName>{tonePinyinSound.name}</ArrowToSoundName>
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
            setting={hanziPronunciationHintTextSetting}
            settingKey={hintSettingKey}
            placeholder="Add a hint"
            emptyText="Add a hint"
            renderDisplay={(value) => <Pylymark source={value} />}
            inputClassName={`
              pyly-body-input rounded-lg bg-bg-high px-3 py-2 text-[14px] font-semibold text-fg-loud
            `}
            displayClassName="pyly-body text-[14px] font-semibold text-fg-loud"
            emptyClassName="pyly-body text-[14px] font-semibold text-fg-dim"
            displayContainerClassName="px-2 py-1"
            displayHoverClassName="rounded-md bg-fg-bg10 px-2 py-1"
          />

          <InlineEditableSettingText
            setting={hanziPronunciationHintExplanationSetting}
            settingKey={hintSettingKey}
            placeholder="Add an explanation"
            emptyText="Add an explanation"
            multiline
            renderDisplay={(value) => <Pylymark source={value} />}
            inputClassName="rounded-lg bg-bg-high px-3 py-2 text-[14px] text-fg"
            displayClassName="pyly-body text-[14px] text-fg"
            emptyClassName="pyly-body text-[14px] text-fg-dim"
            displayContainerClassName="px-2 py-1"
            displayHoverClassName="rounded-md bg-fg-bg10 px-2 py-1"
          />
        </View>

        <HintImageSettingPicker
          setting={hanziPronunciationHintImageSetting}
          settingKey={hintSettingKey}
          title="Choose an image"
          previewHeight={200}
          tileSize={64}
          enablePasteDropZone
          onUploadError={handleUploadError}
          className="gap-2 pt-2"
        />
      </View>
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
