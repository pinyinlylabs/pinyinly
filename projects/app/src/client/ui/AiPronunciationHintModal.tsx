import { trpc } from "@/client/trpc";
import type { HanziText, PinyinUnit } from "@/data/model";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";

export type PronunciationSoundDetails = {
  soundId: string;
  name?: string | null;
  description?: string | null;
};

export type PronunciationSceneDetails = {
  description?: string | null;
};

export interface AiPronunciationHintModalProps {
  hanzi: HanziText;
  pinyinUnit: PinyinUnit;
  gloss: string;
  initial: PronunciationSoundDetails | null;
  final: PronunciationSoundDetails | null;
  tone: PronunciationSoundDetails | null;
  toneNumber: number | null;
  finalToneScene: PronunciationSceneDetails | null;
  onApplyHint: (hint: { text: string; explanation?: string | null }) => void;
  onDismiss: () => void;
}

type HintSuggestion = {
  hint: string;
  explanation?: string | null;
  confidence: number;
};

export function AiPronunciationHintModal({
  hanzi,
  pinyinUnit,
  gloss,
  initial,
  final,
  tone,
  toneNumber,
  finalToneScene,
  onApplyHint,
  onDismiss,
}: AiPronunciationHintModalProps) {
  const [suggestions, setSuggestions] = useState<HintSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = trpc.ai.generatePronunciationHints.useMutation();

  const handleGenerate = async () => {
    setError(null);

    try {
      const result = await generateMutation.mutateAsync({
        hanzi,
        pinyin: pinyinUnit,
        gloss,
        initial,
        final,
        tone,
        toneNumber,
        finalToneScene,
        count: 4,
      });
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error(`AI hint generation failed:`, err);
      setError(`Unable to generate hints right now.`);
    }
  };

  const isGenerating = generateMutation.isPending;

  return (
    <PageSheetModal
      onDismiss={onDismiss}
      suspenseFallback={<Text>Loading...</Text>}
    >
      {({ dismiss }) => (
        <View className="flex-1 bg-bg">
          <View className="flex-row items-center justify-between border-b border-fg/10 px-4 py-3">
            <RectButton variant="bare" onPress={dismiss}>
              Cancel
            </RectButton>
            <Text className="text-[17px] font-semibold text-fg-loud">
              AI hint creator
            </Text>
            <RectButton
              variant="bare"
              onPress={() => {
                void handleGenerate();
              }}
              disabled={isGenerating}
            >
              Generate
            </RectButton>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
            <View className="gap-1">
              <Text className="pyly-body-subheading">Context</Text>
              <Text className="text-[14px] text-fg-dim">
                The AI uses your sound characters and scene descriptions to
                craft a pronunciation hint.
              </Text>
            </View>

            <View className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3">
              <HintContextRow label="Hanzi" value={hanzi} />
              <HintContextRow label="Pinyin" value={pinyinUnit} />
              <HintContextRow label="Gloss" value={gloss} />
              <HintContextRow
                label="Initial"
                value={formatSoundDetails(initial)}
              />
              <HintContextRow label="Final" value={formatSoundDetails(final)} />
              <HintContextRow label="Tone" value={formatSoundDetails(tone)} />
              <HintContextRow
                label="Tone scene"
                value={formatSceneDetails(finalToneScene, toneNumber)}
              />
            </View>

            {error == null ? null : (
              <Text className="text-[14px] text-[crimson]">{error}</Text>
            )}

            <View className="gap-2">
              <Text className="pyly-body-subheading">Suggestions</Text>
              {isGenerating ? (
                <Text className="text-[14px] text-fg-dim">
                  Generating hints...
                </Text>
              ) : null}

              {suggestions == null ? (
                <Text className="text-[14px] text-fg-dim">
                  Press Generate to get AI suggestions.
                </Text>
              ) : (
                <View className="gap-3">
                  {suggestions.map((suggestion, index) => (
                    <View
                      key={`${index}-${suggestion.hint}`}
                      className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[13px] text-fg-dim">
                          Confidence: {formatConfidence(suggestion.confidence)}
                        </Text>
                        <RectButton
                          variant="bare"
                          onPress={() => {
                            onApplyHint({
                              text: suggestion.hint,
                              explanation: suggestion.explanation ?? null,
                            });
                            dismiss();
                          }}
                        >
                          Use hint
                        </RectButton>
                      </View>
                      <Text className="pyly-body">
                        <Pylymark source={suggestion.hint} />
                      </Text>
                      {suggestion.explanation == null ? null : (
                        <Text className="text-[13px] text-fg-dim">
                          {suggestion.explanation}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}

function HintContextRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <Text className="w-[90px] text-[13px] text-fg-dim">{label}</Text>
      <Text className="flex-1 text-[13px] text-fg">{value}</Text>
    </View>
  );
}

function formatSoundDetails(details: PronunciationSoundDetails | null) {
  if (details == null) {
    return `Not set`;
  }

  const name = cleanText(details.name) ?? details.soundId;
  const description = cleanText(details.description);

  if (description == null) {
    return name;
  }

  return `${name} - ${description}`;
}

function formatSceneDetails(
  scene: PronunciationSceneDetails | null,
  toneNumber: number | null,
) {
  const description = cleanText(scene?.description);
  if (description == null) {
    return toneNumber == null ? `Not set` : `Tone ${toneNumber}: Not set`;
  }

  if (toneNumber == null) {
    return description;
  }

  return `Tone ${toneNumber}: ${description}`;
}

function formatConfidence(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  const clamped = Math.max(0, Math.min(1, normalized));
  return `${Math.round(clamped * 100)}%`;
}

function cleanText(value?: string | null) {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}
