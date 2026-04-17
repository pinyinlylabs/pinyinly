import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { FinalSoundTile } from "@/client/ui/FinalSoundTile";
import { useDb } from "@/client/ui/hooks/useDb";
import { getSettingKeyInfo } from "@/client/ui/hooks/useUserSetting";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import { parseImageCrop } from "@/client/ui/imageCrop";
import { InitialSoundTile } from "@/client/ui/InitialSoundTile";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { ToneSoundTile } from "@/client/ui/ToneSoundTile";
import {
  isFinalSoundId,
  isInitialSoundId,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import {
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupThemeSetting,
  pinyinSoundImageSetting,
  pinyinSoundImageSettingKey,
  pinyinSoundNameSetting,
  pinyinSoundNameSettingKey,
} from "@/data/userSettings";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { Link } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";

export default function SoundsPage() {
  "use memo";
  const pinyinSoundGroupsQuery = usePinyinSoundGroups();
  const chart = loadPylyPinyinChart();
  const db = useDb();

  const nameSettingKeys = useMemo(
    () => chart.soundIds.map((soundId) => pinyinSoundNameSettingKey(soundId)),
    [chart.soundIds],
  );
  const imageSettingKeys = useMemo(
    () => chart.soundIds.map((soundId) => pinyinSoundImageSettingKey(soundId)),
    [chart.soundIds],
  );
  const relevantKeys = useMemo(
    () => [...nameSettingKeys, ...imageSettingKeys],
    [nameSettingKeys, imageSettingKeys],
  );

  const { data: settings } = useLiveQuery(
    (q) =>
      q
        .from({ setting: db.settingCollection })
        .where(({ setting }) => inArray(setting.key, relevantKeys)),
    [db.settingCollection, relevantKeys],
  );

  const settingsByKey = new Map(
    settings.map((setting) => [setting.key, setting.value]),
  );

  const pinyinSounds = new Map(
    chart.soundIds.map((soundId) => {
      const { keyParamMarshaled: nameKeyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundNameSetting,
        { soundId },
      );
      const { keyParamMarshaled: imageKeyParamMarshaled } = getSettingKeyInfo(
        pinyinSoundImageSetting,
        { soundId },
      );
      const nameValueData = pinyinSoundNameSetting.entity.unmarshalValueSafe(
        settingsByKey.get(pinyinSoundNameSettingKey(soundId)) == null
          ? null
          : {
              ...nameKeyParamMarshaled,
              ...settingsByKey.get(pinyinSoundNameSettingKey(soundId)),
            },
      );
      const imageValueData = pinyinSoundImageSetting.entity.unmarshalValueSafe(
        settingsByKey.get(pinyinSoundImageSettingKey(soundId)) == null
          ? null
          : {
              ...imageKeyParamMarshaled,
              ...settingsByKey.get(pinyinSoundImageSettingKey(soundId)),
            },
      );
      const imageId = imageValueData?.imageId ?? null;

      return [
        soundId,
        {
          name: nameValueData?.text ?? null,
          label: chart.soundToCustomLabel[soundId] ?? soundId,
          image:
            imageId == null
              ? null
              : {
                  assetId: imageId,
                  crop: parseImageCrop(imageValueData?.imageCrop),
                  imageWidth: imageValueData?.imageWidth ?? null,
                  imageHeight: imageValueData?.imageHeight ?? null,
                },
        },
      ];
    }),
  );

  return (
    <View className="gap-10">
      <View>
        <Text className="pyly-body-title">Sounds</Text>
        <HeaderTitleProvider.ScrollTrigger title="Sounds" />
      </View>

      {pinyinSoundGroupsQuery.data.map(({ id, sounds }) => {
        return (
          <View key={id} className="gap-4">
            <View className="flex-row items-center gap-2">
              <InlineEditableSettingText
                setting={pinyinSoundGroupNameSetting}
                settingKey={{ soundGroupId: id }}
                placeholder="Group name"
                displayClassName="text-lg font-bold text-fg"
                emptyClassName="text-lg font-bold text-fg/30"
                inputClassName="text-lg font-bold text-fg"
              />
              <Text className="font-sans text-fg-dim">({sounds.length})</Text>
              <InlineEditableSettingText
                setting={pinyinSoundGroupThemeSetting}
                settingKey={{ soundGroupId: id }}
                placeholder="Theme"
                displayClassName="text-fg-dim"
                emptyClassName="text-fg-dim/70"
                inputClassName="text-fg"
              />
            </View>
            <View className="flex-row flex-wrap gap-3.5">
              {sounds.map((soundId) => {
                const sound = pinyinSounds.get(soundId);
                return sound == null ? null : (
                  <Link key={soundId} href={`/sounds/${soundId}`} asChild>
                    {isInitialSoundId(soundId) ? (
                      <InitialSoundTile
                        id={soundId}
                        label={sound.label}
                        name={sound.name}
                        image={sound.image}
                      />
                    ) : isFinalSoundId(soundId) ? (
                      <FinalSoundTile
                        id={soundId}
                        label={sound.label}
                        name={sound.name}
                        image={sound.image}
                      />
                    ) : (
                      <ToneSoundTile
                        id={soundId}
                        label={sound.label}
                        name={sound.name}
                        image={sound.image}
                      />
                    )}
                  </Link>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
