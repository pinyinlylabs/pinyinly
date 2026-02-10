import { usePinyinSoundGroups } from "@/client/hooks/usePinyinSoundGroups";
import { useReplicache } from "@/client/hooks/useReplicache";
import { useRizzleQueryPaged } from "@/client/hooks/useRizzleQueryPaged";
import { pinyinSoundsQuery } from "@/client/query";
import { PinyinSoundTile } from "@/client/ui/PinyinSoundTile";
import { Link } from "expo-router";
import { Text, View } from "react-native";

export default function MnemonicsPage() {
  const pinyinSoundGroupsQuery = usePinyinSoundGroups();
  const r = useReplicache();

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
              <Text className="text-lg font-bold text-fg">{name}</Text>
              <Text className="text-fg-dim">({sounds.length})</Text>
              {theme === `` ? null : (
                <Text className="text-fg-dim">{theme}</Text>
              )}
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
