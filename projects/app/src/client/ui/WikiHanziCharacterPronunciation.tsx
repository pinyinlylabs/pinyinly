import { trpc } from "@/client/trpc";
import { usePinyinSoundActors } from "@/client/ui/hooks/usePinyinSoundActors";
import { usePinyinSoundLocations } from "@/client/ui/hooks/usePinyinSoundLocations";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type {
  AssetId,
  HanziText,
  HanziWord,
  PinyinSoundId,
  PinyinUnit,
} from "@/data/model";
import {
  getFinalSoundLabel,
  getInitialSoundLabel,
  isInitialSoundId,
  pinyinUnitId,
  splitPinyinUnit,
} from "@/data/pinyin";
import {
  getToneSoundNameFromSetKey,
  pronunciationMnemonicSpecSetting,
  pronunciationMnemonicImageSetting,
  pronunciationMnemonicTextSetting,
  pinyinSoundLocationSetting,
  pinyinSoundImageSetting,
  pinyinSoundNameTextSetting,
  pinyinSoundLocationSetKeySetting,
  pronunciationMnemonicSelectedSetting,
} from "@/data/userSettings";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { FramedAssetImage } from "./ImageFrame";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingJson } from "./InlineEditableSettingJson";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { ThreeSplitLinesDown } from "./ThreeSplitLinesDown";
import { ToneLabelText } from "./ToneLabelText";
import { Tooltip } from "./Tooltip";
import { WikiTitledBox } from "./WikiTitledBox";
import { getSharedPrimaryPronunciation } from "./WikiHanziCharacterPronunciation.utils";
import { useDb } from "./hooks/useDb";
import { useHanziPronunciationMnemonicId as useHanziPronunciationMnemonicIds } from "./hooks/useHanziPronunciationMnemonicIds";
import { usePointerHoverCapability } from "./hooks/usePointerHoverCapability";
import { hintFirstLineLength, parseHintText } from "./hintText";
import { parseImageCrop } from "./imageCrop";
import { hanziFromHanziWord } from "@/dictionary";
import { nanoid } from "@/util/nanoid";
import { DropdownMenu2 } from "./DropdownMenu2";
import type { PronunciationMnemonicRecurringPromptAssociationStrategyKind } from "@/util/prompts/pronunciationMnemonicRecurring";

export function WikiHanziCharacterPronunciation({
  hanzi,
}: {
  hanzi: HanziText;
}) {
  const db = useDb();
  const { data: meanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .orderBy(({ entry }) => entry.freq, {
          direction: `desc`,
          nulls: `last`,
        })
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          freq: entry.freq,
          gloss: entry.gloss,
          pos: entry.pos,
          pinyin: entry.pinyin,
        })),
    [db.dictionarySearch, hanzi],
  );
  const pronunciation = getSharedPrimaryPronunciation(meanings);
  const firstMeaning = meanings[0];

  if (pronunciation == null || firstMeaning == null) {
    return null;
  }

  const gloss = firstMeaning.gloss[0];

  if (gloss == null) {
    return null;
  }

  return (
    <WikiHanziCharacterPronunciationBox
      hanziWord={firstMeaning.hanziWord}
      pinyinUnit={pronunciation.pinyinUnit}
    />
  );
}

