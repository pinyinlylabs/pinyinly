import type { DictionarySearchEntry } from "@/client/query";
import type { LocationSetKey } from "@/client/ui/hooks/usePinyinSoundLocations";
import { usePinyinSoundLocations } from "@/client/ui/hooks/usePinyinSoundLocations";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { HanziText, PinyinSoundId, PinyinUnit } from "@/data/model";
import { PartOfSpeech } from "@/data/model";
import {
    getFinalSoundLabel,
    getInitialSoundLabel,
    isInitialSoundId,
    splitPinyinUnit,
} from "@/data/pinyin";
import {
    hanziPronunciationHintMnemonicSpecSetting,
    hanziPronunciationHintImageSetting,
    hanziPronunciationHintTextSetting,
    pinyinFinalSoundLocationSelectionSetting,
    pinyinSoundDescriptionSetting,
    pinyinSoundImageSetting,
    pinyinSoundNameSetting,
} from "@/data/userSettings";
import { eq, useLiveQuery } from "@tanstack/react-db";
import type { Href } from "expo-router";
import { Link } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { tv } from "tailwind-variants";
import { AiPronunciationHintModal } from "./AiPronunciationHintModal";
import { FramedAssetImage } from "./ImageFrame";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingJson } from "./InlineEditableSettingJson";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { ThreeSplitLinesDown } from "./ThreeSplitLinesDown";
import { ToneLabelText } from "./ToneLabelText";
import { Tooltip } from "./Tooltip";
import { WikiHanziCharacterPronunciationImagePicker } from "./WikiHanziCharacterPronunciationImagePicker";
import { WikiTitledBox } from "./WikiTitledBox";
import { getSharedPrimaryPronunciation } from "./WikiHanziCharacterPronunciation.utils";
import { useDb } from "./hooks/useDb";
import { useHanziPronunciationHint } from "./hooks/useHanziPronunciationHint";
import { usePointerHoverCapability } from "./hooks/usePointerHoverCapability";
import {
    composeHintText,
    hintFirstLineLength,
    parseHintText,
} from "./hintText";
import { parseImageCrop } from "./imageCrop";

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

  const cueMeaning = buildCueMeaningContext({
    cueWord: gloss,
    gloss: firstMeaning.gloss,
    partOfSpeech: firstMeaning.pos,
  });

  return (
    <WikiHanziCharacterPronunciationBox
      gloss={gloss}
      cueMeaning={cueMeaning}
      hanzi={hanzi}
      pinyinUnit={pronunciation.pinyinUnit}
    />
  );
}

