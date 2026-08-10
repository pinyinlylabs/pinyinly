import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { CompactWordRows } from "@/client/ui/CompactWordRows";
import { DropdownMenu } from "@/client/ui/DropdownMenu";
import { InitialSoundTile } from "@/client/ui/InitialSoundTile";
import { FinalSoundTile } from "@/client/ui/FinalSoundTile";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { usePinyinSoundActors } from "@/client/ui/hooks/usePinyinSoundActors";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import type { PinyinSoundLocationThoughtChainType } from "@/client/ui/hooks/usePinyinSoundLocations";
import {
  getPinyinSoundLocationDisplaySummary,
  usePinyinSoundLocations,
} from "@/client/ui/hooks/usePinyinSoundLocations";
import { useSoundEffect } from "@/client/ui/hooks/useSoundEffect";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PinyinFinalToneEditor } from "@/client/ui/PinyinFinalToneEditor";
import { PinyinSoundNameText } from "@/client/ui/PinyinSoundNameText";
import { Pylymark } from "@/client/ui/Pylymark";
import { RectButton } from "@/client/ui/RectButton";
import { SettingText } from "@/client/ui/SettingText";
import { SoundNameEditModal } from "@/client/ui/SoundNameEditModal";
import { useDb } from "@/client/ui/hooks/useDb";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { pickSoundUsageExamplesForEntries } from "@/client/ui/soundUsageExamples";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import type { LocationSetKey, PinyinSoundId } from "@/data/model";
import { locationSetKeys } from "@/data/model";
import {
  isToneSoundId,
  defaultPinyinSoundExamples,
  defaultPinyinSoundInstructions,
  getPinyinSoundLabel,
  isFinalSoundId,
  isInitialOrFinalSoundId,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { getAudioSourcesByPinyinMap } from "@/data/pinyinSoundAudio";
import {
  getEffectiveToneSetKeyForSoundId,
  getLocationSetKeyDisplayName,
  getToneSoundNameFromSetKey,
  pinyinSoundLocationSetting,
  pinyinSoundGroupNameTextSetting,
  pinyinSoundNameTextSetting,
  pinyinSoundLocationSetKeySetting,
} from "@/data/userSettings";
import { and, eq, gte, inArray, useLiveQuery } from "@tanstack/react-db";
import { Link, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { intersperse } from "@/client/react";

function getThoughtChainPreviewsForSound(
  location: {
    thoughtChainsBySoundId: Record<
      string,
      PinyinSoundLocationThoughtChainType[]
    >;
  },
  soundId: PinyinSoundId,
): { chain: string[]; score: number }[] {
  if (!isFinalSoundId(soundId)) {
    return [];
  }

  const thoughtChains = location.thoughtChainsBySoundId[soundId] ?? [];

  return [...thoughtChains]
    .sort((left, right) => right.score - left.score)
    .map((thoughtChain) => {
      return {
        chain: thoughtChain.path.map((step) => step.anchor),
        score: thoughtChain.score,
      };
    });
}

export default function SoundIdPage() {
  const { id: rawId } = useLocalSearchParams<`/sounds/[id]`>();
  const id = rawId as PinyinSoundId;
  const chart = loadPylyPinyinChart();
  const isToneSound = isToneSoundId(id);
  const isFinalSound = isFinalSoundId(id);
  const placeDirectory = usePinyinSoundLocations();
  const toneSetKeySetting = useUserSetting(
    isToneSound
      ? {
          setting: pinyinSoundLocationSetKeySetting,
          key: { soundId: id },
        }
      : null,
  );
  const selectedToneSetKey = getEffectiveToneSetKeyForSoundId(
    id,
    toneSetKeySetting?.value?.setKey,
  );
  const toneSoundName = getToneSoundNameFromSetKey(
    id,
    toneSetKeySetting?.value?.setKey,
  );
  const hasCustomToneSetKey = toneSetKeySetting?.value != null;
  const finalPlaceSelectionSetting = useUserSetting(
    isFinalSound
      ? {
          setting: pinyinSoundLocationSetting,
          key: { soundId: id },
        }
      : null,
  );
  const selectedFinalLocationId =
    finalPlaceSelectionSetting?.value?.locationId ?? null;
  const selectedFinalLocation =
    selectedFinalLocationId == null
      ? null
      : (placeDirectory.locations.find(
          (place) => place.locationId === selectedFinalLocationId,
        ) ?? null);
  const selectedFinalPlaceDisplay =
    selectedFinalLocation == null
      ? null
      : getPinyinSoundLocationDisplaySummary(selectedFinalLocation);
  const finalDisplayName =
    selectedFinalPlaceDisplay?.name == null ||
    selectedFinalPlaceDisplay.name.trim().length === 0
      ? null
      : selectedFinalPlaceDisplay.name;

  const [isEditSoundNameModalOpen, setIsEditSoundNameModalOpen] =
    useState(false);

  const label = getPinyinSoundLabel(id, chart);
  const examplePinyins = defaultPinyinSoundExamples[id] ?? [];
  const audioSourcesByPinyinMap = getAudioSourcesByPinyinMap();
  let soundAudioSource = null;
  for (const examplePinyin of examplePinyins) {
    const audioSources = audioSourcesByPinyinMap.get(examplePinyin);
    if (audioSources?.[0] != null) {
      soundAudioSource = audioSources[0];
      break;
    }
  }

  const playSound = useSoundEffect(soundAudioSource);

  return (
    <View className="w-full self-center pt-safe px-safe pb-2">
      <Breadcrumb pinyinSoundId={id} />

      <HeaderTitleProvider.ScrollTrigger title={label} />

      <View className="my-5 flex-row items-center gap-4">
        <View className={pinyinPartBox()}>
          <Text className="text-center font-cursive text-2xl text-fg">
            {label}
          </Text>
          {soundAudioSource == null ? null : (
            <RectButton
              variant="bare"
              iconStart="speaker-2"
              onPressIn={playSound}
            />
          )}
        </View>
        {isToneSound ? (
          <Text className="pyly-ref pyly-body-subheading text-fg">
            {toneSoundName ?? `Select a set key below`}
          </Text>
        ) : (
          <InlineEditableSettingText
            textClassName="pyly-body-title"
            setting={pinyinSoundNameTextSetting}
            settingKey={{ soundId: id }}
            placeholder="Name this sound"
            readonly={isFinalSound}
            renderDisplay={() => {
              if (!isFinalSound) {
                return null;
              }

              return (
                <Text className="pyly-ref pyly-body-subheading text-fg">
                  {finalDisplayName ?? `Select a location below`}
                </Text>
              );
            }}
          />
        )}

        {isFinalSound || isToneSound ? null : (
          <RectButton
            onPress={() => {
              setIsEditSoundNameModalOpen(true);
            }}
            variant="bare"
            iconStart="pencil"
          />
        )}
      </View>

      {examplePinyins.length === 0 ? null : (
        <View className="my-5 flex-row items-center gap-4">
          <Text className="pyly-body text-fg-dim">
            Example pinyin: {examplePinyins.join(`, `)}
          </Text>
        </View>
      )}

      <View className="gap-10">
        <WikiTitledBox title="Pronunciation">
          <View className="gap-4 p-4">
            <Text className="pyly-body">
              <Pylymark source={defaultPinyinSoundInstructions[id] ?? ``} />
            </Text>
          </View>
        </WikiTitledBox>

        <MnemonicStoryRoleSection pinyinSoundId={id} />

        {isToneSound && selectedToneSetKey != null ? (
          <ToneSetKeySection
            soundId={id}
            selectedSetKey={selectedToneSetKey}
            hasCustomValue={hasCustomToneSetKey}
            onSelectSetKey={(setKey) => {
              toneSetKeySetting?.setValue({
                soundId: id,
                setKey,
              });
            }}
            onReset={() => {
              toneSetKeySetting?.setValue(null);
            }}
          />
        ) : null}

        {isFinalSound && <PinyinFinalToneEditor finalSoundId={id} />}
      </View>

      <SoundUsageExamplesSection pinyinSoundId={id} />

      {isFinalSound || isToneSound ? null : (
        <SoundNameEditModal
          soundId={id}
          isOpen={isEditSoundNameModalOpen}
          onClose={() => {
            setIsEditSoundNameModalOpen(false);
          }}
        />
      )}
    </View>
  );
}

function MnemonicStoryRoleSection({
  pinyinSoundId,
}: {
  pinyinSoundId: PinyinSoundId;
}) {
  const db = useDb();
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSelectActorOpen, setIsSelectActorOpen] = useState(false);
  const actorDirectory = usePinyinSoundActors();
  const placeDirectory = usePinyinSoundLocations();
  const isFinalSound = isFinalSoundId(pinyinSoundId);
  const finalSoundIds = loadPylyPinyinChart().soundIds.filter((soundId) =>
    isFinalSoundId(soundId),
  );
  const finalLocationSelectionKeysCsv = finalSoundIds
    .map((soundId) => pinyinSoundLocationSetting.entity.marshalKey({ soundId }))
    .join(`,`);
  const { data: finalLocationSelectionSettings } = useLiveQuery(
    (q) =>
      q
        .from({ setting: db.settingCollection })
        .where(({ setting }) =>
          inArray(setting.key, finalLocationSelectionKeysCsv.split(`,`)),
        ),
    [db.settingCollection, finalLocationSelectionKeysCsv],
  );
  const finalPlaceSelectionSetting = useUserSetting(
    isFinalSound
      ? {
          setting: pinyinSoundLocationSetting,
          key: { soundId: pinyinSoundId },
        }
      : null,
  );
  const selectedActorId =
    actorDirectory.soundActorIdBySoundId.get(pinyinSoundId) ?? null;
  const selectedActor =
    selectedActorId == null
      ? null
      : (actorDirectory.actors.find(
          (entry) => entry.actorId === selectedActorId,
        ) ?? null);
  const selectedLocationId =
    finalPlaceSelectionSetting?.value?.locationId ?? null;
  const selectedLocation =
    selectedLocationId == null
      ? null
      : (placeDirectory.locations.find(
          (place) => place.locationId === selectedLocationId,
        ) ?? null);
  const selectedPlaceDisplay =
    selectedLocation == null
      ? null
      : getPinyinSoundLocationDisplaySummary(selectedLocation);
  const finalLocationSelectionByKey = new Map(
    finalLocationSelectionSettings.map((setting) => [
      setting.key,
      setting.value,
    ]),
  );
  const locationUsageByLocationId = new Map<string, PinyinSoundId[]>();

  for (const soundId of finalSoundIds) {
    const settingValue =
      finalLocationSelectionByKey.get(
        pinyinSoundLocationSetting.entity.marshalKey({ soundId }),
      ) ?? null;
    const decoded = pinyinSoundLocationSetting.decode(
      { soundId },
      settingValue,
    );
    const locationId = decoded?.locationId;
    if (locationId == null) {
      continue;
    }

    const existing = locationUsageByLocationId.get(locationId) ?? [];
    locationUsageByLocationId.set(locationId, [...existing, soundId]);
  }

  const availableLocations = placeDirectory.locations.filter((location) => {
    if (selectedLocationId === location.locationId) {
      return true;
    }

    const usedBy = locationUsageByLocationId.get(location.locationId) ?? [];
    const usedByOtherSoundIds = usedBy.filter(
      (soundId) => soundId !== pinyinSoundId,
    );
    return usedByOtherSoundIds.length === 0;
  });

  const unavailableLocations = placeDirectory.locations.filter((location) => {
    if (selectedLocationId === location.locationId) {
      return false;
    }

    const usedBy = locationUsageByLocationId.get(location.locationId) ?? [];
    const usedByOtherSoundIds = usedBy.filter(
      (soundId) => soundId !== pinyinSoundId,
    );
    return usedByOtherSoundIds.length > 0;
  });

  const handleEditingChange = (editing: boolean) => {
    setIsEditMode(editing);
  };

  const hasMnemonicContent = isFinalSound
    ? selectedLocation != null
    : selectedActor != null;

  return (
    <WikiTitledBox
      title="Mnemonic identity"
      onEditingChange={handleEditingChange}
    >
      <View className="gap-4 p-4">
        {!isEditMode && !hasMnemonicContent ? (
          <Text className="pyly-body text-fg-dim">
            {isFinalSound
              ? `No location selected yet.`
              : `No actor selected yet.`}
          </Text>
        ) : isFinalSound ? (
          <>
            {selectedLocation == null ? (
              <Text className="pyly-body text-fg-dim">
                No location selected yet.
              </Text>
            ) : (
              <>
                {selectedLocation.description == null ||
                selectedLocation.description.trim().length === 0 ? null : (
                  <Text className="pyly-body text-fg-dim">
                    {selectedLocation.description}
                  </Text>
                )}
                <View className="flex-row flex-wrap gap-2">
                  <Link
                    href={`/locations/${selectedLocation.locationId}`}
                    asChild
                  >
                    <FinalSoundTile
                      name={
                        selectedPlaceDisplay?.name == null ||
                        selectedPlaceDisplay.name.trim().length === 0
                          ? selectedLocation.locationId
                          : selectedPlaceDisplay.name
                      }
                      image={selectedPlaceDisplay?.identityImage ?? null}
                      className="max-w-[220px]"
                    />
                  </Link>
                  {isEditMode ? (
                    <RectButton
                      variant="bareDim"
                      onPress={() => {
                        finalPlaceSelectionSetting?.setValue(null);
                        setIsSelectActorOpen(false);
                      }}
                    >
                      Clear selection
                    </RectButton>
                  ) : null}
                </View>
              </>
            )}

            {isEditMode ? (
              <View className="gap-2 rounded-lg border border-fg/10 bg-bg-high p-3">
                <View className="flex-row flex-wrap gap-2">
                  <RectButton
                    variant="option"
                    onPress={() => {
                      setIsSelectActorOpen((value) => !value);
                    }}
                  >
                    {isSelectActorOpen
                      ? `Hide place list`
                      : `Choose from directory`}
                  </RectButton>
                </View>

                {isSelectActorOpen ? (
                  placeDirectory.locations.length === 0 ? (
                    <Text className="pyly-body-caption text-fg-dim">
                      No places in your directory yet. Create one in Places
                      first.
                    </Text>
                  ) : (
                    <View className="gap-2">
                      {availableLocations.map((location) => {
                        const locationName =
                          location.name == null ||
                          location.name.trim().length === 0
                            ? location.locationId
                            : location.name;
                        const isActiveLocation =
                          selectedLocationId === location.locationId;
                        const thoughtChainPreviews =
                          getThoughtChainPreviewsForSound(
                            location,
                            pinyinSoundId,
                          );

                        return (
                          <Pressable
                            key={location.locationId}
                            onPress={() => {
                              finalPlaceSelectionSetting?.setValue({
                                soundId: pinyinSoundId,
                                locationId: location.locationId,
                              });
                              setIsSelectActorOpen(false);
                            }}
                            className="
                              rounded-lg border border-fg/10 bg-bg px-3 py-2

                              active:opacity-80
                            "
                          >
                            <View className="flex-row items-center justify-between gap-3">
                              <Text className="pyly-body text-fg">
                                {locationName}
                              </Text>
                              {isActiveLocation ? (
                                <Text className="pyly-body-caption font-semibold text-fg/80">
                                  ✓ Active
                                </Text>
                              ) : null}
                            </View>
                            {thoughtChainPreviews.length === 0 ? null : (
                              <View className="mt-1 gap-1">
                                {thoughtChainPreviews.map((preview, index) => {
                                  return (
                                    <Text
                                      key={`${location.locationId}-${index}`}
                                      className={`pyly-body-caption text-fg-dim`}
                                    >
                                      {intersperse(
                                        preview.chain.map((step, i) => (
                                          <Text
                                            key={i}
                                            className={[
                                              i === 1 ? `` : ``,
                                              i === 1 && index === 0
                                                ? `text-fg/80 font-semibold`
                                                : ``,
                                            ].join(` `)}
                                          >
                                            {step}
                                          </Text>
                                        )),
                                        <Text> → </Text>,
                                      )}
                                      {` `}
                                      <Text className="text-fg-dim/50">
                                        ({preview.score}%)
                                      </Text>
                                    </Text>
                                  );
                                })}
                              </View>
                            )}
                          </Pressable>
                        );
                      })}

                      {unavailableLocations.length === 0 ? null : (
                        <View className="mt-3 gap-2 border-t border-fg/10 pt-3">
                          <Text
                            className="
                              pyly-body-caption font-semibold tracking-wide text-fg-dim uppercase
                            "
                          >
                            Unavailable
                          </Text>
                          {unavailableLocations.map((location) => {
                            const locationName =
                              location.name == null ||
                              location.name.trim().length === 0
                                ? location.locationId
                                : location.name;
                            const usedBy =
                              locationUsageByLocationId.get(
                                location.locationId,
                              ) ?? [];
                            const usedByOtherSoundIds = usedBy.filter(
                              (soundId) => soundId !== pinyinSoundId,
                            );

                            return (
                              <View
                                key={`unavailable-${location.locationId}`}
                                className="
                                  rounded-lg border border-fg/10 bg-bg px-3 py-2 opacity-70
                                "
                              >
                                <Text className="pyly-body text-fg">
                                  {locationName}
                                </Text>
                                <Text className="pyly-body-caption text-fg-dim">
                                  In use by: {usedByOtherSoundIds.join(`, `)}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  )
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <>
            {selectedActor == null ? (
              <Text className="pyly-body text-fg-dim">
                No actor selected yet.
              </Text>
            ) : (
              <>
                <View className="flex-row flex-wrap items-center gap-2">
                  <Link href={`/actors/${selectedActor.actorId}`} asChild>
                    <InitialSoundTile
                      name={selectedActor.name}
                      image={selectedActor.image}
                      className="max-w-[220px]"
                    />
                  </Link>
                  {isEditMode ? (
                    <RectButton
                      variant="bareDim"
                      onPress={() => {
                        actorDirectory.setSoundActorId(pinyinSoundId, null);
                      }}
                    >
                      Clear selection
                    </RectButton>
                  ) : null}
                </View>

                {selectedActor.description == null ||
                selectedActor.description.trim().length === 0 ? null : (
                  <Text className="pyly-body text-fg-dim">
                    {selectedActor.description}
                  </Text>
                )}
              </>
            )}

            {isEditMode ? (
              <View className="gap-2 rounded-lg border border-fg/10 bg-bg-high p-3">
                <View className="flex-row flex-wrap gap-2">
                  <RectButton
                    variant="option"
                    onPress={() => {
                      setIsSelectActorOpen((value) => !value);
                    }}
                  >
                    {isSelectActorOpen
                      ? `Hide actor list`
                      : `Choose from directory`}
                  </RectButton>
                </View>

                {isSelectActorOpen ? (
                  actorDirectory.actors.length === 0 ? (
                    <Text className="pyly-body-caption text-fg-dim">
                      No actors in your directory yet. Create one in Actors
                      first.
                    </Text>
                  ) : (
                    <View className="gap-2">
                      {actorDirectory.actors.map((actor) => (
                        <RectButton
                          key={actor.actorId}
                          variant="bareDim"
                          onPress={() => {
                            actorDirectory.setSoundActorId(
                              pinyinSoundId,
                              actor.actorId,
                            );
                            setIsSelectActorOpen(false);
                          }}
                        >
                          {actor.name == null || actor.name.trim().length === 0
                            ? actor.actorId
                            : actor.name}
                        </RectButton>
                      ))}
                    </View>
                  )
                ) : null}
              </View>
            ) : null}
          </>
        )}
      </View>
    </WikiTitledBox>
  );
}

function SoundUsageExamplesSection({
  pinyinSoundId,
}: {
  pinyinSoundId: PinyinSoundId;
}) {
  const db = useDb();
  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) =>
          and(eq(entry.hanziCharacterCount, 1), gte(entry.glossCount, 1)),
        )
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          hanzi: entry.hanzi,
          gloss: entry.gloss,
          glossCount: entry.glossCount,
          pinyin: entry.pinyin,
          hsk: entry.hsk,
        })),
    [db.dictionarySearch],
  );
  const usageExamples = pickSoundUsageExamplesForEntries({
    allEntries: dictionarySearchEntries,
    limit: 5,
    soundId: pinyinSoundId,
  });

  if (!isInitialOrFinalSoundId(pinyinSoundId)) {
    return null;
  }

  return usageExamples.length === 0 ? null : (
    <WikiTitledBox title="Usage examples" className="mt-10">
      <View className="p-4">
        <CompactWordRows
          dictionarySearchEntries={usageExamples.map((entry) => ({
            ...entry,
            pinyin: entry.pinyin ?? null,
            hsk: entry.hsk ?? null,
          }))}
        />
      </View>
    </WikiTitledBox>
  );
}

function Breadcrumb({ pinyinSoundId }: { pinyinSoundId: PinyinSoundId }) {
  const chart = loadPylyPinyinChart();
  const pinyinSoundGroups = usePinyinSoundGroups();
  const pinyinSoundGroupId =
    chart.soundGroups.find((g) => g.sounds.includes(pinyinSoundId))?.id ?? null;

  const pinyinSoundGroup = pinyinSoundGroups.data.find(
    (g) => g.id === pinyinSoundGroupId,
  );

  return (
    <Breadcrumbs>
      <Breadcrumbs.Item href="/sounds">Sounds</Breadcrumbs.Item>

      {pinyinSoundGroupId == null ? null : (
        <Breadcrumbs.Item href="/sounds">
          <SettingText
            setting={pinyinSoundGroupNameTextSetting}
            settingKey={{ soundGroupId: pinyinSoundGroupId }}
          />
        </Breadcrumbs.Item>
      )}

      {pinyinSoundGroup == null ? (
        <Breadcrumbs.Item>
          <PinyinSoundNameText pinyinSoundId={pinyinSoundId} />
        </Breadcrumbs.Item>
      ) : (
        <Breadcrumbs.Item
          menu={
            <SiblingSoundMenu
              sounds={pinyinSoundGroup.sounds}
              currentSoundId={pinyinSoundId}
            />
          }
        >
          <PinyinSoundNameText pinyinSoundId={pinyinSoundId} />
        </Breadcrumbs.Item>
      )}
    </Breadcrumbs>
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
    <DropdownMenu.Content
      className="max-h-60 items-start overflow-y-scroll"
      onRequestClose={onRequestClose}
    >
      {sounds.map((soundId) => (
        <DropdownMenu.Item
          key={soundId}
          href={`/sounds/${soundId}`}
          iconEnd={soundId === currentSoundId ? `check` : undefined}
          iconSize={16}
        >
          <PinyinSoundNameText pinyinSoundId={soundId} />
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  );
}

function ToneSetKeySection({
  soundId,
  selectedSetKey,
  hasCustomValue,
  onSelectSetKey,
  onReset,
}: {
  soundId: PinyinSoundId;
  selectedSetKey: LocationSetKey;
  hasCustomValue: boolean;
  onSelectSetKey: (setKey: LocationSetKey) => void;
  onReset: () => void;
}) {
  return (
    <WikiTitledBox title="Tone location set key">
      <View className="gap-3 p-4">
        <Text className="pyly-body text-fg-dim">
          Tone {soundId} uses the{` `}
          <Text className="pyly-bold">
            {getLocationSetKeyDisplayName(selectedSetKey)}
          </Text>
          {` `}
          set for pronunciation mnemonics.
        </Text>

        <View className="flex-row flex-wrap gap-2">
          {locationSetKeys.map((setKey) => {
            const isActive = setKey === selectedSetKey;
            return (
              <RectButton
                key={setKey}
                variant={isActive ? `filled` : `option`}
                onPress={() => {
                  onSelectSetKey(setKey);
                }}
              >
                {getLocationSetKeyDisplayName(setKey)}
              </RectButton>
            );
          })}
        </View>

        {hasCustomValue ? (
          <RectButton variant="bareDim" onPress={onReset}>
            Reset to default
          </RectButton>
        ) : (
          <Text className="pyly-body-caption text-fg-dim">
            Using default mapping.
          </Text>
        )}
      </View>
    </WikiTitledBox>
  );
}

const pinyinPartBox = tv({
  base: `size-20 justify-center gap-1 rounded-xl bg-bg-high p-2`,
});
