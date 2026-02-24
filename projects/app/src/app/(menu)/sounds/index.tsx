import { useDb } from "@/client/ui/hooks/useDb";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import {
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupThemeSetting,
  pinyinSoundImageSettingKey,
  pinyinSoundNameSettingKey,
} from "@/client/ui/hooks/useUserSetting";
import { parseImageCrop } from "@/client/ui/imageCrop";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PinyinSoundTile } from "@/client/ui/PinyinSoundTile";
import type { AssetId } from "@/data/model";
import { loadPylyPinyinChart } from "@/data/pinyin";
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
    settings.map((setting) => [
      setting.key,
      // TODO: get rid of this unsafe casting
      setting.value as {
        t?: AssetId;
        c?: unknown;
        w?: number;
        ht?: number;
      } | null,
    ]),
  );

  const pinyinSounds = new Map(
    chart.soundIds.map((soundId) => {
      const nameValueData = settingsByKey.get(
        pinyinSoundNameSettingKey(soundId),
      )?.t;
      const imageValueData = settingsByKey.get(
        pinyinSoundImageSettingKey(soundId),
      );
      const imageId = imageValueData?.t ?? null;

      return [
        soundId,
        {
          name: nameValueData ?? null,
          label: chart.soundToCustomLabel[soundId] ?? soundId,
          image:
            imageId == null
              ? null
              : {
                  assetId: imageId,
                  crop: parseImageCrop(imageValueData?.c),
                  imageWidth: imageValueData?.w ?? null,
                  imageHeight: imageValueData?.ht ?? null,
                },
        },
      ];
    }),
  );

  return (
    <View className="gap-10">
      <View>
        <Text className="pyly-body-title">Sounds</Text>
      </View>

      {pinyinSoundGroupsQuery.data?.map(({ id, name, theme, sounds }) => {
        return (
          <View key={id} className="gap-4">
            <View className="flex-row items-center gap-2">
              <InlineEditableSettingText
                setting={pinyinSoundGroupNameSetting}
                settingKey={{ soundGroupId: id }}
                placeholder="Group name"
                defaultValue={name}
                displayClassName="text-lg font-bold text-fg"
                emptyClassName="text-lg font-bold text-fg/30"
                inputClassName="text-lg font-bold text-fg"
              />
              <Text className="text-fg-dim">({sounds.length})</Text>
              <InlineEditableSettingText
                setting={pinyinSoundGroupThemeSetting}
                settingKey={{ soundGroupId: id }}
                placeholder="Theme"
                defaultValue={theme}
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
                    <PinyinSoundTile
                      id={soundId}
                      label={sound.label}
                      name={sound.name}
                      image={sound.image}
                    />
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
