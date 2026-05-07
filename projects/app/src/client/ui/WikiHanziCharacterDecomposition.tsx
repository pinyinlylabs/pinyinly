import { getWikiCharacterData } from "@/client/wiki";
import { hanziSvgPathsQuery } from "@/client/query";
import type { DictionarySearchEntry } from "@/client/query";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { useHanziWordMeaningHint } from "@/client/ui/hooks/useHanziWordMeaningHint";
import { isHanziCharacter, walkIdsNodeLeafs } from "@/data/hanzi";
import type {
  HanziCharacter as HanziCharacterType,
  HanziText,
  HanziWord,
  WikiCharacterComponent,
  WikiCharacterData,
} from "@/data/model";
import {
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImagePromptSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
} from "@/data/userSettings";
import { meaningKeyFromHanziWord } from "@/dictionary";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { useQuery } from "@tanstack/react-query";
import { parseIndexRanges } from "@/util/indexRanges";
import { use, useState } from "react";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { HanziCharacter } from "./HanziCharacter";
import { HanziDecompositionEditor } from "./HanziDecompositionEditor";
import { hanziCharacterColorSchema } from "./HanziCharacter.utils";
import { HanziLink } from "./HanziLink";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { WikiTitledBox } from "./WikiTitledBox";
import { useDb } from "./hooks/useDb";
import { hintFirstLineLength, parseHintText } from "./hintText";

export function WikiHanziCharacterDecomposition({
  hanzi,
}: {
  hanzi: HanziText;
}) {
  if (!isHanziCharacter(hanzi)) {
    return null;
  }
  const characterData = use(getWikiCharacterData(hanzi));
  if (characterData == null) {
    return null;
  }
  return (
    <WikiHanziCharacterDecompositionBox
      hanzi={hanzi}
      characterData={characterData}
    />
  );
}

interface WikiHanziCharacterDecompositionProps {
  hanzi: HanziCharacterType;
  characterData: WikiCharacterData;
}

function hasStrokeRanges(
  components: readonly WikiCharacterComponent[],
): boolean {
  return components.some((component) => component.strokes.trim().length > 0);
}

