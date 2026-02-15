import { useDb } from "@/client/ui/hooks/useDb";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import {
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupThemeSetting,
  pinyinSoundNameSettingKey,
} from "@/client/ui/hooks/useUserSetting";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PinyinSoundTile } from "@/client/ui/PinyinSoundTile";
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

  const relevantKeys = useMemo(
    () => chart.soundIds.map((soundId) => pinyinSoundNameSettingKey(soundId)),
    [chart],
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
      setting.value as { t?: string } | null,
    ]),
  );

  const pinyinSounds = new Map(
    chart.soundIds.map((soundId) => {
      const nameValueData = settingsByKey.get(
        pinyinSoundNameSettingKey(soundId),
      )?.t;

      return [
        soundId,
        {
          name: nameValueData ?? null,
          label: chart.soundToCustomLabel[soundId] ?? soundId,
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
