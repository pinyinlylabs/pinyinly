import type { DictionarySearchEntry } from "@/client/query";
import { useUserSetting } from "@/client/ui/hooks/useUserSetting";
import { useHanziWordMeaningHint } from "@/client/ui/hooks/useHanziWordMeaningHint";
import { isHanziCharacter, parseIds, walkIdsNodeLeafs } from "@/data/hanzi";
import type {
  HanziCharacter as HanziCharacterType,
  HanziText,
  HanziWord,
  IdsNode,
  MnemonicHanziComponent,
} from "@/data/model";
import {
  hanziWordMeaningHintCaptionSetting,
  hanziWordMeaningHintExplanationTextSetting,
  hanziWordMeaningHintImagePromptSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
} from "@/data/userSettings";
import { meaningKeyFromHanziWord } from "@/dictionary";
import { eq, inArray, useLiveQuery } from "@tanstack/react-db";
import { useState } from "react";
import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { AiMeaningHintModal } from "./AiMeaningHintModal";
import type { MeaningHintComponent } from "./AiMeaningHintModal";
import { HanziDecompositionEditor } from "./HanziDecompositionEditor";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { WikiHanziCharacterMeaningBreakdown } from "./WikiHanziCharacterMeaningBreakdown";
import { WikiTitledBox } from "./WikiTitledBox";
import { useDb } from "./hooks/useDb";
import {
  composeHintText,
  hintFirstLineLength,
  parseHintText,
} from "./hintText";
import { zip } from "@pinyinly/lib/collections";

export function WikiHanziCharacterMeaning({ hanzi }: { hanzi: HanziText }) {
  if (!isHanziCharacter(hanzi)) {
    return null;
  }
  return <WikiHanziCharacterMeaningBox hanzi={hanzi} />;
}

interface WikiHanziCharacterMeaningProps {
  hanzi: HanziCharacterType;
}

