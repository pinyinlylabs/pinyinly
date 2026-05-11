import { trpc } from "@/client/trpc";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { PageSheetModal } from "./PageSheetModal";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";

export interface AiMeaningHintModalProps {
  hanzi: string;
  meaning: { hanziWord: string; glosses: readonly string[] };
  components: readonly MeaningHintComponent[];
  onApplyHint: (hint: { text: string; explanation?: string | null }) => void;
  onDismiss: () => void;
}

export interface MeaningHintComponent {
  hanzi?: string;
  label?: string;
  meaning?: string;
}

type HintSuggestion = {
  hint: string;
  explanation?: string | null;
  confidence: number;
  strategyLabel: string;
};

export function AiMeaningHintModal({
  hanzi,
  meaning,
  components,
  onApplyHint,
  onDismiss,
}: AiMeaningHintModalProps) {
  const [suggestions, setSuggestions] = useState<HintSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = trpc.ai.generateMeaningHints.useMutation();

  const handleGenerate = async () => {
    setError(null);

    try {
      const result = await generateMutation.mutateAsync({
        hanzi,
        meaning: {
          hanziWord: meaning.hanziWord,
          glosses: [...meaning.glosses],
        },
        components: components.map((component) => ({ ...component })),
        count: 4,
      });
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error(`AI meaning hint generation failed:`, err);
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
            <Text className="font-sans text-[17px] font-semibold text-fg-loud">
              AI meaning hint creator
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
              <Text className="font-sans text-[14px] text-fg-dim">
                The AI uses the meaning and character components to build a
                recognition hint.
              </Text>
            </View>

            <View className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3">
              <HintContextRow label="Character" value={hanzi} />
              <HintContextRow
                label="Meaning"
                value={formatMeaning(meaning.hanziWord, meaning.glosses)}
              />
              <HintContextRow
                label="Components"
                value={formatComponentsSummary(components)}
              />
            </View>

            {error == null ? null : (
              <Text className="font-sans text-[14px] text-[crimson]">
                {error}
              </Text>
            )}

            <View className="gap-2">
              <Text className="pyly-body-subheading">Suggestions</Text>
              {isGenerating ? (
                <Text className="font-sans text-[14px] text-fg-dim">
                  Generating hints...
                </Text>
              ) : null}

              {suggestions == null ? (
                <Text className="font-sans text-[14px] text-fg-dim">
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
                        <View className="flex-row items-center gap-2">
                          <Text className="font-sans text-[13px] text-fg-dim">
                            Confidence:{` `}
                            {formatConfidence(suggestion.confidence)}
                          </Text>
                          <Text
                            className={`
                              rounded bg-fg-bg10 px-2 py-0.5 font-sans text-[11px] font-semibold
                              uppercase tracking-wide text-fg-dim
                            `}
                          >
                            {suggestion.strategyLabel}
                          </Text>
                        </View>
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
                        <Text className="font-sans text-[13px] text-fg-dim">
                          <Pylymark source={suggestion.explanation} />
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
      <Text className="w-[90px] font-sans text-[13px] text-fg-dim">
        {label}
      </Text>
      <Text className="flex-1 font-sans text-[13px] text-fg">{value}</Text>
    </View>
  );
}

function formatMeaning(hanziWord: string, glosses: readonly string[]) {
  const primaryGloss = glosses[0] ?? ``;
  const extra = glosses.slice(1);
  return extra.length === 0
    ? `${hanziWord}: ${primaryGloss}`
    : `${hanziWord}: ${primaryGloss}; ${extra.join(`; `)}`;
}

function formatComponentsSummary(components: readonly MeaningHintComponent[]) {
  if (components.length === 0) {
    return `No component context available.`;
  }

  return components
    .map((component) => {
      const head = component.hanzi ?? component.label ?? component.meaning;
      if (head == null) {
        return `Unknown component`;
      }
      const detail = component.meaning ?? component.label;
      if (detail == null || detail === head) {
        return head;
      }
      return `${head} (${detail})`;
    })
    .join(`, `);
}

function formatConfidence(value: number) {
  const normalized = Number.isFinite(value) ? value : 0;
  const clamped = Math.max(0, Math.min(1, normalized));
  return `${Math.round(clamped * 100)}%`;
}