export function WikiHanziCharacterPronunciationBox({
  hanzi,
  pinyinUnit,
  gloss,
  cueMeaning,
}: {
  gloss: DictionarySearchEntry[`gloss`][number];
  cueMeaning?: string;
  hanzi: HanziText;
  pinyinUnit: PinyinUnit;
}) {
  const splitPinyin = splitPinyinUnit(pinyinUnit);

  const initialPinyinSound = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameSetting,
          key: { soundId: splitPinyin.initialSoundId },
        },
  );
  const tonePinyinSound = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameSetting,
          key: { soundId: splitPinyin.toneSoundId },
        },
  );
  const initialDescriptionSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundDescriptionSetting,
          key: { soundId: splitPinyin.initialSoundId },
        },
  );
  const finalPlaceSelectionSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalSoundLocationSelectionSetting,
          key: { soundId: splitPinyin.finalSoundId },
        },
  );
  const placeDirectory = usePinyinSoundLocations();
  const initialPinyinSoundName = initialPinyinSound?.value?.text;
  const tonePinyinSoundName = tonePinyinSound?.value?.text;
  const selectedFinalLocationId =
    finalPlaceSelectionSetting?.value?.locationId ?? null;
  const selectedFinalLocation =
    selectedFinalLocationId == null
      ? null
      : (placeDirectory.locations.find(
          (place) => place.locationId === selectedFinalLocationId,
        ) ?? null);

  const initialSoundDescription =
    initialDescriptionSetting?.value?.text ?? null;
  const finalToneLocationDescription =
    selectedFinalLocation?.description ?? null;

  const initialLabel = getInitialSoundLabel(pinyinUnit);
  const finalLabel = getFinalSoundLabel(pinyinUnit);
  const finalToneLocationSetKey = toneToLocationSetKey(splitPinyin?.tone ?? 5);
  const finalToneLocationSetName =
    selectedFinalLocation?.sets[finalToneLocationSetKey].name ?? null;
  const finalToneName =
    finalToneLocationSetName == null ||
    finalToneLocationSetName.trim().length === 0
      ? `Unnamed set`
      : finalToneLocationSetName;
  const finalLocationName = selectedFinalLocation?.name ?? null;
  const pronunciationHint = useHanziPronunciationHint(hanzi, pinyinUnit);
  const hintSettingKey = pronunciationHint.settingKey;
  const hintImageSetting = useUserSetting({
    setting: hanziPronunciationHintImageSetting,
    key: hintSettingKey,
  });
  const [showAiModal, setShowAiModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHintEditor, setShowHintEditor] = useState<boolean | null>(null);
  const [showImageEditor, setShowImageEditor] = useState<boolean | null>(null);

  const hintImage = hintImageSetting.value;
  const hasHintContent = pronunciationHint.hasText;
  const hasImageContent = hintImage?.imageId != null;
  const isHintSectionVisible = isEditMode
    ? (showHintEditor ?? hasHintContent)
    : hasHintContent;
  const isImageSectionVisible = isEditMode
    ? (showImageEditor ?? hasImageContent)
    : hasImageContent;

  const handleEditingChange = (editing: boolean) => {
    setIsEditMode(editing);
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
                  name={initialPinyinSoundName ?? null}
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
      {isEditMode && (!isHintSectionVisible || !isImageSectionVisible) ? (
        <View className="flex-row items-start gap-4 p-4">
          {isHintSectionVisible ? null : (
            <RectButton
              variant="bare"
              iconStart="keyboard"
              iconSize={20}
              className="opacity-80"
              onPress={() => {
                setShowHintEditor(true);
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
        </View>
      ) : null}

      {isHintSectionVisible || isImageSectionVisible ? (
        <View className="gap-4 bg-black/10 pt-4">
          {isHintSectionVisible ? (
            <View className={isEditMode ? `gap-2 pl-7` : `gap-1 px-7`}>
              <ExperimentalContent hanzi={hanzi} />

              <InlineEditableSettingText
                readonly={!isEditMode}
                setting={hanziPronunciationHintTextSetting}
                settingKey={hintSettingKey}
                placeholder="Add a hint on the first line. Add details after a blank line."
                multiline
                maxLength={80}
                showCounterAtRatio={0.8}
                counterLength={hintFirstLineLength}
                overLimitMessage="Keep the first line under 80 characters. Add details after a blank line."
                renderDisplay={(value) => <MergedHintDisplay value={value} />}
                onSaveValue={(nextHintText) => {
                  const nextHintTextLength = nextHintText?.length ?? 0;
                  if (nextHintTextLength === 0) {
                    setShowHintEditor(false);
                  } else {
                    setShowHintEditor(true);
                  }
                }}
              />

              {isEditMode ? (
                <View className="flex-row items-center justify-between">
                  <Text className="font-sans text-[13px] text-fg-dim">
                    Want help brainstorming a hint?
                  </Text>
                  <RectButton
                    variant="bare"
                    onPress={() => {
                      setShowAiModal(true);
                    }}
                    disabled={
                      splitPinyin == null || initialPinyinSoundName == null
                    }
                  >
                    Use AI
                  </RectButton>
                </View>
              ) : null}
            </View>
          ) : null}

          {isImageSectionVisible ? (
            isEditMode ? (
              <WikiHanziCharacterPronunciationImagePicker
                gloss={gloss}
                hanzi={hanzi}
                pinyinUnit={pinyinUnit}
                onChangeImageId={(nextImageId) => {
                  if (nextImageId == null) {
                    setShowImageEditor(false);
                  } else {
                    setShowImageEditor(true);
                  }
                }}
              />
            ) : hintImage?.imageId == null ? null : (
              <InlineEditableSettingImage
                readonly
                setting={hanziPronunciationHintImageSetting}
                settingKey={hintSettingKey}
                previewHeight={200}
                aspectRatio={`5:4`}
              />
            )
          ) : null}
        </View>
      ) : null}

      {isEditMode ? (
        <View className="gap-2 p-4">
          <Text className="pyly-body-caption text-xs font-semibold text-fg-dim uppercase">
            Mnemonic spec
          </Text>
          <InlineEditableSettingJson
            setting={hanziPronunciationHintMnemonicSpecSetting}
            settingKey={hintSettingKey}
            readonly={!isEditMode}
            placeholder='{"story": "A chef juggling cans"}'
            emptyStateText="No mnemonic spec JSON"
          />
        </View>
      ) : null}

      {showAiModal && splitPinyin != null && initialPinyinSoundName != null ? (
        <AiPronunciationHintModal
          leadCharacter={{
            name: initialPinyinSoundName,
            bio: initialSoundDescription ?? undefined,
          }}
          location={{
            name: finalToneName,
            description:
              finalToneLocationDescription == null ||
              finalToneLocationDescription.length === 0
                ? undefined
                : finalToneLocationDescription,
          }}
          cue={{ word: gloss, meaning: cueMeaning }}
          onApplyHint={({ text, explanation }) => {
            const mergedHintText = composeHintText(text, explanation);
            pronunciationHint.setText(mergedHintText);
            setShowHintEditor((mergedHintText ?? ``).trim().length > 0);
          }}
          onDismiss={() => {
            setShowAiModal(false);
          }}
        />
      ) : null}
    </WikiTitledBox>
  );
}

function MergedHintDisplay({ value }: { value: string }) {
  const parsed = parseHintText(value);

  if (parsed.hint.length === 0 && parsed.description == null) {
    return null;
  }

  return (
    <>
      <Text className="font-sans font-semibold">
        <Pylymark source={parsed.hint} />
      </Text>
      {parsed.description == null ? null : (
        <Text className="font-sans font-normal text-fg-dim">
          {` `}
          <Pylymark source={parsed.description} />
        </Text>
      )}
    </>
  );
}

export function SoundLinkBlock({
  soundId,
  href,
  label,
  name,
}: {
  soundId: PinyinSoundId;
  href: Href;
  label: ReactNode;
  name: string | null;
}) {
  const soundImageSetting = useUserSetting({
    setting: pinyinSoundImageSetting,
    key: { soundId },
  });
  const isPointerHoverCapable = usePointerHoverCapability();
  const soundImage = soundImageSetting.value;
  const soundImageCrop = parseImageCrop(soundImage?.imageCrop);
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
          {!isPointerHoverCapable || soundImage?.imageId == null ? (
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
                    assetId={soundImage.imageId}
                    crop={soundImageCrop}
                    imageWidth={soundImage.imageWidth}
                    imageHeight={soundImage.imageHeight}
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

function toneToLocationSetKey(tone: number): LocationSetKey {
  switch (tone) {
    case 1: {
      return `arrival`;
    }
    case 2: {
      return `ascent`;
    }
    case 3: {
      return `heart`;
    }
    case 4: {
      return `below`;
    }
    default: {
      return `summit`;
    }
  }
}

function buildCueMeaningContext({
  cueWord,
  gloss,
  partOfSpeech,
}: {
  cueWord: string;
  gloss: readonly string[];
  partOfSpeech?: PartOfSpeech;
}) {
  const normalizedCueWord = cueWord.trim().toLowerCase();
  const additionalGloss = gloss
    .map((item) => item.trim())
    .filter(
      (item) => item.length > 0 && item.toLowerCase() !== normalizedCueWord,
    )
    .slice(0, 3);

  const partOfSpeechText =
    partOfSpeech == null ? null : formatPartOfSpeech(partOfSpeech);

  const pieces = [
    partOfSpeechText == null
      ? null
      : `intended sense part of speech: ${partOfSpeechText}`,
    additionalGloss.length === 0
      ? null
      : `related glosses: ${additionalGloss.join(`; `)}`,
  ].filter((x) => x != null);

  return pieces.length === 0 ? undefined : pieces.join(`. `);
}

function formatPartOfSpeech(partOfSpeech: PartOfSpeech): string {
  switch (partOfSpeech) {
    case PartOfSpeech.Noun: {
      return `noun`;
    }
    case PartOfSpeech.Verb: {
      return `verb`;
    }
    case PartOfSpeech.Adjective: {
      return `adjective`;
    }
    case PartOfSpeech.Adverb: {
      return `adverb`;
    }
    case PartOfSpeech.Pronoun: {
      return `pronoun`;
    }
    case PartOfSpeech.Numeral: {
      return `numeral`;
    }
    case PartOfSpeech.MeasureWordOrClassifier: {
      return `measure word or classifier`;
    }
    case PartOfSpeech.Preposition: {
      return `preposition`;
    }
    case PartOfSpeech.Conjunction: {
      return `conjunction`;
    }
    case PartOfSpeech.AuxiliaryWordOrParticle: {
      return `auxiliary word or particle`;
    }
    case PartOfSpeech.Interjection: {
      return `interjection`;
    }
    case PartOfSpeech.Prefix: {
      return `prefix`;
    }
    case PartOfSpeech.Suffix: {
      return `suffix`;
    }
    case PartOfSpeech.Phonetic: {
      return `phonetic`;
    }
  }
}

function ExperimentalContent(props: { hanzi: HanziText }) {
  void `leading-5 leading-6 leading-7 leading-8`;
  
  return props.hanzi === `电` ? (
    <View>
      <Text className="pyly-body leading-7">
        <Text
          className="
            my-0 inline-block rounded-sm border border-sky-400 bg-gradient-to-b from-sky-400/50
            via-sky-500/50 to-sky-500/50 px-1 leading-6 font-medium text-white shadow-sm
          "
        >
          [di-] Count Drac
        </Text>
        {` `}
        counts the underground water gauges until{` `}
        <Text
          className="
            my-0 inline-block rounded-sm border border-rose-500 bg-gradient-to-b from-rose-500/50
            to-rose-600/50 px-1 leading-6 font-medium text-white shadow-sm
          "
        >
          electricity
        </Text>
        {` `}
        shocks him back to one.{` `}
        <Text className="text-fg-dim">
          In the pyramid’s damp{` `}
          <Text
            className="
              my-0 rounded-sm border border-sky-400 bg-gradient-to-b from-sky-400/50 via-sky-500/50
              to-sky-500/50 px-1 leading-6 font-medium text-white shadow-sm
            "
          >
            [-àn] subterranean chamber
          </Text>
          , Count Drac keeps trying to count the water-gauge pillars, but
          electricity jumps through the wet floor and shocks him back to one.
        </Text>
      </Text>
    </View>
  ) : null;
}
