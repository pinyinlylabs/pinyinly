import { pinyinSoundsQuery } from "@/client/query";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import { useRizzleQueryPaged } from "@/client/ui/hooks/useRizzleQueryPaged";
import {
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupThemeSetting,
} from "@/client/ui/hooks/useUserSetting";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PinyinSoundTile } from "@/client/ui/PinyinSoundTile";
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function SoundsPage() {
  const pinyinSoundGroupsQuery = usePinyinSoundGroups();
  const r = useRizzle();

  const { data: pinyinSounds } = useRizzleQueryPaged(pinyinSoundsQuery(r));

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
                displayContainerClassName="px-0 py-0"
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
                displayContainerClassName="px-0 py-0"
              />
            </View>
            <View className="flex-row flex-wrap gap-3.5">
              {sounds.map((soundId) => {
                const sound = pinyinSounds?.get(soundId);
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
