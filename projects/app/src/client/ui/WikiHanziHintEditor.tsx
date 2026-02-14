import { useRizzle } from "@/client/ui/hooks/useRizzle";
import {
  hanziWordMeaningHintExplanationSetting,
  hanziWordMeaningHintImageSetting,
  hanziWordMeaningHintTextSetting,
  useUserSetting,
} from "@/client/ui/hooks/useUserSetting";
import { getWikiCharacterData } from "@/client/wiki";
import { walkIdsNodeLeafs } from "@/data/hanzi";
import type { HanziWord } from "@/data/model";
import {
  glossOrThrow,
  hanziFromHanziWord,
  loadDictionary,
  meaningKeyFromHanziWord,
} from "@/dictionary";
import { nanoid } from "@/util/nanoid";
import { Link } from "expo-router";
import { use, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AllHintsModal } from "./AllHintsModal";
import { InlineEditableSettingImage } from "./InlineEditableSettingImage";
import { InlineEditableSettingText } from "./InlineEditableSettingText";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";

interface WikiHanziHintEditorProps {
  hanziWord: HanziWord;
}

export function WikiHanziHintEditor({ hanziWord }: WikiHanziHintEditorProps) {
  const hanzi = hanziFromHanziWord(hanziWord);
  const meaningKey = meaningKeyFromHanziWord(hanziWord);

  const dictionary = use(loadDictionary());
  const meaning = dictionary.lookupHanziWord(hanziWord);

  // Load character data
  const characterData = use(getWikiCharacterData(hanzi)) ?? null;

  const rep = useRizzle();
  const hintSettingKey = { hanziWord };
  const hintSetting = useUserSetting(
    hanziWordMeaningHintTextSetting,
    hintSettingKey,
  );
  const explanationSetting = useUserSetting(
    hanziWordMeaningHintExplanationSetting,
    hintSettingKey,
  );
  const imageSetting = useUserSetting(
    hanziWordMeaningHintImageSetting,
    hintSettingKey,
  );

  const [showHintGalleryModal, setShowHintGalleryModal] = useState(false);

  // Get available hints for this meaning
  const availableHints =
    characterData?.mnemonic?.hints?.filter(
      (h) => h.meaningKey === meaningKey,
    ) ?? [];

  // If no hints match the meaningKey exactly, show all hints
  const hintsToShow =
    availableHints.length > 0
      ? availableHints
      : (characterData?.mnemonic?.hints ?? []);

  const selectedHint = (hintSetting.value as { t?: string } | null)?.t ?? null;
  const currentPresetHint =
    selectedHint == null
      ? null
      : (hintsToShow.find((hint) => hint.hint === selectedHint) ?? null);

  const presetImageAssetIds = Array.from(
    new Set(hintsToShow.flatMap((hint) => hint.imageAssetIds ?? [])),
  );

  const imageId = imageSetting.value?.imageId ?? null;

  const setHintSettingValue = (
    hintHanziWord: HanziWord,
    value: string | null | undefined,
  ) => {
    const marshaledValue =
      value == null
        ? null
        : hanziWordMeaningHintTextSetting.marshalValue({
            hanziWord: hintHanziWord,
            text: value,
          });
    const storedValue =
      marshaledValue == null
        ? null
        : Object.fromEntries(
            Object.entries(marshaledValue as Record<string, unknown>).filter(
              ([key]) => key !== `h`,
            ),
          );

    void rep.mutate.setSetting({
      key: hanziWordMeaningHintTextSetting.marshalKey({
        hanziWord: hintHanziWord,
      }),
      value: storedValue,
      now: new Date(),
      historyId: nanoid(),
    });
  };

  const setExplanationSettingValue = (
    hintHanziWord: HanziWord,
    value: string | null | undefined,
  ) => {
    const marshaledValue =
      value == null
        ? null
        : hanziWordMeaningHintExplanationSetting.marshalValue({
            hanziWord: hintHanziWord,
            text: value,
          });
    const storedValue =
      marshaledValue == null
        ? null
        : Object.fromEntries(
            Object.entries(marshaledValue as Record<string, unknown>).filter(
              ([key]) => key !== `h`,
            ),
          );

    void rep.mutate.setSetting({
      key: hanziWordMeaningHintExplanationSetting.marshalKey({
        hanziWord: hintHanziWord,
      }),
      value: storedValue,
      now: new Date(),
      historyId: nanoid(),
    });
  };

  const setImageSettingValue = (
    hintHanziWord: HanziWord,
    value: string | null | undefined,
  ) => {
    const marshaledValue =
      value == null
        ? null
        : hanziWordMeaningHintImageSetting.marshalValue({
            hanziWord: hintHanziWord,
            imageId: value,
          });
    const storedValue =
      marshaledValue == null
        ? null
        : Object.fromEntries(
            Object.entries(marshaledValue as Record<string, unknown>).filter(
              ([key]) => key !== `h`,
            ),
          );

    void rep.mutate.setSetting({
      key: hanziWordMeaningHintImageSetting.marshalKey({
        hanziWord: hintHanziWord,
      }),
      value: storedValue,
      now: new Date(),
      historyId: nanoid(),
    });
  };

  const handleUploadError = (error: string) => {
    console.error(`Upload error:`, error);
  };

  // Get components for the lozenge
  const components: { hanzi: string | undefined; label: string }[] = [];
  if (characterData?.mnemonic) {
    for (const visualComponent of walkIdsNodeLeafs(
      characterData.mnemonic.components,
    )) {
      const label =
        visualComponent.label ??
        (visualComponent.hanzi == null
          ? null
          : dictionary
              .lookupHanzi(visualComponent.hanzi)
              .map(([, m]) => m.gloss[0])
              .join(` / `));
      if (label != null && label !== ``) {
        components.push({
          hanzi: visualComponent.hanzi,
          label,
        });
      }
    }
  }

  const primaryGloss = glossOrThrow(hanziWord, meaning);
  const alternativeGlosses = meaning?.gloss.slice(1) ?? [];
  const fallbackHint = hintsToShow[0];
  const currentHintText = selectedHint ?? fallbackHint?.hint ?? ``;
  let currentHintExplanation = currentPresetHint?.explanation;
  const explanationOverride =
    (explanationSetting.value as { t?: string } | null)?.t ?? undefined;
  currentHintExplanation ??=
    selectedHint == null ? fallbackHint?.explanation : explanationOverride;
  let currentHintImageIds: readonly string[] | null = null;
  if (imageId == null) {
    currentHintImageIds =
      currentPresetHint?.imageAssetIds ?? fallbackHint?.imageAssetIds ?? null;
  } else {
    currentHintImageIds = [imageId];
  }
  const hasCurrentHint = currentHintText.length > 0;
  const canOpenGallery = hintsToShow.length > 0;

  return (
    <ScrollView className="flex-1 bg-bg">
      {/* Header */}
      <View className="gap-3 bg-bg-high p-4">
        <View className="flex-row items-center gap-2">
          <Link href={`/wiki/${encodeURIComponent(hanzi)}`}>
            <Text className="text-[13px] font-medium text-fg-dim">{hanzi}</Text>
          </Link>
          <Text className="text-[13px] text-fg-dim">/</Text>
          <Text className="text-[13px] text-fg-dim">Edit</Text>
        </View>
        <View className="flex-row items-baseline gap-2.5">
          <Text className="text-[19px] font-semibold text-fg-loud">
            {hanzi}
          </Text>
          <Text className="text-[16px] font-medium text-fg-loud">
            {primaryGloss}
          </Text>
          {alternativeGlosses.map((gloss, index) => (
            <Text key={index} className="text-[16px] font-medium text-fg-dim">
              {gloss}
            </Text>
          ))}
        </View>

        {/* Components lozenge */}
        {components.length > 0 && (
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="rounded-full bg-fg-bg15 px-2 py-0.5">
              <Text className="text-[13px] text-fg">Components</Text>
            </View>
            <Text className="text-[15px] text-fg-loud">
              {components
                .map((c) =>
                  c.hanzi == null ? `(${c.label})` : `${c.hanzi} (${c.label})`,
                )
                .join(`, `)}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="gap-4 p-4">
        {/* Hints section */}
        <View className="gap-1">
          <Text className="pyly-body-subheading">Choose a hint</Text>
          <Text className="text-[14px] text-fg-dim">
            Pick a hint that works for your brain
          </Text>
        </View>

        <View className="gap-3">
          <View className="gap-2">
            <View className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3">
              <InlineEditableSettingText
                variant="hint"
                setting={hanziWordMeaningHintTextSetting}
                settingKey={hintSettingKey}
                placeholder="Add a hint"
                renderDisplay={(value) => <Pylymark source={value} />}
              />

              <InlineEditableSettingText
                variant="hintExplanation"
                setting={hanziWordMeaningHintExplanationSetting}
                settingKey={hintSettingKey}
                placeholder="Add an explanation"
                multiline
                renderDisplay={(value) => <Pylymark source={value} />}
              />
            </View>
          </View>

          <View className="items-center">
            <RectButton
              variant="bare"
              onPress={() => {
                setShowHintGalleryModal(true);
              }}
              disabled={!canOpenGallery}
            >
              Browse hints
            </RectButton>
          </View>

          {canOpenGallery ? null : (
            <Text className="text-[13px] text-fg-dim">
              No system hints available for this character
            </Text>
          )}
        </View>

        {/* Image selection section */}
        <View className="gap-2 pt-2">
          <View className="gap-1">
            <Text className="pyly-body-subheading">Choose an image</Text>
            <Text className="text-[14px] text-fg-dim">
              Pick the image that should appear on the wiki page
            </Text>
          </View>
          <InlineEditableSettingImage
            setting={hanziWordMeaningHintImageSetting}
            settingKey={hintSettingKey}
            presetImageIds={presetImageAssetIds}
            previewHeight={200}
            tileSize={64}
            enablePasteDropZone
            frameConstraint={{ aspectRatio: 2 }}
            onUploadError={handleUploadError}
          />
        </View>
      </View>

      {/* All hints modal */}
      {showHintGalleryModal && (
        <AllHintsModal
          hanzi={hanzi}
          onDismiss={() => {
            setShowHintGalleryModal(false);
          }}
          presetHints={hintsToShow.map((hint) => ({
            hint: hint.hint,
            explanation: hint.explanation,
            imageIds: hint.imageAssetIds ?? null,
            meaningKey: hint.meaningKey,
          }))}
          currentHint={
            hasCurrentHint
              ? {
                  hint: currentHintText,
                  explanation: currentHintExplanation,
                  imageIds: currentHintImageIds,
                }
              : null
          }
          onSavePresetHint={(hintHanziWord, presetHint) => {
            setHintSettingValue(hintHanziWord, presetHint.hint);
            setExplanationSettingValue(
              hintHanziWord,
              presetHint.explanation ?? null,
            );
            setImageSettingValue(
              hintHanziWord,
              presetHint.imageIds?.[0] ?? null,
            );
          }}
        />
      )}
    </ScrollView>
  );
}
