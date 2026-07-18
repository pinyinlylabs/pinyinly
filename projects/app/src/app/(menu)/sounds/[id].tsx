import type { FloatingMenuModalMenuProps } from "@/client/ui/FloatingMenuModal";
import { AiLeadCharacterDescriptionModal } from "@/client/ui/AiLeadCharacterDescriptionModal";
import { Breadcrumbs } from "@/client/ui/Breadcrumbs";
import { CompactWordRows } from "@/client/ui/CompactWordRows";
import { DropdownMenu } from "@/client/ui/DropdownMenu";
import { FinalSoundTile } from "@/client/ui/FinalSoundTile";
import { HeaderTitleProvider } from "@/client/ui/HeaderTitleProvider";
import { usePinyinSoundActors } from "@/client/ui/hooks/usePinyinSoundActors";
import type { SaveActorToDirectoryTarget } from "@/client/ui/hooks/usePinyinSoundActors";
import { usePinyinSoundGroups } from "@/client/ui/hooks/usePinyinSoundGroups";
import {
  getPinyinSoundPlaceDisplaySummary,
  usePinyinSoundPlaces,
} from "@/client/ui/hooks/usePinyinSoundPlaces";
import { useSoundEffect } from "@/client/ui/hooks/useSoundEffect";
import { InlineEditableSettingImage } from "@/client/ui/InlineEditableSettingImage";
import { InlineEditableSettingText } from "@/client/ui/InlineEditableSettingText";
import { PinyinFinalToneEditor } from "@/client/ui/PinyinFinalToneEditor";
import { PinyinSoundNameText } from "@/client/ui/PinyinSoundNameText";
import { Pylymark } from "@/client/ui/Pylymark";
import { RectButton } from "@/client/ui/RectButton";
import { SettingText } from "@/client/ui/SettingText";
import { SoundNameEditModal } from "@/client/ui/SoundNameEditModal";
import { TextInputMulti } from "@/client/ui/TextInputMulti";
import { useDb } from "@/client/ui/hooks/useDb";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { pickSoundUsageExamplesForEntries } from "@/client/ui/soundUsageExamples";
import { WikiTitledBox } from "@/client/ui/WikiTitledBox";
import type { PinyinSoundId } from "@/data/model";
import {
  defaultPinyinSoundExamples,
  defaultPinyinSoundInstructions,
  getPinyinSoundLabel,
  isFinalSoundId,
  isInitialSoundId,
  isInitialOrFinalSoundId,
  loadPylyPinyinChart,
} from "@/data/pinyin";
import { getAudioSourcesByPinyinMap } from "@/data/pinyinSoundAudio";
import {
  pinyinFinalSoundPlaceSelectionSetting,
  pinyinSoundDescriptionSetting,
  pinyinSoundGroupNameSetting,
  pinyinSoundImageSetting,
  pinyinSoundMnemonicIdentitySetting,
  pinyinSoundModelSheetImageSetting,
  pinyinSoundNameSetting,
} from "@/data/userSettings";
import { and, eq, gte, useLiveQuery } from "@tanstack/react-db";
import { Link, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { tv } from "tailwind-variants";

export default function SoundIdPage() {
  const { id: rawId } = useLocalSearchParams<`/sounds/[id]`>();
  const id = rawId as PinyinSoundId;
  const chart = loadPylyPinyinChart();
  const isFinalSound = isFinalSoundId(id);
  const placeDirectory = usePinyinSoundPlaces();
  const finalPlaceSelectionSetting = useUserSetting(
    isFinalSound
      ? {
          setting: pinyinFinalSoundPlaceSelectionSetting,
          key: { soundId: id },
        }
      : null,
  );
  const selectedFinalPlaceId =
    finalPlaceSelectionSetting?.value?.placeId ?? null;
  const selectedFinalPlace =
    selectedFinalPlaceId == null
      ? null
      : (placeDirectory.places.find(
          (place) => place.placeId === selectedFinalPlaceId,
        ) ?? null);
  const selectedFinalPlaceDisplay =
    selectedFinalPlace == null
      ? null
      : getPinyinSoundPlaceDisplaySummary(selectedFinalPlace);
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
        <InlineEditableSettingText
          variant="title"
          setting={pinyinSoundNameSetting}
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

        {isFinalSound ? null : (
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

        {/* Final-tone details editor for finals */}
        {isFinalSound && <PinyinFinalToneEditor finalSoundId={id} />}
      </View>

      <SoundUsageExamplesSection pinyinSoundId={id} />

      {isFinalSound ? null : (
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [isSaveToOpen, setIsSaveToOpen] = useState(false);
  const [isSelectPlaceOpen, setIsSelectPlaceOpen] = useState(false);
  const [saveToResult, setSaveToResult] = useState<string | null>(null);
  const [mnemonicIdentityDraft, setMnemonicIdentityDraft] = useState(``);
  const [mnemonicIdentityError, setMnemonicIdentityError] = useState<
    string | null
  >(null);
  const actorDirectory = usePinyinSoundActors();
  const placeDirectory = usePinyinSoundPlaces();
  const isFinalSound = isFinalSoundId(pinyinSoundId);
  const chart = loadPylyPinyinChart();
  const soundLabel = getPinyinSoundLabel(pinyinSoundId, chart);
  const mnemonicDescriptionSetting = useUserSetting({
    setting: pinyinSoundDescriptionSetting,
    key: { soundId: pinyinSoundId },
  });
  const mnemonicImageSetting = useUserSetting({
    setting: pinyinSoundImageSetting,
    key: { soundId: pinyinSoundId },
  });
  const mnemonicIdentitySetting = useUserSetting({
    setting: pinyinSoundMnemonicIdentitySetting,
    key: { soundId: pinyinSoundId },
  });
  const modelSheetImageSetting = useUserSetting({
    setting: pinyinSoundModelSheetImageSetting,
    key: { soundId: pinyinSoundId },
  });
  const characterNameSetting = useUserSetting({
    setting: pinyinSoundNameSetting,
    key: { soundId: pinyinSoundId },
  });
  const finalPlaceSelectionSetting = useUserSetting(
    isFinalSound
      ? {
          setting: pinyinFinalSoundPlaceSelectionSetting,
          key: { soundId: pinyinSoundId },
        }
      : null,
  );
  const selectedPlaceId = finalPlaceSelectionSetting?.value?.placeId ?? null;
  const selectedPlace =
    selectedPlaceId == null
      ? null
      : (placeDirectory.places.find(
          (place) => place.placeId === selectedPlaceId,
        ) ?? null);
  const selectedPlaceDisplay =
    selectedPlace == null
      ? null
      : getPinyinSoundPlaceDisplaySummary(selectedPlace);
  const characterName = characterNameSetting.value?.text ?? soundLabel;
  const hasMnemonicIdentity = hasIdentityContent(
    mnemonicIdentitySetting.value?.mnemonicIdentity,
  );

  const handleEditingChange = (editing: boolean) => {
    setIsEditMode(editing);
    setMnemonicIdentityError(null);
    if (editing) {
      setMnemonicIdentityDraft(
        formatIdentityJson(mnemonicIdentitySetting.value?.mnemonicIdentity),
      );
    }
  };

  const saveMnemonicIdentityDraft = () => {
    const trimmed = mnemonicIdentityDraft.trim();
    if (trimmed.length === 0) {
      mnemonicIdentitySetting.setValue(null);
      setMnemonicIdentityError(null);
      return;
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown;
      mnemonicIdentitySetting.setValue({
        soundId: pinyinSoundId,
        mnemonicIdentity: parsed,
      });
      setMnemonicIdentityDraft(formatIdentityJson(parsed));
      setMnemonicIdentityError(null);
    } catch {
      setMnemonicIdentityError(`Invalid JSON. Fix formatting before saving.`);
    }
  };

  const hasMnemonicContent = isFinalSound
    ? selectedPlace != null
    : (mnemonicDescriptionSetting.value?.text ?? ``).trim().length > 0 ||
      mnemonicImageSetting.value?.imageId != null ||
      modelSheetImageSetting.value?.imageId != null ||
      hasMnemonicIdentity;

  const saveToActorDirectory = (target: SaveActorToDirectoryTarget) => {
    const actorId = actorDirectory.saveActorToDirectory({
      target,
      name: characterNameSetting.value?.text ?? null,
      description: mnemonicDescriptionSetting.value?.text ?? null,
      mnemonicIdentity: mnemonicIdentitySetting.value?.mnemonicIdentity ?? null,
      image:
        mnemonicImageSetting.value == null
          ? null
          : {
              imageId: mnemonicImageSetting.value.imageId,
              imageCrop: mnemonicImageSetting.value.imageCrop ?? null,
              imageWidth: mnemonicImageSetting.value.imageWidth ?? null,
              imageHeight: mnemonicImageSetting.value.imageHeight ?? null,
            },
      modelSheetImage:
        modelSheetImageSetting.value == null
          ? null
          : {
              imageId: modelSheetImageSetting.value.imageId,
              imageCrop: modelSheetImageSetting.value.imageCrop ?? null,
              imageWidth: modelSheetImageSetting.value.imageWidth ?? null,
              imageHeight: modelSheetImageSetting.value.imageHeight ?? null,
            },
      fallbackName: soundLabel,
    });

    setIsSaveToOpen(false);
    setSaveToResult(
      target.kind === `new`
        ? `Saved to new actor ${actorId}.`
        : `Overwrote actor ${actorId}.`,
    );
  };

  return (
    <WikiTitledBox
      title="Mnemonic story role"
      onEditingChange={handleEditingChange}
    >
      <View className="gap-4 p-4">
        {!isEditMode && !hasMnemonicContent ? (
          <Text className="pyly-body text-fg-dim">
            {isFinalSound
              ? `No location selected yet.`
              : `No description, identity, or images`}
          </Text>
        ) : isFinalSound ? (
          <>
            <Text className="pyly-body text-fg-dim">
              Choose one location from your place directory for this final.
            </Text>

            {selectedPlace == null ? (
              <Text className="pyly-body text-fg-dim">
                No location selected yet.
              </Text>
            ) : (
              <View className="gap-2 rounded-lg border border-fg/10 bg-bg-high p-3">
                <Text className="pyly-body-subheading text-fg">
                  {selectedPlaceDisplay?.name == null ||
                  selectedPlaceDisplay.name.trim().length === 0
                    ? selectedPlace.placeId
                    : selectedPlaceDisplay.name}
                </Text>
                {selectedPlace.description == null ||
                selectedPlace.description.trim().length === 0 ? null : (
                  <Text className="pyly-body text-fg-dim">
                    {selectedPlace.description}
                  </Text>
                )}
                <View className="flex-row flex-wrap gap-2">
                  <Link href={`/places/${selectedPlace.placeId}`} asChild>
                    <FinalSoundTile
                      name={
                        selectedPlaceDisplay?.name == null ||
                        selectedPlaceDisplay.name.trim().length === 0
                          ? selectedPlace.placeId
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
                        setIsSelectPlaceOpen(false);
                      }}
                    >
                      Clear selection
                    </RectButton>
                  ) : null}
                </View>
              </View>
            )}

            {isEditMode ? (
              <View className="gap-2 rounded-lg border border-fg/10 bg-bg-high p-3">
                <View className="flex-row flex-wrap gap-2">
                  <RectButton
                    variant="option"
                    onPress={() => {
                      setIsSelectPlaceOpen((value) => !value);
                    }}
                  >
                    {isSelectPlaceOpen
                      ? `Hide place list`
                      : `Choose from directory`}
                  </RectButton>
                </View>

                {isSelectPlaceOpen ? (
                  placeDirectory.places.length === 0 ? (
                    <Text className="pyly-body-caption text-fg-dim">
                      No places in your directory yet. Create one in Places
                      first.
                    </Text>
                  ) : (
                    <View className="gap-2">
                      {placeDirectory.places.map((place) => (
                        <RectButton
                          key={place.placeId}
                          variant="bareDim"
                          onPress={() => {
                            finalPlaceSelectionSetting?.setValue({
                              soundId: pinyinSoundId,
                              placeId: place.placeId,
                            });
                            setIsSelectPlaceOpen(false);
                          }}
                        >
                          {place.name == null || place.name.trim().length === 0
                            ? place.placeId
                            : place.name}
                        </RectButton>
                      ))}
                    </View>
                  )
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <View className="gap-2">
              <InlineEditableSettingText
                setting={pinyinSoundDescriptionSetting}
                settingKey={{ soundId: pinyinSoundId }}
                placeholder="Add a description to help with mnemonic generation…"
                readonly={!isEditMode}
                multiline
              />
              {isEditMode ? (
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-[13px] text-fg-dim">
                    Need a reusable mnemonic actor profile?
                  </Text>
                  <RectButton
                    variant="bare"
                    onPress={() => {
                      setShowAiModal(true);
                    }}
                  >
                    Use AI
                  </RectButton>
                </View>
              ) : null}
              {isEditMode ? (
                <View className="gap-2 rounded-lg border border-fg/10 bg-bg-high p-3">
                  <Text className="pyly-body-caption text-fg-dim">
                    Actor directory
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    <RectButton
                      variant="option"
                      onPress={() => {
                        setIsSaveToOpen((value) => !value);
                      }}
                    >
                      Save to…
                    </RectButton>
                  </View>

                  {isSaveToOpen ? (
                    <View className="gap-2">
                      <RectButton
                        variant="option"
                        onPress={() => {
                          saveToActorDirectory({ kind: `new` });
                        }}
                      >
                        Create new actor
                      </RectButton>

                      {actorDirectory.actors.length === 0 ? (
                        <Text className="pyly-body-caption text-fg-dim">
                          No existing actors to overwrite yet.
                        </Text>
                      ) : (
                        actorDirectory.actors.map((actor) => (
                          <RectButton
                            key={actor.actorId}
                            variant="bareDim"
                            onPress={() => {
                              saveToActorDirectory({
                                kind: `existing`,
                                actorId: actor.actorId,
                              });
                            }}
                          >
                            Overwrite{` `}
                            {actor.name == null ||
                            actor.name.trim().length === 0
                              ? actor.actorId
                              : actor.name}
                          </RectButton>
                        ))
                      )}
                    </View>
                  ) : null}

                  {saveToResult == null ? null : (
                    <Text className="pyly-body-caption text-fg-dim">
                      {saveToResult}
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
            <View className="gap-2">
              <Text className="pyly-body-caption text-fg-dim">
                Avatar image
              </Text>
              <InlineEditableSettingImage
                setting={pinyinSoundImageSetting}
                settingKey={{ soundId: pinyinSoundId }}
                readonly={!isEditMode}
                enableAiGeneration
                previewHeight={200}
                tileSize={64}
                frameShape={isInitialSoundId(pinyinSoundId) ? `circle` : `rect`}
                aspectRatio={isInitialSoundId(pinyinSoundId) ? `1:1` : `16:9`}
              />
            </View>
            <View className="gap-2">
              <Text className="pyly-body-caption text-fg-dim">
                Model sheet image
              </Text>
              <InlineEditableSettingImage
                setting={pinyinSoundModelSheetImageSetting}
                settingKey={{ soundId: pinyinSoundId }}
                readonly={!isEditMode}
                previewHeight={220}
                tileSize={64}
                enableAiGeneration
                frameShape="rect"
                aspectRatio="16:9"
              />
            </View>
            <View className="gap-2 rounded-lg border border-fg/10 bg-bg-high p-3">
              <Text className="pyly-body-caption text-fg-dim">
                Mnemonic identity (JSON)
              </Text>
              {isEditMode ? (
                <>
                  <TextInputMulti
                    variant="bare"
                    placeholder='{"traits": ["curious"]}'
                    autoResizeMinHeight={100}
                    value={mnemonicIdentityDraft}
                    onChangeText={(value) => {
                      setMnemonicIdentityDraft(value);
                      if (mnemonicIdentityError != null) {
                        setMnemonicIdentityError(null);
                      }
                    }}
                    className={`
                      min-h-24 rounded-md border border-fg/15 bg-bg px-3 py-2 font-mono text-[12px]
                    `}
                  />
                  <View className="flex-row flex-wrap gap-2">
                    <RectButton
                      variant="option"
                      onPress={saveMnemonicIdentityDraft}
                    >
                      Save mnemonic identity JSON
                    </RectButton>
                    <RectButton
                      variant="bareDim"
                      onPress={() => {
                        setMnemonicIdentityDraft(``);
                        mnemonicIdentitySetting.setValue(null);
                        setMnemonicIdentityError(null);
                      }}
                    >
                      Clear identity
                    </RectButton>
                  </View>
                  {mnemonicIdentityError == null ? (
                    <Text className="pyly-body-caption text-fg-dim">
                      Stored as JSON for future prompt generation.
                    </Text>
                  ) : (
                    <Text className="pyly-body-caption text-danger">
                      {mnemonicIdentityError}
                    </Text>
                  )}
                </>
              ) : hasMnemonicIdentity ? (
                <Text className="font-mono text-[12px] text-fg">
                  {formatIdentityJson(
                    mnemonicIdentitySetting.value?.mnemonicIdentity,
                  )}
                </Text>
              ) : (
                <Text className="pyly-body-caption text-fg-dim">
                  No mnemonic identity JSON
                </Text>
              )}
            </View>
          </>
        )}
      </View>

      {showAiModal && isEditMode && !isFinalSound ? (
        <AiLeadCharacterDescriptionModal
          identity={characterName}
          onApplyActor={(actor) => {
            mnemonicDescriptionSetting.setValue({
              soundId: pinyinSoundId,
              text: actor.summary,
            });
            mnemonicIdentitySetting.setValue({
              soundId: pinyinSoundId,
              mnemonicIdentity: actor,
            });
            setShowAiModal(false);
          }}
          onDismiss={() => {
            setShowAiModal(false);
          }}
        />
      ) : null}
    </WikiTitledBox>
  );
}

function formatIdentityJson(value: unknown): string {
  if (value == null) {
    return ``;
  }

  return JSON.stringify(value, null, 2);
}

function hasIdentityContent(value: unknown): boolean {
  if (value == null) {
    return false;
  }

  if (typeof value === `string`) {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (typeof value === `object`) {
    return Object.keys(value as Record<string, unknown>).length > 0;
  }

  return true;
}

const pinyinPartBox = tv({
  base: `size-20 justify-center gap-1 rounded-xl bg-bg-high p-2`,
});

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

  const pinyinSoundGroupId = useMemo(
    () => chart.soundGroups.find((g) => g.sounds.includes(pinyinSoundId))?.id,
    [chart, pinyinSoundId],
  );

  const pinyinSoundGroup = pinyinSoundGroups.data.find(
    (g) => g.id === pinyinSoundGroupId,
  );

  return (
    <Breadcrumbs>
      <Breadcrumbs.Item href="/sounds">Sounds</Breadcrumbs.Item>

      {pinyinSoundGroupId == null ? null : (
        <Breadcrumbs.Item href="/sounds">
          <SettingText
            setting={pinyinSoundGroupNameSetting}
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
