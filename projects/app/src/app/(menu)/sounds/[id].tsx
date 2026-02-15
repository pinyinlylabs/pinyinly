import { useDb } from "@/client/ui/hooks/useDb";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import {
  pinyinSoundGroupThemeSettingKey,
  pinyinSoundNameSetting,
  pinyinSoundNameSettingKey,
  useUserSetting,
} from "@/client/ui/hooks/useUserSetting";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { Pylymark } from "@/client/ui/Pylymark";
import { RectButton } from "@/client/ui/RectButton";
import type { PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { loadPinyinSoundNameSuggestions } from "@/dictionary";
import { nullIfEmpty } from "@/util/unicode";
import { sortComparatorString } from "@pinyinly/lib/collections";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { Link, useLocalSearchParams } from "expo-router";
import { use, useMemo } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SoundIdPage() {
  "use memo";
  "mySoundIdPage";
  const id = useLocalSearchParams<`/sounds/[id]`>().id as PinyinSoundId;
  const r = useRizzle();
  const chart = loadPylyPinyinChart();
  const db = useDb();

  const soundNameSuggestions = use(loadPinyinSoundNameSuggestions());

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
  const pinyinSoundGroups = usePinyinSoundGroups();
  const { setValue: setSoundName } = useUserSetting(pinyinSoundNameSetting, {
    soundId: id,
  });

  const pinyinSoundGroupId = chart.soundGroups.find((g) =>
    g.sounds.includes(id),
  )?.id;

  const pinyinSound = pinyinSounds.get(id);
  const pinyinSoundGroup = pinyinSoundGroups.data?.find(
    (g) => g.id === pinyinSoundGroupId,
  );

  const label = chart.soundToCustomLabel[id] ?? id;

  return (
    <View className="w-full max-w-[800px] self-center pb-2 pt-safe-offset-4 px-safe-or-4">
      <View className="mb-5 flex-row items-center gap-4">
        <View className={pinyinPartBox()}>
          <Text className="text-center font-cursive text-2xl text-fg">
            {label}
          </Text>
        </View>
        <InlineEditableSettingText
          variant="title"
          setting={pinyinSoundNameSetting}
          settingKey={{ soundId: id }}
          placeholder="Name this sound"
        />
      </View>

      <View className="gap-2">
        <Text className="text-lg text-fg">
          {nullIfEmpty(pinyinSoundGroup?.name) ?? `Untitled group`}:
        </Text>
        <View className="flex-row flex-wrap gap-1">
          {pinyinSoundGroup?.sounds.map((siblingId) => (
            <Link key={siblingId} href={`/sounds/${siblingId}`}>
              <Text className={siblingId === id ? `text-fg` : `text-fg/50`}>
                {pinyinSounds.get(siblingId)?.label}
              </Text>
            </Link>
          ))}
        </View>

        <View>
          <Text className="pyly-body-title">Pronunciation</Text>

          <Text className="pyly-body">
            <Pylymark source={defaultPinyinSoundInstructions[id] ?? ``} />
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-1">
          <Text className="pyly-body-title">Names</Text>
        </View>

        <View className="gap-2">
          {[...soundNameSuggestions.entries()]
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
                <Text className="pyly-body-heading">
                  {theme}
                  {theme === pinyinSoundGroup?.theme ? (
                    ` ✅`
                  ) : (
                    <RectButton
                      onPress={() => {
                        if (pinyinSoundGroup?.id != null) {
                          void r.mutate.setSetting({
                            key: pinyinSoundGroupThemeSettingKey(
                              pinyinSoundGroup.id,
                            ),
                            value: { t: theme },
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
                        text-fg-dim

                        hover:text-fg
                      `}
                      onPress={() => {
                        setSoundName({ soundId: id, text: name });
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
                      <Text className="text-sm font-normal text-fg-dim">
                        {nameDescription}
                      </Text>
                    </Text>
                  </View>
                ))}
              </View>
            ))}
        </View>
      </View>
    </View>
  );
}

const pinyinPartBox = tv({
  base: `size-20 justify-center gap-1 rounded-xl bg-bg-high p-2`,
});
