import type { DictionarySearchEntry } from "@/client/query";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import type { HanziText, PinyinSoundId, PinyinUnit } from "@/data/model";
import {
  defaultPinyinSoundInstructions,
  defaultToneNames,
  getDefaultFinalToneName,
  getFinalSoundLabel,
  getInitialSoundLabel,
  getToneSoundLabel,
  splitPinyinUnit,
} from "@/data/pinyin";
import {
  getPinyinFinalToneKeyParams,
  hanziPronunciationHintImageSetting,
  hanziPronunciationHintTextSetting,
  pinyinFinalToneDescriptionSetting,
  pinyinFinalToneNameSetting,
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
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { ThreeSplitLinesDown } from "./ThreeSplitLinesDown";
import { Tooltip } from "./Tooltip";
import { WikiHanziCharacterPronunciationImagePicker } from "./WikiHanziCharacterPronunciationImagePicker";
import { WikiTitledBox } from "./WikiTitledBox";
import { getSharedPrimaryPronunciation } from "./WikiHanziCharacterIntro.utils";
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
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          gloss: entry.gloss,
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
      gloss={gloss}
      hanzi={hanzi}
      pinyinUnit={pronunciation.pinyinUnit}
    />
  );
}

export function WikiHanziCharacterPronunciationBox({
  hanzi,
  pinyinUnit,
  gloss,
}: {
  gloss: DictionarySearchEntry[`gloss`][number];
  hanzi: HanziText;
  pinyinUnit: PinyinUnit;
}) {
  const splitPinyin = splitPinyinUnit(pinyinUnit);

  const initialPinyinSound2 = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameSetting,
          key: { soundId: splitPinyin.initialSoundId },
        },
  );
  const finalPinyinSound2 = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundNameSetting,
          key: { soundId: splitPinyin.finalSoundId },
        },
  );
  const tonePinyinSound2 = useUserSetting(
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
  const finalDescriptionSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundDescriptionSetting,
          key: { soundId: splitPinyin.finalSoundId },
        },
  );
  const toneDescriptionSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinSoundDescriptionSetting,
          key: { soundId: splitPinyin.toneSoundId },
        },
  );
  const finalToneDescriptionSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalToneDescriptionSetting,
          key: getPinyinFinalToneKeyParams(
            splitPinyin.finalSoundId,
            String(splitPinyin.tone),
          ),
        },
  );
  const finalToneNameSetting = useUserSetting(
    splitPinyin == null
      ? null
      : {
          setting: pinyinFinalToneNameSetting,
          key: getPinyinFinalToneKeyParams(
            splitPinyin.finalSoundId,
            String(splitPinyin.tone),
          ),
        },
  );
  const initialPinyinSoundName = initialPinyinSound2?.value?.text;
  const finalPinyinSoundName = finalPinyinSound2?.value?.text;
  const tonePinyinSoundName = tonePinyinSound2?.value?.text;

  const initialSoundDescription =
    initialDescriptionSetting?.value?.text ?? null;
  const finalSoundDescription = finalDescriptionSetting?.value?.text ?? null;
  const toneSoundDescription = toneDescriptionSetting?.value?.text ?? null;
  const finalToneSceneDescription =
    finalToneDescriptionSetting?.value?.text ?? null;

  const initialLabel = getInitialSoundLabel(pinyinUnit);
  const finalLabel = getFinalSoundLabel(pinyinUnit);
  const toneDefaultName =
    splitPinyin == null
      ? ``
      : (defaultToneNames[String(splitPinyin.tone)] ??
        defaultPinyinSoundInstructions[splitPinyin.toneSoundId] ??
        String(splitPinyin.tone));
  const finalDisplayName = finalPinyinSoundName ?? finalLabel;
  const toneDisplayName =
    tonePinyinSoundName ?? getToneSoundLabel(pinyinUnit) ?? toneDefaultName;
  const defaultFinalToneName = getDefaultFinalToneName({
    finalName: finalDisplayName,
    toneName: toneDisplayName,
  });
  const finalToneName =
    finalToneNameSetting?.value?.text ?? defaultFinalToneName;

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

  return (
    <WikiTitledBox
      title="Remember the pronunciation"
      className="mt-4"
      headerAction={
        <RectButton
          variant="bare2"
          onPress={() => {
            setIsEditMode((current) => !current);
          }}
        >
          {isEditMode ? `Done` : `Change`}
        </RectButton>
      }
    >
      <View className="gap-4 p-4">
        <Text className="pyly-body">
          <Text className="pyly-bold">{hanzi}</Text> is pronounced{` `}
          <Text className="pyly-bold">{pinyinUnit}</Text>.
        </Text>

        <Text className="pyly-body">
          Use a story about &ldquo;
          <Text className="pyly-bold">{gloss}</Text>
          &rdquo; to remember the initial, the final, and the tone of{` `}
          <Text className="pyly-bold">{pinyinUnit}</Text>.
        </Text>
      </View>

      {splitPinyin == null ? null : (
        <View className="gap-4 p-4">
          <View className="">
            <Text className="pyly-body text-center">
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
                  name={null}
                />
              </View>
              <View className="flex-1 items-center gap-1 border-fg/10">
                <SoundLinkBlock
                  soundId={splitPinyin.toneSoundId}
                  href={`/sounds/${splitPinyin.toneSoundId}`}
                  label={
                    <>
                      {splitPinyin.tone}
                      <Text className="align-super text-[10px]">
                        {ordinalSuffix(splitPinyin.tone)}
                      </Text>
                    </>
                  }
                  name={null}
                />
              </View>
            </View>
            <View className="mt-3 items-center gap-2">
              <FinalToneForkedArrow />
              <Link
                href={`/sounds/${splitPinyin.finalSoundId}?tone=${splitPinyin.tone}`}
                className={soundNameClass()}
              >
                {finalToneName}
              </Link>
            </View>
          </View>
        </View>
      )}
      {isEditMode && (!isHintSectionVisible || !isImageSectionVisible) ? (
        <View className="flex-row items-start gap-4 p-4">
          {isHintSectionVisible ? null : (
            <RectButton
              variant="bare2"
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
              variant="bare2"
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
        <View className="gap-4 p-4">
          {isHintSectionVisible ? (
            <View className="gap-2">
              <Text className="pyly-body-subheading">
                Your pronunciation hint
              </Text>

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
                    disabled={splitPinyin == null}
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
                frameConstraint={{ aspectRatio: 2 }}
              />
            )
          ) : null}
        </View>
      ) : null}

      {showAiModal && splitPinyin != null ? (
        <AiPronunciationHintModal
          hanzi={hanzi}
          pinyinUnit={pinyinUnit}
          gloss={gloss}
          initial={{
            soundId: splitPinyin.initialSoundId,
            name: initialPinyinSoundName ?? null,
            description: initialSoundDescription,
          }}
          final={{
            soundId: splitPinyin.finalSoundId,
            name: finalPinyinSoundName ?? null,
            description: finalSoundDescription,
          }}
          tone={{
            soundId: splitPinyin.toneSoundId,
            name: tonePinyinSoundName ?? null,
            description: toneSoundDescription,
          }}
          toneNumber={splitPinyin.tone}
          finalToneScene={{ description: finalToneSceneDescription }}
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

function SoundLinkBlock({
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
                <View className="size-20 overflow-hidden rounded-md bg-fg-bg5">
                  <FramedAssetImage
                    assetId={soundImage.imageId}
                    crop={soundImageCrop}
                    imageWidth={soundImage.imageWidth}
                    imageHeight={soundImage.imageHeight}
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

function FinalToneForkedArrow() {
  return (
    <View className="w-full gap-1">
      {/* TODO: Swap in a responsive Rive animation when available. */}
      <View className="flex-row gap-4">
        <View className="flex-1" />
        <View className="flex-1 items-center">
          <DownArrow />
        </View>
        <View className="flex-1 items-center">
          <DownArrow />
        </View>
      </View>
      <View className="flex-row gap-4">
        <View className="flex-1" />
        <View className="flex-1 items-center">
          <Text className="pyly-body text-fg/40">\\ /</Text>
        </View>
        <View className="flex-1" />
      </View>
      <View className="items-center">
        <DownArrow />
      </View>
    </View>
  );
}

function DownArrow() {
  return <Text className="pyly-body h-6 text-fg/40">↓</Text>;
}

function ordinalSuffix(n: number): string {
  if (n >= 11 && n <= 13) {
    return `th`;
  }
  switch (n % 10) {
    case 1: {
      return `st`;
    }
    case 2: {
      return `nd`;
    }
    case 3: {
      return `rd`;
    }
    default: {
      return `th`;
    }
  }
}
