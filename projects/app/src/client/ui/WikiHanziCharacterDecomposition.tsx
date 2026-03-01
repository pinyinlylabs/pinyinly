import {
  hanziWordMeaningHintImageSetting,
  useUserSetting,
} from "@/client/ui/hooks/useUserSetting";
import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziText, HanziWord, WikiCharacterData } from "@/data/model";
import {
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImagePromptSetting,
  hanziWordMeaningHintTextSetting,
} from "@/data/userSettings";
import type { HanziWordMeaning } from "@/dictionary";
import {
  glossOrThrow,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import { parseIndexRanges } from "@/util/indexRanges";
import type { ReactNode } from "react";
import { use } from "react";
import { Text, View } from "react-native";
import { HanziCharacter } from "./HanziCharacter";
import { hanziCharacterColorSchema } from "./HanziCharacter.utils";
import { HanziLink } from "./HanziLink";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { WikiTitledBox } from "./WikiTitledBox";

interface WikiHanziCharacterDecompositionProps {
  characterData: WikiCharacterData;
}

export function WikiHanziCharacterDecomposition({
  characterData,
}: WikiHanziCharacterDecompositionProps) {
  const componentsElements: ReactNode[] = [];
  const dictionary = use(loadDictionary());

  if (characterData.mnemonic && Array.isArray(characterData.strokes)) {
    for (const [i, visualComponent] of [
      ...walkIdsNodeLeafs(characterData.mnemonic.components),
    ].entries()) {
      const label =
        visualComponent.label ??
        (visualComponent.hanzi == null
          ? null
          : dictionary
              .lookupHanzi(visualComponent.hanzi)
              .map(([, meaning]) => meaning.gloss[0])
              .join(` / `));
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
    <WikiTitledBox title="Recognize the character" className="mx-4 mt-4">
      <View className="gap-4 p-4 pb-0">
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

      <View className="my-4 w-full">
        <CoverImageSection hanzi={characterData.hanzi} />
      </View>

      <MeaningsSection
        hanzi={characterData.hanzi}
        mnemonicHints={characterData.mnemonic?.hints}
      />
    </WikiTitledBox>
  );
}

function CoverImageSection({ hanzi }: { hanzi: HanziText }) {
  const dictionary = use(loadDictionary());
  const hanziWordMeanings = dictionary.lookupHanzi(hanzi);

  // Use the first meaning as the primary meaning for cover image.
  const hanziWord = hanziWordMeanings[0]?.[0];

  const settingKey =
    hanziWord == null ? ({ skip: true } as const) : { hanziWord };

  const imagePromptSetting = useUserSetting(
    hanziWordMeaningHintImagePromptSetting,
    settingKey,
  );

  const explanationSetting = useUserSetting(
    hanziWordMeaningHintExplanationSetting,
    settingKey,
  );

  const hintSetting = useUserSetting(
    hanziWordMeaningHintTextSetting,
    settingKey,
  );

  const handleUploadError = (error: string) => {
    console.error(`Upload error:`, error);
  };

  if (hanziWord == null) {
    return null;
  }

  const meaning = dictionary.lookupHanziWord(hanziWord);

  return (
    <InlineEditableSettingImage
      setting={hanziWordMeaningHintImageSetting}
      settingKey={{ hanziWord }}
      presetImageIds={/* TODO */ []}
      previewHeight={200}
      tileSize={64}
      enablePasteDropZone
      enableAiGeneration
      initialAiPrompt={
        imagePromptSetting?.value?.text ??
        ([hintSetting?.value?.text, explanationSetting?.value?.text]
          .filter((v) => v != null && v.length > 0)
          .join(` - `) ||
          (meaning == null
            ? `Create an image for ${hanzi}`
            : `Create an image representing ${glossOrThrow(hanziWord, meaning)}`))
      }
      frameConstraint={{ aspectRatio: 2 }}
      onUploadError={handleUploadError}
      onSaveAiPrompt={(prompt) => {
        imagePromptSetting?.setValue({
          hanziWord,
          text: prompt,
        });
      }}
    />
  );
}

function MeaningsSection({
  hanzi,
  mnemonicHints,
}: {
  hanzi: HanziText;
  mnemonicHints:
    | readonly { readonly meaningKey: string; readonly hint: string }[]
    | undefined;
}) {
  const dictionary = use(loadDictionary());
  const hanziWordMeanings = dictionary.lookupHanzi(hanzi);

  // If hanzi is not in dictionary, don't show this section
  if (hanziWordMeanings.length === 0) {
    return null;
  }

  return (
    <View className="gap-4 p-4">
      <Text className="pyly-body-heading">{hanzi} meanings</Text>

      <View className="gap-3">
        {hanziWordMeanings.map(([hanziWord, meaning]) => {
          const meaningKey = meaningKeyFromHanziWord(hanziWord);
          // Match mnemonic hint by meaningKey
          const matchedHint = mnemonicHints?.find(
            (h) => h.meaningKey === meaningKey,
          );
          return (
            <MeaningItem
              key={hanziWord}
              hanziWord={hanziWord}
              meaning={meaning}
              mnemonicHint={matchedHint?.hint}
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
}: {
  hanziWord: HanziWord;
  meaning: HanziWordMeaning;
  mnemonicHint: string | undefined;
}) {
  const hintSetting = useUserSetting(hanziWordMeaningHintTextSetting, {
    hanziWord,
  });
  const hintSettingTextValue =
    hintSetting.value?.text ??
    (hintSetting.value as { t?: string } | null)?.t ??
    null;
  const displayHint = hintSettingTextValue ?? mnemonicHint ?? null;
  const hasCustomHint = (hintSettingTextValue ?? ``).trim().length > 0;
  const hasHint = displayHint != null && displayHint.length > 0;

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
      <View className="gap-2 pl-7">
        <InlineEditableSettingText
          variant="hint"
          setting={hanziWordMeaningHintTextSetting}
          settingKey={{ hanziWord }}
          placeholder="Add a hint"
          // oxlint-disable-next-line typescript/no-deprecated
          defaultValue={displayHint ?? ``}
          maxLength={80}
          multiline
          showCounterAtRatio={0.8}
          overLimitMessage="Keep hints under 80 characters. Move extra detail to the explanation."
          renderDisplay={(value) => <Pylymark source={value} />}
        />

        {hasCustomHint ? (
          <InlineEditableSettingText
            variant="hintExplanation"
            setting={hanziWordMeaningHintExplanationSetting}
            settingKey={{ hanziWord }}
            placeholder="Add an explanation"
            multiline
            renderDisplay={(value) => <Pylymark source={value} />}
          />
        ) : null}
      </View>
      {hasHint ? null : (
        <Text className="pyly-body-caption pl-7 text-fg-dim">
          Add a hint to make this meaning easier to recognize.
        </Text>
      )}
    </View>
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
