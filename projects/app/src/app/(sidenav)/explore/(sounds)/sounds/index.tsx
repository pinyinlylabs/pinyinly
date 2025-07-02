import { usePinyinSoundGroups } from "@/client/hooks/usePinyinSoundGroups";
import { usePinyinSounds } from "@/client/hooks/usePinyinSounds";
import { PinyinSoundTile } from "@/client/ui/PinyinSoundTile";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";

export default function MnemonicsPage() {
  const pinyinSoundGroupsQuery = usePinyinSoundGroups();
  const pinyinSoundsQuery = usePinyinSounds();

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="py-safe-offset-4 items-center"
    >
      <View className="max-w-[800px] gap-4 px-safe-or-4">
        <View
          className={`
            gap-2

            lg:px-0
          `}
        >
          <Text className="text-3xl font-bold text-fg">Sounds</Text>
        </View>

        {pinyinSoundGroupsQuery.data?.map(({ id, name, theme, sounds }) => {
          return (
            <View key={id} className="gap-4">
              <View className="flex-row items-center gap-2">
                <Text className="text-lg font-bold text-fg">{name}</Text>
                <Text className="text-caption">({sounds.length})</Text>
                {theme === `` ? null : (
                  <Text className="text-caption">{theme}</Text>
                )}
              </View>
              <View className="flex-row flex-wrap gap-3.5">
                {sounds.map((soundId) => (
                  <Link
                    key={soundId}
                    href={`/explore/sounds/${soundId}`}
                    asChild
                  >
                    <PinyinSoundTile
                      id={soundId}
                      name={
                        pinyinSoundsQuery.data?.get(soundId)?.name ?? undefined
                      }
                    />
                  </Link>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}
