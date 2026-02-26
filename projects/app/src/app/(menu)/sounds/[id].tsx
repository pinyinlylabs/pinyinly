import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { FloatingMenuModal } from "@/client/ui/FloatingMenuModal";
import { useDb } from "@/client/ui/hooks/useDb";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import { useRizzle } from "@/client/ui/hooks/useRizzle";
import {
  pinyinSoundDescriptionSetting,
  pinyinSoundGroupNameSetting,
  pinyinSoundGroupThemeSettingKey,
  pinyinSoundImageSetting,
  pinyinSoundNameSetting,
  pinyinSoundNameSettingKey,
  useUserSetting,
} from "@/client/ui/hooks/useUserSetting";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PinyinFinalToneEditor } from "@/client/ui/PinyinFinalToneEditor";
import { PinyinSoundNameText } from "@/client/ui/PinyinSoundNameText";
import { Pylymark } from "@/client/ui/Pylymark";
import { RectButton } from "@/client/ui/RectButton";
import { SettingText } from "@/client/ui/SettingText";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import type { PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  getPinyinSoundLabel,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { loadPinyinSoundNameSuggestions } from "@/dictionary";
import { sortComparatorString } from "@pinyinly/lib/collections";
import { inArray, useLiveQuery } from "@tanstack/react-db";
import { useLocalSearchParams } from "expo-router";
import { use, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SoundIdPage() {
  "use memo";
  const { id: rawId, tone: rawTone } = useLocalSearchParams<
    `/sounds/[id]` & { tone?: string }
  >();
  const id = rawId as PinyinSoundId;
  const focusedTone = typeof rawTone === `string` ? rawTone : null;
  const r = useRizzle();
  const chart = loadPylyPinyinChart();
  const db = useDb();

  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);
  const [toneAnchorY, setToneAnchorY] = useState<number | null>(null);

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

  const label = getPinyinSoundLabel(id, chart);

  useEffect(() => {
    if (focusedTone == null || toneAnchorY == null || hasScrolledRef.current) {
      return;
    }

    scrollRef.current?.scrollTo({
      y: Math.max(0, toneAnchorY - 24),
      animated: true,
    });
    hasScrolledRef.current = true;
  }, [focusedTone, toneAnchorY]);

  return (
    <ScrollView ref={scrollRef}>
      <View className="w-full max-w-[800px] self-center pb-2 pt-safe-offset-4 px-safe-or-4">
        <Breadcrumb pinyinSoundId={id} />

        <View className="my-5 flex-row items-center gap-4">
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

        <View className="gap-10">
          <WikiTitledBox title="Pronunciation">
            <View className="gap-4 p-4">
              <Text className="pyly-body">
                <Pylymark source={defaultPinyinSoundInstructions[id] ?? ``} />
              </Text>
            </View>
          </WikiTitledBox>

          <WikiTitledBox title="Mnemonic story role">
            <View className="gap-4 p-4">
              <InlineEditableSettingText
                setting={pinyinSoundDescriptionSetting}
                settingKey={{ soundId: id }}
                placeholder="Add a description to help with mnemonic generation…"
                multiline
              />
              <InlineEditableSettingImage
                setting={pinyinSoundImageSetting}
                settingKey={{ soundId: id }}
                previewHeight={200}
                tileSize={64}
                enablePasteDropZone
                frameConstraint={{ aspectRatio: 1 }}
              />
            </View>
          </WikiTitledBox>

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

        {/* Final-tone details editor for finals */}
        {id.startsWith(`-`) && (
          <PinyinFinalToneEditor
            finalSoundId={id}
            focusedTone={focusedTone}
            onToneLayout={(tone, layoutY) => {
              if (tone !== focusedTone) {
                return;
              }
              setToneAnchorY(layoutY);
            }}
          />
        )}
      </View>
    </ScrollView>
  );
}

const pinyinPartBox = tv({
  base: `size-20 justify-center gap-1 rounded-xl bg-bg-high p-2`,
});

function Breadcrumb({ pinyinSoundId }: { pinyinSoundId: PinyinSoundId }) {
  const chart = loadPylyPinyinChart();
  const pinyinSoundGroups = usePinyinSoundGroups();

  const pinyinSoundGroupId = useMemo(
    () => chart.soundGroups.find((g) => g.sounds.includes(pinyinSoundId))?.id,
    [chart, pinyinSoundId],
  );

  const pinyinSoundGroup = pinyinSoundGroups.data?.find(
    (g) => g.id === pinyinSoundGroupId,
  );

  return (
    <View className="flex-row items-center gap-1">
      <RectButton href="/sounds" variant="bare2" iconSize={20}>
        Sounds
      </RectButton>
      {pinyinSoundGroupId == null ? null : (
        <>
          <Text className="text-fg-dim">/</Text>
          <RectButton href="/sounds" variant="bare2" iconSize={20}>
            <SettingText
              setting={pinyinSoundGroupNameSetting}
              settingKey={{ soundGroupId: pinyinSoundGroupId }}
            />
          </RectButton>
        </>
      )}
      <Text className="text-fg-dim">/</Text>
      {pinyinSoundGroup == null ? (
        <RectButton variant="bare2">
          <PinyinSoundNameText pinyinSoundId={pinyinSoundId} />
        </RectButton>
      ) : (
        <FloatingMenuModal
          menu={
            <SiblingSoundMenu
              sounds={pinyinSoundGroup?.sounds}
              currentSoundId={pinyinSoundId}
            />
          }
        >
          <RectButton iconEnd="chevron-up-down" variant="bare2" iconSize={16}>
            <PinyinSoundNameText pinyinSoundId={pinyinSoundId} />
          </RectButton>
        </FloatingMenuModal>
      )}
    </View>
  );
}

function SiblingSoundMenu({
  sounds,
  currentSoundId,
  onRequestClose,
}: {
  sounds: readonly PinyinSoundId[];
  currentSoundId: PinyinSoundId;
} & FloatingMenuModalMenuProps) {
  return (
    <View className="max-h-60 items-start overflow-y-scroll rounded-xl bg-bg-high p-3">
      {sounds.map((soundId) => (
        <RectButton
          key={soundId}
          href={`/sounds/${soundId}`}
          variant="bare2"
          onPress={onRequestClose}
          iconEnd={soundId === currentSoundId ? `check` : undefined}
          iconSize={16}
        >
          <PinyinSoundNameText pinyinSoundId={soundId} />
        </RectButton>
      ))}
    </View>
  );
}
