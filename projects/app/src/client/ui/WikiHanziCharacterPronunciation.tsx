import { useDb } from "@/client/ui/hooks/useDb";
import {
  getHanziPronunciationHintKeyParams,
  hanziPronunciationHintExplanationSetting,
  hanziPronunciationHintImageSetting,
  hanziPronunciationHintTextSetting,
  pinyinSoundNameSetting,
  pinyinSoundNameSettingKey,
} from "@/client/ui/hooks/useUserSetting";
import type { HanziText, PinyinSoundId, PinyinUnit } from "@/data/model";
import { loadPylyPinyinChart, splitPinyinUnit } from "@/data/pinyin";
import type { RizzleEntityMarshaled } from "@/util/rizzle";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
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
  const db = useDb();
  const chart = loadPylyPinyinChart();

  // Collect all relevant pinyin sound setting keys
  const relevantKeys = useMemo(() => {
    const keys: string[] = [];
    for (const group of chart.soundGroups) {
      for (const soundId of group.sounds) {
        keys.push(pinyinSoundNameSettingKey(soundId));
      }
    }
    return keys;
  }, [chart.soundGroups]);

  const { data: settings } = useLiveQuery(
    (q) =>
      q
        .from({ setting: db.settingCollection })
        .where(({ setting }) => inArray(setting.key, relevantKeys)),
    [db.settingCollection, relevantKeys],
  );

  const pinyinSounds = useMemo(() => {
    const sounds = new Map<
      PinyinSoundId,
      { name: string | null; label: string }
    >();

    for (const group of chart.soundGroups) {
      for (const soundId of group.sounds) {
        const userOverride = settings.find(
          (s) => s.key === pinyinSoundNameSettingKey(soundId),
        );
        const nameValueData = userOverride?.value
          ? pinyinSoundNameSetting.unmarshalValue(
              userOverride.value as RizzleEntityMarshaled<
                typeof pinyinSoundNameSetting
              >,
            )
          : null;
        const nameValue = nameValueData?.text ?? null;
        sounds.set(soundId, {
          name: nameValue,
          label: chart.soundToCustomLabel[soundId] ?? soundId,
        });
      }
    }

    return sounds;
  }, [settings, chart.soundGroups, chart.soundToCustomLabel]);

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
