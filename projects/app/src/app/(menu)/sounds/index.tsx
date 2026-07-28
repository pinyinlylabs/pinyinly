import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { FinalSoundTile } from "@/client/ui/FinalSoundTile";
import { usePinyinSoundActors } from "@/client/ui/hooks/usePinyinSoundActors";
import { useDb } from "@/client/ui/hooks/useDb";
import {
  getPinyinSoundLocationDisplaySummary,
  usePinyinSoundLocations,
} from "@/client/ui/hooks/usePinyinSoundLocations";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import { parseImageCrop } from "@/client/ui/imageCrop";
import { InitialSoundTile } from "@/client/ui/InitialSoundTile";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { RectButton } from "@/client/ui/RectButton";
import { ToneSoundTile } from "@/client/ui/ToneSoundTile";
import {
  isFinalSoundId,
  isInitialSoundId,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import {
  pinyinFinalSoundLocationSelectionSetting,
  pinyinSoundActorSelectionSetting,
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
  const actorDirectory = usePinyinSoundActors();
  const placeDirectory = usePinyinSoundLocations();
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
  const finalPlaceSelectionKeys = useMemo(
    () =>
      chart.soundIds
        .filter((soundId) => isFinalSoundId(soundId))
        .map((soundId) =>
          pinyinFinalSoundLocationSelectionSetting.entity.marshalKey({
            soundId,
          }),
        ),
    [chart.soundIds],
  );
  const actorSelectionKeys = useMemo(
    () =>
      chart.soundIds
        .filter((soundId) => isInitialSoundId(soundId))
        .map((soundId) =>
          pinyinSoundActorSelectionSetting.entity.marshalKey({
            soundId,
          }),
        ),
    [chart.soundIds],
  );
  const relevantKeys = useMemo(
    () => [
      ...nameSettingKeys,
      ...imageSettingKeys,
      ...actorSelectionKeys,
      ...finalPlaceSelectionKeys,
    ],
    [
      nameSettingKeys,
      imageSettingKeys,
      actorSelectionKeys,
      finalPlaceSelectionKeys,
    ],
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
      if (isFinalSoundId(soundId)) {
        const placeSelectionValue =
          pinyinFinalSoundLocationSelectionSetting.decode(
            { soundId },
            settingsByKey.get(
              pinyinFinalSoundLocationSelectionSetting.entity.marshalKey({
                soundId,
              }),
            ) ?? null,
          );
        const selectedLocationId = placeSelectionValue?.locationId ?? null;
        const place =
          selectedLocationId == null
            ? null
            : (placeDirectory.locations.find(
                (entry) => entry.locationId === selectedLocationId,
              ) ?? null);
        const placeDisplay =
          place == null ? null : getPinyinSoundLocationDisplaySummary(place);

        return [
          soundId,
          {
            name:
              placeDisplay?.name == null ||
              placeDisplay.name.trim().length === 0
                ? selectedLocationId
                : placeDisplay.name,
            badge: chart.soundToCustomLabel[soundId] ?? soundId,
            image: placeDisplay?.identityImage ?? null,
          },
        ];
      }

      if (isInitialSoundId(soundId)) {
        const selectedActorId =
          actorDirectory.soundActorIdBySoundId.get(soundId) ?? null;
        const selectedActor =
          selectedActorId == null
            ? null
            : (actorDirectory.actors.find(
                (entry) => entry.actorId === selectedActorId,
              ) ?? null);

        return [
          soundId,
          {
            name: selectedActor?.name ?? null,
            badge: chart.soundToCustomLabel[soundId] ?? soundId,
            image: selectedActor?.image ?? null,
          },
        ];
      }

      const nameValueData = pinyinSoundNameSetting.decode(
        { soundId },
        settingsByKey.get(pinyinSoundNameSettingKey(soundId)) ?? null,
      );
      const imageValueData = pinyinSoundImageSetting.decode(
        { soundId },
        settingsByKey.get(pinyinSoundImageSettingKey(soundId)) ?? null,
      );
      const imageId = imageValueData?.imageId ?? null;

      return [
        soundId,
        {
          name: nameValueData?.text ?? null,
          badge: chart.soundToCustomLabel[soundId] ?? soundId,
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
      <Breadcrumbs>
        <Breadcrumbs.Item href="/sounds">Sounds</Breadcrumbs.Item>
      </Breadcrumbs>

      <View>
        <Text className="pyly-body-title">Sounds</Text>
        <HeaderTitleProvider.ScrollTrigger title="Sounds" />
      </View>

      <View className="flex-row flex-wrap gap-2">
        <RectButton href="/actors" variant="outline">
          Actors
        </RectButton>
        <RectButton href="/locations" variant="outline">
          Places
        </RectButton>
      </View>

      {pinyinSoundGroupsQuery.data.map(({ id, sounds }) => {
        const firstSoundId = sounds[0];
        const gridClass =
          firstSoundId != null && isFinalSoundId(firstSoundId)
            ? `grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5`
            : `grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-x-3.5 gap-y-6`;
        return (
          <View key={id} className="gap-4">
            <View className="flex-row items-center gap-2">
              <InlineEditableSettingText
                setting={pinyinSoundGroupNameSetting}
                settingKey={{ soundGroupId: id }}
                placeholder="Group name"
                textClassName="font-sans text-lg font-bold"
              />
              <Text className="font-sans text-fg-dim">({sounds.length})</Text>
              <InlineEditableSettingText
                setting={pinyinSoundGroupThemeSetting}
                settingKey={{ soundGroupId: id }}
                placeholder="Theme"
                textClassName="font-sans text-lg font-bold"
              />
            </View>
            <View className={gridClass}>
              {sounds.map((soundId) => {
                const sound = pinyinSounds.get(soundId);
                return sound == null ? null : (
                  <Link key={soundId} href={`/sounds/${soundId}`} asChild>
                    {isInitialSoundId(soundId) ? (
                      <InitialSoundTile
                        badge={sound.badge}
                        name={sound.name}
                        image={sound.image}
                      />
                    ) : isFinalSoundId(soundId) ? (
                      <FinalSoundTile
                        badge={sound.badge}
                        name={sound.name}
                        image={sound.image}
                      />
                    ) : (
                      <ToneSoundTile
                        soundId={soundId}
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
