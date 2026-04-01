import type { DictionarySearchEntry } from "@/client/query";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { useHanziWordMeaningHint } from "@/client/ui/hooks/useHanziWordMeaningHint";
import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziText, HanziWord, WikiCharacterData } from "@/data/model";
import {
  hanziWordMeaningHintImagePromptSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
} from "@/data/userSettings";
import { meaningKeyFromHanziWord } from "@/dictionary";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { parseIndexRanges } from "@/util/indexRanges";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { HanziCharacter } from "./HanziCharacter";
import { hanziCharacterColorSchema } from "./HanziCharacter.utils";
import { HanziLink } from "./HanziLink";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { WikiTitledBox } from "./WikiTitledBox";
import { useDb } from "./hooks/useDb";
import { hintFirstLineLength, parseHintText } from "./hintText";

interface WikiHanziCharacterDecompositionProps {
  characterData: WikiCharacterData;
}

export function WikiHanziCharacterDecomposition({
  characterData,
}: WikiHanziCharacterDecompositionProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const componentsElements: ReactNode[] = [];
  const db = useDb();

  const hanziList = useMemo(
    () =>
      characterData.mnemonic
        ? ([...walkIdsNodeLeafs(characterData.mnemonic.components)]
            .map((c) => c.hanzi)
            .filter((h) => h != null) as HanziText[])
        : ([] as HanziText[]),
    [characterData.mnemonic],
  );

  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => inArray(entry.hanzi, hanziList))
        .select(({ entry }) => ({ hanzi: entry.hanzi, gloss: entry.gloss })),
    [db.dictionarySearch, hanziList],
  );

  const glossByHanzi = new Map<string, string>(
    dictionarySearchEntries.map((entry) => [entry.hanzi, entry.gloss[0] ?? ``]),
  );

  if (characterData.mnemonic && Array.isArray(characterData.strokes)) {
    for (const [i, visualComponent] of [
      ...walkIdsNodeLeafs(characterData.mnemonic.components),
    ].entries()) {
      const label =
        visualComponent.label ??
        (visualComponent.hanzi == null
          ? null
          : (glossByHanzi.get(visualComponent.hanzi) ?? null));
      componentsElements.push(
        <View className="flex-1 items-center gap-2" key={i}>
          <View className="flex-row items-center gap-2">
            <HanziCharacter
              className="size-12"
              highlightColor={hanziCharacterColorSafeSchema.parse(
                visualComponent.color,
              )}
              strokesData={characterData.strokes}
              highlightStrokes={parseIndexRanges(visualComponent.strokes)}
            />
          </View>
          <Text className="pyly-body text-center">
            {visualComponent.hanzi == null ? (
              label
            ) : (
              <HanziLink hanzi={visualComponent.hanzi}>
                {visualComponent.hanzi} {label}
              </HanziLink>
            )}
          </Text>
        </View>,
      );
    }
  }

  return (
    <WikiTitledBox
      title="Recognize the character"
      className="mx-4 mt-4"
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
        {componentsElements.length > 0 ? (
          <>
            <Text className="pyly-body">
              Use the components of{` `}
              <Text className="pyly-bold">{characterData.hanzi}</Text> to help:
            </Text>

            <View className="flex-row gap-5">{componentsElements}</View>
          </>
        ) : Array.isArray(characterData.strokes) ? (
          <>
            <Text className="pyly-body">
              What does{` `}
              <Text className="pyly-bold">{characterData.hanzi}</Text>
              {` `}
              resemble?
            </Text>

            <View className="flex-1 items-center">
              <HanziCharacter
                className="size-12"
                strokesData={characterData.strokes}
                highlightStrokes={parseIndexRanges(
                  `0-${characterData.strokes.length - 1}`,
                )}
              />
            </View>
          </>
        ) : null}
      </View>

      <CoverImageSection hanzi={characterData.hanzi} isEditMode={isEditMode} />

      <MeaningsSection
        hanzi={characterData.hanzi}
        mnemonicHints={characterData.mnemonic?.hints}
        isEditMode={isEditMode}
      />
    </WikiTitledBox>
  );
}

function CoverImageSection({
  hanzi,
  isEditMode,
}: {
  hanzi: HanziText;
  isEditMode: boolean;
}) {
  const db = useDb();
  const { data: hanziWordMeanings } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          hanziWord: entry.hanziWord,
          gloss: entry.gloss,
        })),
    [db.dictionarySearch, hanzi],
  );
  const hanziWord = hanziWordMeanings[0]?.hanziWord;
  const meaning = hanziWordMeanings.find(
    (item) => item.hanziWord === hanziWord,
  );

  const settingKey = hanziWord == null ? null : { hanziWord };

  const imagePromptSetting = useUserSetting(
    settingKey == null
      ? null
      : { setting: hanziWordMeaningHintImagePromptSetting, key: settingKey },
  );

  const hintState = useHanziWordMeaningHint(hanziWord);

  const handleUploadError = (error: string) => {
    console.error(`Upload error:`, error);
  };

  if (hanziWord == null) {
    return null;
  }

  return (
    <InlineEditableSettingImage
      readonly={!isEditMode}
      setting={hanziWordMeaningHintImageSetting}
      settingKey={{ hanziWord }}
      presetImageIds={/* TODO */ []}
      previewHeight={200}
      tileSize={64}
      enablePasteDropZone
      enableAiGeneration
      initialAiPrompt={
        imagePromptSetting?.value?.text ??
        hintState.text ??
        (meaning == null
          ? `Create an image for ${hanzi}`
          : `Create an image representing ${meaning.gloss[0] ?? hanzi}`)
      }
      frameConstraint={{ aspectRatio: 2 }}
      onUploadError={handleUploadError}
      onSaveAiPrompt={(prompt) => {
        imagePromptSetting?.setValue({
          hanziWord,
          text: prompt,
        });
      }}
      className="my-4 w-full"
    />
  );
}

