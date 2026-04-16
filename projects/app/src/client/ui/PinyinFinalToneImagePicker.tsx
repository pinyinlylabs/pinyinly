import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { FramedAssetImage } from "@/client/ui/ImageFrame";
import type { AssetId, PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  defaultToneNames,
  getDefaultFinalToneName,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import {
  getPinyinFinalToneKeyParams,
  pinyinFinalToneImageSetting,
  pinyinFinalToneNameSetting,
  pinyinSoundImageSetting,
  pinyinSoundNameSetting,
} from "@/data/userSettings";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";

interface PinyinFinalToneImagePickerProps {
  finalSoundId: PinyinSoundId;
}

interface ToneImageOptionInput {
  tone: string;
  assetId: AssetId | null;
  locationLabel: string;
}

interface ToneImageOption {
  assetId: AssetId;
  locationLabels: string[];
  tones: string[];
}

export function PinyinFinalToneImagePicker({
  finalSoundId,
}: PinyinFinalToneImagePickerProps) {
  const tone1SoundId = `1` as PinyinSoundId;
  const tone2SoundId = `2` as PinyinSoundId;
  const tone3SoundId = `3` as PinyinSoundId;
  const tone4SoundId = `4` as PinyinSoundId;
  const tone5SoundId = `5` as PinyinSoundId;
  const chart = loadPylyPinyinChart();
  const defaultFinalLabel =
    chart.soundToCustomLabel[finalSoundId] ?? finalSoundId;
  const mainImageSetting = useUserSetting({
    setting: pinyinSoundImageSetting,
    key: { soundId: finalSoundId },
  });
  const finalSoundNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: finalSoundId },
  });
  const tone1SoundNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: tone1SoundId },
  });
  const tone2SoundNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: tone2SoundId },
  });
  const tone3SoundNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: tone3SoundId },
  });
  const tone4SoundNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: tone4SoundId },
  });
  const tone5SoundNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: tone5SoundId },
  });

  const tone1LocationNameSetting = useUserSetting({
    setting: pinyinFinalToneNameSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `1`),
  });
  const tone2LocationNameSetting = useUserSetting({
    setting: pinyinFinalToneNameSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `2`),
  });
  const tone3LocationNameSetting = useUserSetting({
    setting: pinyinFinalToneNameSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `3`),
  });
  const tone4LocationNameSetting = useUserSetting({
    setting: pinyinFinalToneNameSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `4`),
  });
  const tone5LocationNameSetting = useUserSetting({
    setting: pinyinFinalToneNameSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `5`),
  });

  const tone1ImageSetting = useUserSetting({
    setting: pinyinFinalToneImageSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `1`),
  });
  const tone2ImageSetting = useUserSetting({
    setting: pinyinFinalToneImageSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `2`),
  });
  const tone3ImageSetting = useUserSetting({
    setting: pinyinFinalToneImageSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `3`),
  });
  const tone4ImageSetting = useUserSetting({
    setting: pinyinFinalToneImageSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `4`),
  });
  const tone5ImageSetting = useUserSetting({
    setting: pinyinFinalToneImageSetting,
    key: getPinyinFinalToneKeyParams(finalSoundId, `5`),
  });

  const finalName = finalSoundNameSetting.value?.text ?? defaultFinalLabel;
  const toneImageOptions = coalesceToneImageOptions([
    buildToneImageOption({
      tone: `1`,
      assetId: tone1ImageSetting.value?.imageId ?? null,
      finalName,
      toneName: getToneSoundName(
        `1`,
        getTextValue(tone1SoundNameSetting.value),
      ),
      locationLabel: getTextValue(tone1LocationNameSetting.value),
    }),
    buildToneImageOption({
      tone: `2`,
      assetId: tone2ImageSetting.value?.imageId ?? null,
      finalName,
      toneName: getToneSoundName(
        `2`,
        getTextValue(tone2SoundNameSetting.value),
      ),
      locationLabel: getTextValue(tone2LocationNameSetting.value),
    }),
    buildToneImageOption({
      tone: `3`,
      assetId: tone3ImageSetting.value?.imageId ?? null,
      finalName,
      toneName: getToneSoundName(
        `3`,
        getTextValue(tone3SoundNameSetting.value),
      ),
      locationLabel: getTextValue(tone3LocationNameSetting.value),
    }),
    buildToneImageOption({
      tone: `4`,
      assetId: tone4ImageSetting.value?.imageId ?? null,
      finalName,
      toneName: getToneSoundName(
        `4`,
        getTextValue(tone4SoundNameSetting.value),
      ),
      locationLabel: getTextValue(tone4LocationNameSetting.value),
    }),
    buildToneImageOption({
      tone: `5`,
      assetId: tone5ImageSetting.value?.imageId ?? null,
      finalName,
      toneName: getToneSoundName(
        `5`,
        getTextValue(tone5SoundNameSetting.value),
      ),
      locationLabel: getTextValue(tone5LocationNameSetting.value),
    }),
  ]);

  if (toneImageOptions.length === 0) {
    return null;
  }

  const selectedMainImageId = mainImageSetting.value?.imageId ?? null;

  return (
    <View className="gap-2">
      <View className="gap-1">
        <Text className="pyly-body-subheading">Use from tones</Text>
        <Text className="font-sans text-[14px] text-fg-dim">
          Pick one of the tone images you already made for this final as the
          main mnemonic image.
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-3">
        {toneImageOptions.map((option) => {
          const isSelected = option.assetId === selectedMainImageId;

          return (
            <Pressable
              key={option.assetId}
              onPress={() => {
                mainImageSetting.setValue({
                  soundId: finalSoundId,
                  imageId: option.assetId,
                });
              }}
            >
              <View className={toneImageCardClass({ isSelected })}>
                <View className="aspect-[2/1] w-full overflow-hidden rounded-lg bg-fg-bg5">
                  <FramedAssetImage
                    assetId={option.assetId}
                    className="size-full"
                  />
                </View>
                <View className="gap-1">
                  <Text className="font-sans text-[11px] uppercase text-fg-dim">
                    {option.tones.map((tone) => `Tone ${tone}`).join(`, `)}
                  </Text>
                  <Text className="font-sans text-[13px] font-medium text-fg">
                    {option.locationLabels.join(` / `)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getToneSoundName(tone: string, userToneName: string | undefined) {
  return (
    userToneName ??
    defaultToneNames[tone] ??
    defaultPinyinSoundInstructions[tone as PinyinSoundId] ??
    tone
  );
}

function getTextValue(value: unknown): string | undefined {
  if (value == null || typeof value !== `object`) {
    return undefined;
  }

  const text = (value as { text?: unknown }).text;
  return typeof text === `string` ? text : undefined;
}

function buildToneImageOption({
  tone,
  assetId,
  finalName,
  toneName,
  locationLabel,
}: {
  tone: string;
  assetId: AssetId | null;
  finalName: string;
  toneName: string;
  locationLabel: string | undefined;
}): ToneImageOptionInput {
  return {
    tone,
    assetId,
    locationLabel:
      locationLabel ?? getDefaultFinalToneName({ finalName, toneName }),
  };
}

function coalesceToneImageOptions(
  options: readonly ToneImageOptionInput[],
): ToneImageOption[] {
  const optionsByAssetId = new Map<AssetId, ToneImageOption>();

  for (const option of options) {
    if (option.assetId == null) {
      continue;
    }

    const existing = optionsByAssetId.get(option.assetId);
    if (existing == null) {
      optionsByAssetId.set(option.assetId, {
        assetId: option.assetId,
        tones: [option.tone],
        locationLabels: [option.locationLabel],
      });
      continue;
    }

    if (!existing.tones.includes(option.tone)) {
      existing.tones.push(option.tone);
    }
    if (!existing.locationLabels.includes(option.locationLabel)) {
      existing.locationLabels.push(option.locationLabel);
    }
  }

  return Array.from(optionsByAssetId.values()).sort((a, b) =>
    compareToneList(a.tones, b.tones),
  );
}

function compareToneList(a: readonly string[], b: readonly string[]) {
  return (a[0] ?? ``).localeCompare(b[0] ?? ``);
}

const toneImageCardClass = tv({
  base: `w-36 gap-2 rounded-xl border p-2`,
  variants: {
    isSelected: {
      true: `border-cyan bg-cyan/10`,
      false: `border-fg-bg10 bg-fg-bg5`,
    },
  },
});