export function WikiHanziCharacterDecompositionBox({
  hanzi,
  characterData,
}: WikiHanziCharacterDecompositionProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const componentsElements: ReactNode[] = [];
  const db = useDb();

  const { data: selectedDecomposition } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.characterDecompositionCollection })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .select(({ entry }) => ({
          decompositionComponents: entry.decompositionComponents,
        }))
        .findOne(),
    [db.characterDecompositionCollection, hanzi],
  );

  const selectedComponents =
    selectedDecomposition?.decompositionComponents == null
      ? undefined
      : [...walkIdsNodeLeafs(selectedDecomposition.decompositionComponents)];

  const { data: strokeSvgs } = useQuery(hanziSvgPathsQuery(hanzi));

  const showStrokeHighlights =
    selectedComponents != null &&
    hasStrokeRanges(selectedComponents) &&
    strokeSvgs != null;

  const hanziList: HanziText[] = [];
  if (selectedComponents != null) {
    for (const component of selectedComponents) {
      if (component.hanzi != null) {
        hanziList.push(component.hanzi);
      }
    }
  }
  const dedupedHanziListKey = [...new Set(hanziList)].join(`|`);

  const { data: dictionarySearchEntries } = useLiveQuery(
    (q) => {
      if (dedupedHanziListKey.length === 0) {
        return null;
      }

      const dedupedHanziList = dedupedHanziListKey
        .split(`|`)
        .filter((item): item is HanziText => item.length > 0);

      return q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => inArray(entry.hanzi, dedupedHanziList))
        .select(({ entry }) => ({
          hanzi: entry.hanzi,
          gloss: entry.gloss,
        }));
    },
    [db.dictionarySearch, dedupedHanziListKey],
  );

  const glossByHanzi = new Map<string, string>(
    (dictionarySearchEntries ?? []).map((entry) => [
      entry.hanzi,
      entry.gloss[0] ?? ``,
    ]),
  );

  if (showStrokeHighlights) {
    for (const [i, visualComponent] of selectedComponents.entries()) {
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
              strokesData={strokeSvgs}
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
  } else if (selectedComponents != null) {
    for (const [i, component] of selectedComponents.entries()) {
      if (component.hanzi == null) {
        continue;
      }

      const hanzi = component.hanzi;
      const label = glossByHanzi.get(hanzi) ?? null;

      componentsElements.push(
        <View
          className="flex-1 items-center gap-2"
          key={`component:${i}:${hanzi}`}
        >
          <View
            className={`min-w-12 rounded-xl border border-fg/20 bg-bg-high px-3 py-2`}
          >
            <Text className="pyly-body text-center text-lg">{hanzi}</Text>
          </View>
          <Text className="pyly-body text-center">
            <HanziLink hanzi={hanzi}>
              {hanzi} {label}
            </HanziLink>
          </Text>
        </View>,
      );
    }
  }

  return (
    <WikiTitledBox
      title="Recognize the character"
      className="mt-4"
      onEditingChange={setIsEditMode}
    >
      <View className="gap-4 p-4">
        {isEditMode ? <HanziDecompositionEditor hanzi={hanzi} /> : null}

        {componentsElements.length > 0 ? (
          <>
            <Text className="pyly-body">
              Use the components of{` `}
              <Text className="pyly-bold">{hanzi}</Text> to help:
            </Text>

            <View className="flex-row flex-wrap gap-5">
              {componentsElements}
            </View>
          </>
        ) : strokeSvgs == null ? null : (
          <>
            <Text className="pyly-body">
              What does{` `}
              <Text className="pyly-bold">{hanzi}</Text>
              {` `}
              resemble?
            </Text>

            <View className="flex-1 items-center">
              <HanziCharacter
                className="size-12"
                strokesData={strokeSvgs}
                highlightStrokes={parseIndexRanges(
                  `0-${strokeSvgs.length - 1}`,
                )}
              />
            </View>
          </>
        )}
      </View>

      <CoverImageSection hanzi={hanzi} isEditMode={isEditMode} />

      <MeaningsSection
        hanzi={hanzi}
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
      enableAiGeneration
      initialAiPrompt={
        imagePromptSetting?.value?.text ??
        hintState.text ??
        (meaning == null
          ? `Create an image for ${hanzi}`
          : `Create an image representing ${meaning.gloss[0] ?? hanzi}`)
      }
      aspectRatio={`16:9`}
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

  const userHintSettingKeys = hanziWordMeanings.flatMap((entry) => {
    const key = { hanziWord: entry.hanziWord };
    return [
      hanziWordMeaningHintTextSetting.entity.marshalKey(key),
      hanziWordMeaningHintExplanationSetting.entity.marshalKey(key),
    ];
  });

  const { data: userHintSettings } = useLiveQuery(
    (q) =>
      userHintSettingKeys.length === 0
        ? null
        : q
            .from({ setting: db.settingCollection })
            .where(({ setting }) => inArray(setting.key, userHintSettingKeys)),
    [db.settingCollection, userHintSettingKeys],
  );

  const userHintKeysWithContent = new Set(
    (userHintSettings ?? [])
      .filter((s) => hasSettingText(s.value))
      .map((s) => s.key),
  );

  if (hanziWordMeanings.length === 0) {
    return null;
  }

  function meaningHasHint(entry: (typeof hanziWordMeanings)[number]): boolean {
    const meaningKey = meaningKeyFromHanziWord(entry.hanziWord);
    if (mnemonicHints?.some((h) => h.meaningKey === meaningKey) === true) {
      return true;
    }
    const textKey = hanziWordMeaningHintTextSetting.entity.marshalKey({
      hanziWord: entry.hanziWord,
    });
    const explanationKey =
      hanziWordMeaningHintExplanationSetting.entity.marshalKey({
        hanziWord: entry.hanziWord,
      });
    return (
      userHintKeysWithContent.has(textKey) ||
      userHintKeysWithContent.has(explanationKey)
    );
  }

  const visibleMeanings = isEditMode
    ? hanziWordMeanings
    : hanziWordMeanings.filter(meaningHasHint);

  return (
    <View className="gap-4 p-4">
      {visibleMeanings.length === 0 ? (
        <Text className="pyly-body-caption text-fg-dim">
          Think of a story connecting the components to the meaning.
        </Text>
      ) : (
        <View className="gap-3">
          {visibleMeanings.map((entry) => {
            const meaningKey = meaningKeyFromHanziWord(entry.hanziWord);
            const mnemonicHint = mnemonicHints?.find(
              (h) => h.meaningKey === meaningKey,
            )?.hint;
            return (
              <MeaningItem
                key={entry.hanziWord}
                hanziWord={entry.hanziWord}
                meaning={entry}
                mnemonicHint={mnemonicHint}
                isEditMode={isEditMode}
              />
            );
          })}
        </View>
      )}
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
      {hasHint ? null : (
        <Text className="pyly-body-caption pl-7 text-fg-dim">
          Add a hint to make this meaning easier to recognize.
        </Text>
      )}
    </View>
  );
}

function hasSettingText(value: unknown): boolean {
  if (typeof value !== `object` || value == null) {
    return false;
  }
  const record = value as { text?: unknown; t?: unknown };
  const text =
    typeof record.text === `string`
      ? record.text
      : typeof record.t === `string`
        ? record.t
        : null;
  return text != null && text.trim().length > 0;
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
