import { useLocalQuery } from "@/client/hooks/useLocalQuery";
import { usePinyinSoundGroups } from "@/client/hooks/usePinyinSoundGroups";
import { usePinyinSounds } from "@/client/hooks/usePinyinSounds";
import { useReplicache } from "@/client/hooks/useReplicache";
import { Hhhmark } from "@/client/ui/Hhhmark";
import { RectButton } from "@/client/ui/RectButton";
import type { PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  loadHhhPinyinChart,
} from "@/data/pinyin";
import { loadPinyinSoundNameSuggestions } from "@/dictionary/dictionary";
import { sortComparatorString } from "@/util/collections";
import { nullIfEmpty } from "@/util/unicode";
import { Link, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function MnemonicIdPage() {
  const id = useLocalSearchParams<`/explore/sounds/[id]`>().id as PinyinSoundId;
  const r = useReplicache();
  const chart = loadHhhPinyinChart();

  const soundNameSuggestions = useLocalQuery({
    queryKey: [MnemonicIdPage.name, `themeSuggestions`],
    queryFn: () => loadPinyinSoundNameSuggestions(),
  });

  const pinyinSounds = usePinyinSounds();
  const pinyinSoundGroups = usePinyinSoundGroups();

  const pinyinSoundGroupId = chart.soundGroups.find((g) =>
    g.sounds.includes(id),
  )?.id;

  const pinyinSound = pinyinSounds.data?.get(id);
  const pinyinSoundGroup = pinyinSoundGroups.data?.find(
    (g) => g.id === pinyinSoundGroupId,
  );

  const label = chart.soundToCustomLabel[id] ?? id;

  return (
    <ScrollView
      className="bg-bg"
      contentContainerClassName="max-w-[800px] self-center px-safe-or-4 pb-2 pt-safe-offset-4 px-safe-or-4"
    >
      <View className="mb-5 flex-row items-center gap-4">
        <View className={pinyinPartBox()}>
          <Text className="text-center font-cursive text-2xl text-fg">
            {label}
          </Text>
        </View>
        {nullIfEmpty(pinyinSound?.name) == null ? (
          <Text className="select-none text-3xl text-fg/20">_________</Text>
        ) : (
          <Text className="text-3xl font-bold text-fg">
            {pinyinSound?.name}
          </Text>
        )}
      </View>

      <View className="gap-2">
        <Text className="text-lg text-fg">
          {nullIfEmpty(pinyinSoundGroup?.name) ?? `Untitled group`}:
        </Text>
        <View className="flex-row flex-wrap gap-1">
          {pinyinSoundGroup?.sounds.map((siblingId) => (
            <Link key={siblingId} href={`/explore/sounds/${siblingId}`}>
              <Text className={siblingId === id ? `text-fg` : `text-fg/50`}>
                {pinyinSounds.data?.get(siblingId)?.label}
              </Text>
            </Link>
          ))}
        </View>

        <View>
          <Text className="hhh-body-title">Pronunciation</Text>

          <Text className="hhh-body">
            <Hhhmark
              source={defaultPinyinSoundInstructions[id] ?? ``}
              context={`body`}
            />
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-1">
          <Text className="hhh-body-title">Names</Text>
        </View>

        <View className="gap-2">
          {soundNameSuggestions.data == null ? (
            <Text className="text-fg">null</Text>
          ) : (
            [...soundNameSuggestions.data.entries()]
              .flatMap(([theme, namesBySoundId]) => {
                const names = namesBySoundId.get(id);
                return names ? ([[theme, names]] as const) : [];
              })
              .sort(
                // Put the current theme at the top.
                sortComparatorString(
                  ([theme]) =>
                    `${theme === pinyinSoundGroup?.theme ? 0 : 1}-${theme}`,
                ),
              )
              .map(([theme, names]) => (
                <View key={theme}>
                  <Text className="hhh-body-heading">
                    {theme}
                    {theme === pinyinSoundGroup?.theme ? (
                      ` ✅`
                    ) : (
                      <RectButton
                        onPress={() => {
                          if (pinyinSoundGroup?.id != null) {
                            void r.mutate.setPinyinSoundGroupTheme({
                              soundGroupId: pinyinSoundGroup.id,
                              theme,
                              now: new Date(),
                            });
                          }
                        }}
                        variant="bare"
                      >
                        Use theme
                      </RectButton>
                    )}
                  </Text>
                  {[...names.entries()].map(([name, nameDescription], i) => (
                    <View key={i} className="flex-row items-center gap-2">
                      <Text
                        className={`
                          text-caption

                          hover:text-fg
                        `}
                        onPress={() => {
                          void r.mutate.setPinyinSoundName({
                            soundId: id,
                            name,
                            now: new Date(),
                          });
                        }}
                      >
                        Use
                      </Text>
                      <Text className="font-bold text-fg">
                        <Text
                          className={
                            pinyinSound?.name === name
                              ? `text-[green]`
                              : undefined
                          }
                        >
                          {name}
                        </Text>

                        {` `}
                        <Text className="text-sm font-normal text-caption">
                          {nameDescription}
                        </Text>
                      </Text>
                    </View>
                  ))}
                </View>
              ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const pinyinPartBox = tv({
  base: `size-20 justify-center gap-1 rounded-xl bg-bg-1 p-2`,
});