export function WikiHanziCharacterMeaningBox({
  hanzi,
}: WikiHanziCharacterMeaningProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const db = useDb();

  const { data: mnemonicDecomposition } = useLiveQuery(
    (q) => {
      const mnemonicQuery = q
        .from({ mnemonic: db.characterMnemonicIdsCollection })
        .where(({ mnemonic }) => eq(mnemonic.hanzi, hanzi))
        .findOne();

      return q
        .from({ decomposition: db.characterDecompositionsCollection })
        .where(({ decomposition }) => eq(decomposition.hanzi, hanzi))
        .innerJoin({ mnemonic: mnemonicQuery }, ({ decomposition, mnemonic }) =>
          eq(decomposition.ids, mnemonic.ids),
        )
        .select(({ decomposition }) => decomposition)
        .findOne();
    },
    [
      db.characterDecompositionsCollection,
      db.characterMnemonicIdsCollection,
      hanzi,
    ],
  );

  // const hanziCharacterColorSafeSchema = hanziCharacterColorSchema.catch(`fg`);

  const mnemonicDecompositionComponents =
    mnemonicDecomposition?.ids == null
      ? undefined
      : zip(
          walkIdsNodeLeafs(
            parseIds(mnemonicDecomposition.ids) as IdsNode<HanziCharacterType>,
          ),
          mnemonicDecomposition.strokeSpecs,
        ).map(([hanzi, strokeSpec]): MnemonicHanziComponent => ({
          hanzi,
          strokeSpec,
        }));

  const hanziList: HanziCharacterType[] = [];
  if (mnemonicDecompositionComponents != null) {
    for (const component of mnemonicDecompositionComponents) {
      if (component.hanzi !== null) {
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

  const { data: primaryMeaningEntries } = useLiveQuery(
    (q) =>
      q
        .from({ entry: db.dictionarySearch })
        .where(({ entry }) => eq(entry.hanzi, hanzi))
        .orderBy(({ entry }) => entry.hskSortKey, `asc`)
        .orderBy(({ entry }) => entry.hanziWord, `asc`)
        .select(({ entry }) => ({
          gloss: entry.gloss,
        })),
    [db.dictionarySearch, hanzi],
  );

  const primaryMeaningGloss =
    primaryMeaningEntries[0]?.gloss[0]?.trim().length === 0
      ? null
      : (primaryMeaningEntries[0]?.gloss[0] ?? null);

  const glossByHanzi = new Map<string, string>(
    (dictionarySearchEntries ?? []).map((entry) => [
      entry.hanzi,
      entry.gloss[0] ?? ``,
    ]),
  );

  return (
    <WikiTitledBox
      title="Recognize the meaning"
      onEditingChange={setIsEditMode}
      bottomCaption={
        mnemonicDecompositionComponents != null &&
        mnemonicDecompositionComponents.length > 0
          ? `Using the components of a character as cues helps build cognitive connections, so the meaning is easier to remember.`
          : undefined
      }
    >
      <View className="gap-4 p-4">
        {isEditMode ? <HanziDecompositionEditor hanzi={hanzi} /> : null}

        <WikiHanziCharacterMeaningBreakdown
          glossByHanzi={glossByHanzi}
          hanzi={hanzi}
          primaryMeaningGloss={primaryMeaningGloss}
          hanziComponents={mnemonicDecompositionComponents}
        />
      </View>

      <ExperimentalContent hanzi={hanzi} />

      <CoverImageSection hanzi={hanzi} isEditMode={isEditMode} />

      <MeaningsSection
        hanzi={hanzi}
        mnemonicHints={[]}
        aiComponents={[]}
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
  const captionSetting = useUserSetting(
    settingKey == null
      ? null
      : { setting: hanziWordMeaningHintCaptionSetting, key: settingKey },
  );

  const hintState = useHanziWordMeaningHint(hanziWord);
  const captionText = captionSetting?.value?.text.trim() ?? ``;
  const hasCaption = captionText.length > 0;

  const handleUploadError = (error: string) => {
    console.error(`Upload error:`, error);
  };

  if (hanziWord == null) {
    return null;
  }

  return (
    <View className="my-4 w-full gap-2">
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
        aspectRatio={`5:4`}
        onUploadError={handleUploadError}
        onSaveAiPrompt={(prompt) => {
          imagePromptSetting?.setValue({
            hanziWord,
            text: prompt,
          });
        }}
      />

      {isEditMode ? (
        <InlineEditableSettingText
          setting={hanziWordMeaningHintCaptionSetting}
          settingKey={{ hanziWord }}
          readonly={false}
          placeholder="Add a caption for this image."
          maxLength={120}
        />
      ) : hasCaption ? (
        <Text className="px-10 text-left pyly-body-caption text-fg-dim">
          {captionText}
        </Text>
      ) : null}
    </View>
  );
}

function MeaningsSection({
  hanzi,
  mnemonicHints,
  aiComponents,
  isEditMode,
}: {
  hanzi: HanziText;
  mnemonicHints:
    | readonly { readonly meaningKey: string; readonly hint: string }[]
    | undefined;
  aiComponents: readonly MeaningHintComponent[];
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
      hanziWordMeaningHintExplanationTextSetting.entity.marshalKey(key),
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
      hanziWordMeaningHintExplanationTextSetting.entity.marshalKey({
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

  return visibleMeanings.length === 0 ? null : (
    <View className="gap-10 p-4 px-10">
      {visibleMeanings.map((entry) => {
        const meaningKey = meaningKeyFromHanziWord(entry.hanziWord);
        const mnemonicHint = mnemonicHints?.find(
          (h) => h.meaningKey === meaningKey,
        )?.hint;
        return (
          <MeaningItem
            key={entry.hanziWord}
            hanzi={hanzi}
            hanziWord={entry.hanziWord}
            meaning={entry}
            mnemonicHint={mnemonicHint}
            aiComponents={aiComponents}
            isEditMode={isEditMode}
          />
        );
      })}
    </View>
  );
}

function MeaningItem({
  hanzi,
  hanziWord,
  meaning,
  mnemonicHint,
  aiComponents,
  isEditMode,
}: {
  hanzi: HanziText;
  hanziWord: HanziWord;
  meaning: Pick<DictionarySearchEntry, `gloss` | `pinyin` | `hsk`>;
  mnemonicHint: string | undefined;
  aiComponents: readonly MeaningHintComponent[];
  isEditMode: boolean;
}) {
  const [showAiModal, setShowAiModal] = useState(false);
  const hintState = useHanziWordMeaningHint(hanziWord);
  const hintSetting = useUserSetting({
    setting: hanziWordMeaningHintTextSetting,
    key: { hanziWord },
  });
  const displayHint = hintState.text ?? mnemonicHint ?? null;
  const hasHint = (displayHint ?? ``).trim().length > 0;

  // Display glosses: first one bold, rest dim and semicolon-separated
  const primaryGloss = meaning.gloss[0];

  return (
    <View className="gap-1">
      <View className="flex-row items-center gap-2">
        <Text className="font-sans text-xl/normal font-medium text-fg-loud">
          <Text className="pyly-bold">{primaryGloss}</Text>
            <Text className="text-fg-dim">⤵</Text>
        </Text>
      </View>
      {isEditMode || hasHint ? (
        <View className={isEditMode ? `gap-2 pl-7` : `gap-1 px-7`}>
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
              >
                Use AI
              </RectButton>
            </View>
          ) : null}

          <InlineEditableSettingText
            setting={hanziWordMeaningHintTextSetting}
            settingKey={{ hanziWord }}
            readonly={!isEditMode}
            placeholder="Add a hint on the first line. Add details after a blank line."
            /* oxlint-disable-next-line typescript/no-deprecated */
            defaultValue={displayHint ?? ``}
            maxLength={80}
            multiline
            showCounterAtRatio={0.8}
            counterLength={hintFirstLineLength}
            overLimitMessage="Keep the first line under 80 characters. Add details after a blank line."
            renderDisplay={(value) => <MergedHintDisplay value={value} />}
          />

          {showAiModal ? (
            <AiMeaningHintModal
              hanzi={hanzi}
              meaning={{
                hanziWord,
                glosses: meaning.gloss,
              }}
              components={aiComponents}
              onApplyHint={({ text, explanation }) => {
                const mergedHintText = composeHintText(text, explanation);
                hintSetting.setValue(
                  mergedHintText == null
                    ? null
                    : {
                        hanziWord,
                        text: mergedHintText,
                      },
                );
              }}
              onDismiss={() => {
                setShowAiModal(false);
              }}
            />
          ) : null}
        </View>
      ) : null}
      {hasHint ? null : (
        <Text className="pl-7 pyly-body-caption text-fg-dim">
          Add a hint to make this meaning easier to recognize.
        </Text>
      )}
    </View>
  );
}

function ExperimentalContent({ hanzi }: { hanzi: HanziText }) {
  const [isPathExpanded, setIsPathExpanded] = useState(false);

  const data = experimentalDataByHanzi[hanzi];
  if (data == null) {
    return null;
  }

  const pathSteps = data.mentalPath;
  const hasIntermediateSteps = pathSteps.length > 2;
  const hiddenStepCount = hasIntermediateSteps ? pathSteps.length - 2 : 0;
  const isCollapsedWithHiddenSteps = hasIntermediateSteps && !isPathExpanded;

  const firstStep = pathSteps.at(0);
  const lastStep = pathSteps.at(-1);

  return (
    <View className="gap-4 px-10 pt-4">
      <View className="gap-1">
        <Text className="pyly-body">{data.coreIdea}</Text>
      </View>

      {isCollapsedWithHiddenSteps && firstStep != null && lastStep != null ? (
        <View className="gap-0 pt-4">
          <View className="min-w-0 flex-row gap-3">
            <View className="w-3 items-center pt-2">
              <View className="size-1.5 rounded-full bg-fg-dim" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5 pb-1">
              <View className="flex-row flex-wrap items-start justify-start gap-1">
                <Text className="pyly-body text-left">
                  {renderMentalPathThought(firstStep.thought)}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            className="min-w-0 flex-row gap-3"
            onPress={() => {
              setIsPathExpanded(true);
            }}
          >
            <View className="w-3 items-center">
              <View className="h-5 w-px bg-fg-dim/35" />
              <Text className="-mt-0.5 pyly-body-caption text-fg-dim/70">
                {`↓`}
              </Text>
            </View>
            <View className="min-w-0 flex-1 justify-center">
              <Text className="text-left pyly-body-caption text-fg-dim/70">
                {`Show ${hiddenStepCount} hidden steps`}
              </Text>
            </View>
          </Pressable>

          <View className="min-w-0 flex-row gap-3">
            <View className="w-3 items-center pt-2">
              <View className="size-1.5 rounded-full bg-fg-dim" />
            </View>
            <View className="min-w-0 flex-1 gap-0.5 pb-2">
              <View className="flex-row flex-wrap items-start justify-start gap-1">
                <Text className="pyly-body text-left">
                  {renderMentalPathThought(lastStep.thought)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : (
        <View className="gap-1 pt-4">
          {pathSteps.map((step, stepIndex) => {
            const linkReason = step.reason ?? null;
            const isIntermediateStep =
              stepIndex > 0 && stepIndex < pathSteps.length - 1;
            const isLastStep = stepIndex === pathSteps.length - 1;

            return (
              <View
                className="min-w-0 flex-row gap-3"
                key={`mental:${stepIndex}`}
              >
                <Pressable
                  className="w-3 items-center pt-2"
                  onPress={
                    isLastStep
                      ? undefined
                      : () => {
                          setIsPathExpanded(false);
                        }
                  }
                >
                  <View
                    className={
                      isIntermediateStep
                        ? `size-1.5 rounded-full bg-fg-dim/70`
                        : `size-1.5 rounded-full bg-fg-dim`
                    }
                  />
                  {isLastStep ? null : (
                    <>
                      <View className="mt-1 w-px flex-1 bg-fg-dim/35" />
                      <Text className="-mt-1 pyly-body-caption text-fg-dim/70">
                        {`↓`}
                      </Text>
                    </>
                  )}
                </Pressable>

                <View className="min-w-0 flex-1 gap-0.5 pb-2">
                  <View className="flex-row flex-wrap items-start justify-start gap-1">
                    <Text
                      className={
                        isIntermediateStep
                          ? `pyly-body text-left text-fg-dim`
                          : `pyly-body text-left`
                      }
                    >
                      {renderMentalPathThought(step.thought)}
                    </Text>
                  </View>
                  {linkReason == null || !isPathExpanded ? null : (
                    <Text className="text-left pyly-body-caption text-fg-dim">
                      {linkReason}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

function renderMentalPathThought(thought: string): ReactNode {
  return thought;
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
      <Text className="font-medium">
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

interface ExperimentalCharacterData {
  readonly coreIdea: string;
  readonly mentalPath: readonly {
    readonly thought: string;
    readonly reason?: string;
  }[];
  readonly scene: string;
  readonly strength: string;
  readonly why: string;
}

const experimentalDataByHanzi: Readonly<
  Partial<Record<string, ExperimentalCharacterData>>
> = {
  表: {
    coreIdea: `A stack of ornate cloth is something you put on display, which leads naturally to showing or expressing something.`,
    mentalPath: [
      {
        thought: `a stack of ornate cloth`,
        reason: `Ornate cloth is usually meant to be displayed rather than hidden.`,
      },
      {
        thought: `put it on display`,
        reason: `Putting something on display means showing it openly.`,
      },
      {
        thought: `show openly`,
        reason: `Showing something openly easily extends to showing what you think.`,
      },
      {
        thought: `to express (one's opinion)`,
      },
    ],
    scene: `A shopkeeper arranges a stack of ornate cloth and puts it on display.`,
    strength: `strong`,
    why: `The path is short and concrete: stacked decorative cloth suggests display, and display leads naturally to showing or expressing.`,
  },
  春: {
    coreIdea: `Open hands held in the sun suggest warmer weather, which naturally brings spring.`,
    mentalPath: [
      {
        thought: `open hands in the sun`,
        reason: `People naturally picture feeling warmth from the sun on their hands.`,
      },
      {
        thought: `warm day`,
        reason: `A warm day is a familiar sign that winter is ending and spring is arriving.`,
      },
      {
        thought: `spring`,
      },
    ],
    scene: `I hold my open hands in the sun on a warm day, and it feels like spring.`,
    strength: `strong`,
    why: `This path uses a very familiar everyday experience: sunshine on your hands suggests warmer weather, which strongly cues spring.`,
  },
};