function MeaningsSection({
  hanzi,
  mnemonicHints,
  isEditMode,
}: {
  hanzi: HanziText;
  mnemonicHints:
    | readonly { readonly meaningKey: string; readonly hint: string }[]
    | undefined;
  isEditMode: boolean;
}) {
  const db = useDb();
  const { data: hanziWordMeanings } = useLiveQuery(
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
          hsk: entry.hsk,
        })),
    [db.dictionarySearch, hanzi],
  );

  // If hanzi is not in dictionary, don't show this section
  if (hanziWordMeanings.length === 0) {
    return null;
  }

  return (
    <View className="gap-4 p-4">
      <Text className="pyly-body-heading">{hanzi} meanings</Text>

      <View className="gap-3">
        {hanziWordMeanings.map((entry) => {
          const { hanziWord } = entry;
          const meaningKey = meaningKeyFromHanziWord(hanziWord);
          // Match mnemonic hint by meaningKey
          const matchedHint = mnemonicHints?.find(
            (h) => h.meaningKey === meaningKey,
          );
          return (
            <MeaningItem
              key={hanziWord}
              hanziWord={hanziWord}
              meaning={entry}
              mnemonicHint={matchedHint?.hint}
              isEditMode={isEditMode}
            />
          );
        })}
      </View>
    </View>
  );
}

function MeaningItem({
  hanziWord,
  meaning,
  mnemonicHint,
  isEditMode,
}: {
  hanziWord: HanziWord;
  meaning: Pick<DictionarySearchEntry, `gloss` | `pinyin` | `hsk`>;
  mnemonicHint: string | undefined;
  isEditMode: boolean;
}) {
  const hintState = useHanziWordMeaningHint(hanziWord);
  const displayHint = hintState.text ?? mnemonicHint ?? null;
  const hasCustomHint = hintState.hasText;
  const hasHint = (displayHint ?? ``).trim().length > 0;

  // Display glosses: first one bold, rest dim and semicolon-separated
  const primaryGloss = meaning.gloss[0];
  const secondaryGlosses = meaning.gloss.slice(1);

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <Circle hasCustomHint={hasCustomHint} />
        <Text className="pyly-body flex-1">
          <Text className="pyly-bold">{primaryGloss}</Text>
          {secondaryGlosses.length > 0 ? (
            <Text className="text-fg-dim">; {secondaryGlosses.join(`; `)}</Text>
          ) : null}
        </Text>
      </View>
      {isEditMode || hasHint ? (
        <View className={isEditMode ? `gap-2 pl-7` : `gap-1 pl-7`}>
          <InlineEditableSettingText
            setting={hanziWordMeaningHintTextSetting}
            settingKey={{ hanziWord }}
            readonly={!isEditMode}
            placeholder="Add a hint on the first line. Add details after a blank line."
            // oxlint-disable-next-line typescript/no-deprecated
            defaultValue={displayHint ?? ``}
            maxLength={80}
            multiline
            showCounterAtRatio={0.8}
            counterLength={hintFirstLineLength}
            overLimitMessage="Keep the first line under 80 characters. Add details after a blank line."
            renderDisplay={(value) => <MergedHintDisplay value={value} />}
          />
        </View>
      ) : null}
      {isEditMode && !hasHint ? (
        <Text className="pyly-body-caption pl-7 text-fg-dim">
          Add a hint to make this meaning easier to recognize.
        </Text>
      ) : null}
    </View>
  );
}

function MergedHintDisplay({ value }: { value: string }) {
  const parsed = parseHintText(value);

  if (parsed.hint.length === 0 && parsed.description == null) {
    return null;
  }

  return (
    <>
      <Text className="font-semibold">
        <Pylymark source={parsed.hint} />
      </Text>
      {parsed.description == null ? null : (
        <Text className="font-normal text-fg-dim">
          {` `}
          <Pylymark source={parsed.description} />
        </Text>
      )}
    </>
  );
}

function Circle({ hasCustomHint }: { hasCustomHint: boolean }) {
  return (
    <View
      className={`
        m-1 size-3 rounded-full border-2

        ${hasCustomHint ? `border-cyan bg-cyan` : `border-fg-bg25`}
      `}
    />
  );
}

// oxlint-disable-next-line unicorn/prefer-top-level-await
const hanziCharacterColorSafeSchema = hanziCharacterColorSchema.catch(`fg`);