export function WikiHanziCharacterPronunciationBox({
  hanziWord,
  pinyinUnit,
}: {
  hanziWord: HanziWord;
  pinyinUnit: PinyinUnit;
}) {
  const hanzi = hanziFromHanziWord(hanziWord);
  const splitPinyin = splitPinyinUnit(pinyinUnit);

  const initialPinyinSound = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameTextSetting,
          key: { soundId: splitPinyin.initialSoundId },
        },
  );
  const finalPlaceSelectionSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundLocationSetting,
          key: { soundId: splitPinyin.finalSoundId },
        },
  );
  const toneSetKeySetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundLocationSetKeySetting,
          key: { soundId: splitPinyin.toneSoundId },
        },
  );
  const placeDirectory = usePinyinSoundLocations();
  const actorDirectory = usePinyinSoundActors();
  const initialPinyinSoundName = initialPinyinSound?.value?.text;
  const tonePinyinSoundName =
    splitPinyin == null
      ? null
      : getToneSoundNameFromSetKey(
          splitPinyin.toneSoundId,
          toneSetKeySetting?.value?.setKey,
        );
  const selectedInitialActorId =
    splitPinyin == null
      ? null
      : (actorDirectory.soundActorIdBySoundId.get(splitPinyin.initialSoundId) ??
        null);
  const selectedInitialActor =
    selectedInitialActorId == null
      ? null
      : (actorDirectory.actors.find(
          (entry) => entry.actorId === selectedInitialActorId,
        ) ?? null);
  const selectedFinalLocationId =
    finalPlaceSelectionSetting?.value?.locationId ?? null;
  const selectedFinalLocation =
    selectedFinalLocationId == null
      ? null
      : (placeDirectory.locations.find(
          (place) => place.locationId === selectedFinalLocationId,
        ) ?? null);

  const initialLabel = getInitialSoundLabel(pinyinUnit);
  const finalLabel = getFinalSoundLabel(pinyinUnit);

  const finalLocationName = selectedFinalLocation?.name ?? null;
  const pronunciationMnemonicIds = useHanziPronunciationMnemonicIds(
    hanzi,
    pinyinUnit,
  );
  const mnemonicSettingKey =
    pronunciationMnemonicIds.selectedId == null
      ? null
      : {
          hanzi,
          pinyin: pinyinUnitId(pinyinUnit),
          mnemonicId: pronunciationMnemonicIds.selectedId,
        };
  const mnemonicImageSetting = useUserSetting(
    mnemonicSettingKey == null
      ? null
      : {
          setting: pronunciationMnemonicImageSetting,
          key: mnemonicSettingKey,
        },
  );
  const mnemonicTextSetting = useUserSetting(
    mnemonicSettingKey == null
      ? null
      : {
          setting: pronunciationMnemonicTextSetting,
          key: mnemonicSettingKey,
        },
  );

  const hasMnemonicContent =
    (mnemonicTextSetting?.value?.text ?? ``).trim().length > 0;

  const [isEditMode, setIsEditMode] = useState(false);
  const [showMnemonicEditor, setShowMnemonicEditor] = useState<boolean | null>(
    null,
  );
  const [showImageEditor, setShowImageEditor] = useState<boolean | null>(null);
  const enqueuePronunciationRecurringHintMutation =
    trpc.ai.enqueuePronunciationRecurringHint.useMutation();

  const mnemonicImage = mnemonicImageSetting?.value;
  const hasImageContent = mnemonicImage?.imageId != null;
  const isHintSectionVisible = isEditMode
    ? (showMnemonicEditor ?? hasMnemonicContent)
    : hasMnemonicContent;
  const isImageSectionVisible = isEditMode
    ? (showImageEditor ?? hasImageContent)
    : hasImageContent;

  const handleEditingChange = (editing: boolean) => {
    setIsEditMode(editing);
  };
  const selectedMnemonicSetting = useUserSetting({
    setting: pronunciationMnemonicSelectedSetting,
    key: {
      hanzi,
      pinyin: pinyinUnitId(pinyinUnit),
    },
  });

  const handleUseAi = (
    associationStrategy: PronunciationMnemonicRecurringPromptAssociationStrategyKind,
  ) => {
    if (selectedInitialActorId != null && selectedFinalLocationId != null) {
      const mnemonicId = nanoid();
      selectedMnemonicSetting.setValue({
        hanzi,
        pinyin: pinyinUnitId(pinyinUnit),
        mnemonicId: mnemonicId,
      });
      enqueuePronunciationRecurringHintMutation.mutate({
        hanziWord,
        mnemonicId,
        associationStrategy,
      });
    }
  };

  return (
    <WikiTitledBox
      title="Remember the pronunciation"
      onEditingChange={handleEditingChange}
      bottomCaption={`Using a story can create a memorable association between the meaning and the pronunciation that you can use until you’ve memorized it.`}
    >
      {splitPinyin == null ? null : (
        <View className="gap-4 p-4 py-10">
          <View className="">
            <Text className="text-center font-sans text-2xl font-normal">
              <Text className="pyly-bold">{pinyinUnit}</Text>
            </Text>
            <View className="px-[15%] py-2">
              <ThreeSplitLinesDown className="h-[10px] w-full" />
            </View>
            <View className="flex-row gap-4">
              <View className="flex-1 items-center gap-1 border-fg/10">
                <SoundLinkBlock
                  soundId={splitPinyin.initialSoundId}
                  href={`/sounds/${splitPinyin.initialSoundId}`}
                  label={initialLabel}
                  name={
                    initialPinyinSoundName ?? selectedInitialActor?.name ?? null
                  }
                  imageOverride={selectedInitialActor?.image ?? null}
                />
              </View>
              <View className="flex-1 items-center gap-1 border-fg/10">
                <SoundLinkBlock
                  soundId={splitPinyin.finalSoundId}
                  href={`/sounds/${splitPinyin.finalSoundId}`}
                  label={finalLabel}
                  name={finalLocationName}
                />
              </View>
              <View className="flex-1 items-center gap-1 border-fg/10">
                <SoundLinkBlock
                  soundId={splitPinyin.toneSoundId}
                  href={`/sounds/${splitPinyin.toneSoundId}`}
                  label={<ToneLabelText tone={splitPinyin.tone} />}
                  name={tonePinyinSoundName ?? null}
                />
              </View>
            </View>
          </View>
        </View>
      )}

      {isHintSectionVisible || isImageSectionVisible || isEditMode ? (
        <View className="bg-black/10">
          {isHintSectionVisible && mnemonicSettingKey != null ? (
            <View className={`px-7 py-4`}>
              <InlineEditableSettingText
                readonly={!isEditMode}
                setting={pronunciationMnemonicTextSetting}
                settingKey={mnemonicSettingKey}
                placeholder="Add a hint on the first line. Add details after a blank line."
                multiline
                maxLength={80}
                showCounterAtRatio={0.8}
                counterLength={hintFirstLineLength}
                overLimitMessage="Keep the first line under 80 characters. Add details after a blank line."
                renderDisplay={(value) => (
                  <MergedHintDisplay value={value} hanzi={hanzi} />
                )}
                onSaveValue={(nextHintText) => {
                  const nextHintTextLength = nextHintText?.length ?? 0;
                  if (nextHintTextLength === 0) {
                    setShowMnemonicEditor(false);
                  } else {
                    setShowMnemonicEditor(true);
                  }
                }}
              />
            </View>
          ) : null}

          {isImageSectionVisible && mnemonicSettingKey != null ? (
            isEditMode ? (
              <View className="gap-2 pt-2">
                <InlineEditableSettingImage
                  setting={pronunciationMnemonicImageSetting}
                  settingKey={mnemonicSettingKey}
                  previewHeight={200}
                  tileSize={64}
                  enableAiGeneration
                  aspectRatio="16:9"
                  onUploadError={(error) => {
                    console.error(`Upload error:`, error);
                  }}
                  onChangeImageId={(nextImageId) => {
                    if (nextImageId == null) {
                      setShowImageEditor(false);
                    } else {
                      setShowImageEditor(true);
                    }
                  }}
                />
              </View>
            ) : mnemonicImage?.imageId == null ? null : (
              <InlineEditableSettingImage
                readonly
                setting={pronunciationMnemonicImageSetting}
                settingKey={mnemonicSettingKey}
                previewHeight={200}
                aspectRatio={`5:4`}
              />
            )
          ) : null}

          {isEditMode ? (
            <View className="flex-row items-start gap-4 p-4">
              {isHintSectionVisible ? null : (
                <RectButton
                  variant="bare"
                  iconStart="keyboard"
                  iconSize={20}
                  className="opacity-80"
                  onPress={() => {
                    setShowMnemonicEditor(true);
                  }}
                >
                  Add hint
                </RectButton>
              )}
              {isImageSectionVisible ? null : (
                <RectButton
                  variant="bare"
                  iconStart="photos-filled"
                  iconSize={20}
                  className="opacity-80"
                  onPress={() => {
                    setShowImageEditor(true);
                  }}
                >
                  Add image
                </RectButton>
              )}
              {__DEV__ ? (
                <DropdownMenu2>
                  <DropdownMenu2.Trigger asChild>
                    <RectButton
                      variant="bare"
                      iconStart="ai"
                      iconSize={20}
                      className="opacity-80"
                      onPress={() => {
                        if (
                          selectedInitialActorId != null &&
                          selectedFinalLocationId != null
                        ) {
                          const mnemonicId = nanoid();
                          selectedMnemonicSetting.setValue({
                            hanzi,
                            pinyin: pinyinUnitId(pinyinUnit),
                            mnemonicId: mnemonicId,
                          });
                          enqueuePronunciationRecurringHintMutation.mutate({
                            hanziWord,
                            mnemonicId,
                          });
                        }
                      }}
                    >
                      Use AI
                    </RectButton>
                  </DropdownMenu2.Trigger>
                  <DropdownMenu2.Content
                    sideOffset={2}
                    className="w-56"
                    align="start"
                  >
                    <DropdownMenu2.Item
                      onPress={() => {
                        handleUseAi(`identityBinding`);
                      }}
                    >
                      <Text>Identity binding</Text>
                    </DropdownMenu2.Item>
                    <DropdownMenu2.Item
                      onPress={() => {
                        handleUseAi(`environmentRule`);
                      }}
                    >
                      <Text>Environment rule</Text>
                    </DropdownMenu2.Item>
                    <DropdownMenu2.Item
                      onPress={() => {
                        handleUseAi(`objectBinding`);
                      }}
                    >
                      <Text>Object binding</Text>
                    </DropdownMenu2.Item>
                    <DropdownMenu2.Item
                      onPress={() => {
                        handleUseAi(`behaviourConsequence`);
                      }}
                    >
                      <Text>Behaviour consequence</Text>
                    </DropdownMenu2.Item>
                  </DropdownMenu2.Content>
                </DropdownMenu2>
              ) : null}
              {pronunciationMnemonicIds.allIds.length < 2 ? null : (
                <RectButton
                  variant="bare"
                  iconStart="shuffle"
                  onPress={() => {
                    const { allIds: mnemonicIds, selectedId: mnemonicId } =
                      pronunciationMnemonicIds;
                    if (mnemonicIds.length < 2) {
                      return;
                    }

                    const currentIndex =
                      mnemonicId == null
                        ? null
                        : mnemonicIds.indexOf(mnemonicId);
                    const nextIndex =
                      currentIndex == null || currentIndex < 0
                        ? 0
                        : (currentIndex + 1) % mnemonicIds.length;
                    const nextMnemonicId = mnemonicIds[nextIndex];
                    if (nextMnemonicId == null) {
                      return;
                    }

                    selectedMnemonicSetting.setValue({
                      hanzi,
                      pinyin: pinyinUnitId(pinyinUnit),
                      mnemonicId: nextMnemonicId,
                    });
                  }}
                >
                  Shuffle
                </RectButton>
              )}
            </View>
          ) : null}
          {isEditMode && mnemonicSettingKey != null ? (
            <View className="gap-2 p-4">
              <Text className="pyly-body-caption text-xs font-semibold text-fg-dim uppercase">
                Mnemonic spec
              </Text>
              <InlineEditableSettingJson
                setting={pronunciationMnemonicSpecSetting}
                settingKey={mnemonicSettingKey}
                readonly={!isEditMode}
                placeholder='{"story": "A chef juggling cans"}'
                emptyStateText="No mnemonic spec JSON"
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </WikiTitledBox>
  );
}

function MergedHintDisplay({
  value,
  hanzi,
}: {
  value: string;
  hanzi: HanziText;
}) {
  const parsed = parseHintText(value);

  if (parsed.hint.length === 0 && parsed.description == null) {
    return null;
  }

  return (
    <Text className="pyly-body my-2 leading-6">
      <Text className="font-medium">
        <Pylymark source={parsed.hint} highlightToken={hanzi} />
      </Text>
      {parsed.description == null ? null : (
        <Text className="mt-3 block text-sm text-fg-dim">
          <Pylymark source={parsed.description} highlightToken={hanzi} />
        </Text>
      )}
    </Text>
  );
}

export function SoundLinkBlock({
  soundId,
  href,
  label,
  name,
  imageOverride,
}: {
  soundId: PinyinSoundId;
  href: Href;
  label: ReactNode;
  name: string | null;
  imageOverride?: {
    assetId: AssetId;
    crop: ReturnType<typeof parseImageCrop>;
    imageWidth: number | null;
    imageHeight: number | null;
  } | null;
}) {
  const soundImageSetting = useUserSetting({
    setting: pinyinSoundImageSetting,
    key: { soundId },
  });
  const isPointerHoverCapable = usePointerHoverCapability();
  const soundImage = soundImageSetting.value;
  const soundImageCrop = parseImageCrop(soundImage?.imageCrop);
  const resolvedImage =
    imageOverride ??
    (soundImage?.imageId == null
      ? null
      : {
          assetId: soundImage.imageId,
          crop: soundImageCrop,
          imageWidth: soundImage.imageWidth ?? null,
          imageHeight: soundImage.imageHeight ?? null,
        });
  const frameShape = isInitialSoundId(soundId) ? `circle` : `rect`;

  const nameLink = (
    <Link href={href} className={soundNameClass()}>
      {name}
    </Link>
  );

  return (
    <View className="w-full items-center gap-1">
      <Link href={href} className={soundNameClass({ className: `text-fg/50` })}>
        {label}
      </Link>
      {name == null ? null : (
        <>
          <DownArrow />
          {!isPointerHoverCapable || resolvedImage == null ? (
            nameLink
          ) : (
            <Tooltip placement="top" sideOffset={6}>
              <Tooltip.Trigger asChild>
                <Pressable>{nameLink}</Pressable>
              </Tooltip.Trigger>
              <Tooltip.Content className="p-1">
                <View
                  className={`
                    size-20 overflow-hidden bg-fg-bg5

                    ${frameShape === `circle` ? `rounded-full` : `rounded-md`}
                  `}
                >
                  <FramedAssetImage
                    assetId={resolvedImage.assetId}
                    crop={resolvedImage.crop}
                    imageWidth={resolvedImage.imageWidth}
                    imageHeight={resolvedImage.imageHeight}
                    frameShape={frameShape}
                    className="size-full"
                  />
                </View>
              </Tooltip.Content>
            </Tooltip>
          )}
        </>
      )}
    </View>
  );
}

const soundNameClass = tv({
  base: `pyly-body pyly-ref`,
});

function DownArrow() {
  return <Text className="pyly-body h-6 text-fg/40">↓</Text>;
}
