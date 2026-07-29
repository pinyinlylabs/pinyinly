import { trpc } from "@/client/trpc";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AiPromptPreview } from "./AiPromptPreview";
import { PageSheetModal } from "./PageSheetModal";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { memoize0 } from "@pinyinly/lib/collections";
import { buildPronunciationHintFantasyPrompt } from "@/util/prompts/pronunciationHintFantasy";
import { buildPronunciationHintRealisticPrompt } from "@/util/prompts/pronunciationHintRealistic";

export interface AiPronunciationHintModalProps {
  leadCharacter: { name: string; bio?: string };
  location: { name: string; description?: string };
  cue: { word: string; meaning?: string };
  onApplyHint: (hint: { text: string; explanation?: string | null }) => void;
  onDismiss: () => void;
}

type HintSuggestion = {
  hint: string;
  explanation?: string | null;
  strategyLabel: string;
};

function formatLocationForPreamble(locationName: string): string {
  const normalizedLocationName = locationName.trim();
  if (normalizedLocationName.length === 0) {
    return locationName;
  }

  if (/^(?:the|a|an)\s+/iu.test(normalizedLocationName)) {
    return normalizedLocationName;
  }

  // Natural English usually expects an article in phrases like "basement of ...".
  if (/^[a-z][\w-]*\s+of\b/u.test(normalizedLocationName)) {
    return `the ${normalizedLocationName}`;
  }

  return normalizedLocationName;
}

function capitalizeFirstLetter(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildLocationIntroPhrase(locationName: string): string {
  const normalizedLocationName = formatLocationForPreamble(locationName);

  if (normalizedLocationName.length === 0) {
    return `In an unknown place`;
  }

  // For location labels that already start with a preposition (e.g. "inside Broadway Mall"),
  // don't prepend another "In".
  if (
    /^(?:in|inside|outside|within|near|beside|behind|under|over|above|below|between|around|across|along|through|by|at|on)\b/iu.test(
      normalizedLocationName,
    )
  ) {
    return capitalizeFirstLetter(normalizedLocationName);
  }

  return `In ${normalizedLocationName}`;
}

function buildPronunciationStoryPreamble({
  leadCharacter,
  location,
}: {
  leadCharacter: { name: string };
  location: { name: string };
}): string {
  const characterName = leadCharacter.name;
  const locationPhrase = buildLocationIntroPhrase(location.name);

  return `${locationPhrase}, ${characterName} is...`;
}

function normalizePronunciationStoryEnding(ending: string): string {
  const normalized = ending.replaceAll(`\r\n`, `\n`).trim();
  if (normalized.length === 0) {
    return ``;
  }

  const withoutLeadingEllipsis = normalized
    .replaceAll(/^\.\.\.\s*|^\u2026\s*/gu, ``)
    .trim();
  const withoutLeadingPronoun = withoutLeadingEllipsis
    .replace(/^(?:it|he|she|they)\s+/iu, ``)
    .trim();

  const withoutLeadingAuxiliary = withoutLeadingPronoun
    .replace(/^(?:is|are|was|were)\s+/iu, ``)
    .trim();

  // Treat suggestions as sentence continuations so they read naturally after the preamble.
  return withoutLeadingAuxiliary.replace(
    /^(?<prefix>["'([{]*)(?<head>[A-Z])(?![A-Z])/u,
    (_match, prefix: string, head: string) => `${prefix}${head.toLowerCase()}`,
  );
}

function composePronunciationStoryHint({
  preamble,
  ending,
}: {
  preamble: string;
  ending: string;
}): string {
  const normalizedPreamble = preamble.trim();
  const normalizedEnding = normalizePronunciationStoryEnding(ending);

  if (normalizedEnding.length === 0) {
    return normalizedPreamble;
  }

  return `${normalizedPreamble} ${normalizedEnding}`.trim();
}

export function AiPronunciationHintModal({
  leadCharacter,
  location,
  cue,
  onApplyHint,
  onDismiss,
}: AiPronunciationHintModalProps) {
  const [suggestions, setSuggestions] = useState<HintSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSettledGeneration, setHasSettledGeneration] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<
    number | null
  >(null);

  const generateMutation = trpc.ai.generatePronunciationHints.useMutation();

  const requestInput = {
    leadCharacter: {
      name: leadCharacter.name,
      ...(leadCharacter.bio == null ? {} : { bio: leadCharacter.bio }),
    },
    location: {
      name: location.name,
      ...(location.description == null
        ? {}
        : { description: location.description }),
    },
    cue: {
      word: cue.word,
      ...(cue.meaning == null ? {} : { meaning: cue.meaning }),
    },
    count: 4,
  };

  const fantasyPrompt = buildPronunciationHintFantasyPrompt(requestInput);
  const realisticPrompt = buildPronunciationHintRealisticPrompt(requestInput);
  const storyPreamble = buildPronunciationStoryPreamble({
    leadCharacter,
    location,
  });

  const handleGenerate = async () => {
    setError(null);
    setHasSettledGeneration(false);

    try {
      const result = await generateMutation.mutateAsync(requestInput);
      setSuggestions((prevSuggestions) => [
        ...(prevSuggestions ?? []),
        ...result.suggestions,
      ]);
    } catch (err) {
      console.error(`AI hint generation failed:`, err);
      setError(`Unable to generate hints right now.`);
    } finally {
      setHasSettledGeneration(true);
    }
  };

  const isGenerating = generateMutation.isPending;
  const selectedSuggestion =
    selectedSuggestionIndex == null
      ? null
      : suggestions?.[selectedSuggestionIndex];
  const canApplySelectedHint = selectedSuggestion != null;

  const initialHandleGenerateRef = useRef(memoize0(handleGenerate));
  useEffect(() => {
    void initialHandleGenerateRef.current();
  }, [initialHandleGenerateRef]);

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
              AI hint creator
            </Text>
            <RectButton
              variant="bare"
              disabled={!canApplySelectedHint}
              onPress={() => {
                if (selectedSuggestion == null) {
                  return;
                }

                onApplyHint({
                  text: composePronunciationStoryHint({
                    preamble: storyPreamble,
                    ending: selectedSuggestion.hint,
                  }),
                  explanation: selectedSuggestion.explanation ?? null,
                });
                dismiss();
              }}
            >
              Apply
            </RectButton>
          </View>

          <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
            {error == null ? null : (
              <Text className="font-sans text-[14px] text-[crimson]">
                {error}
              </Text>
            )}

            <View className="gap-2">
              <Text className="pyly-body-subheading">Suggestions</Text>
              {!hasSettledGeneration || isGenerating ? (
                <Text className="font-sans text-[14px] text-fg-dim">
                  Generating hints...
                </Text>
              ) : null}

              {suggestions == null ? (
                error == null && hasSettledGeneration ? (
                  <Text className="font-sans text-[14px] text-fg-dim">
                    No hints generated.
                  </Text>
                ) : null
              ) : (
                <View className="rounded-lg border border-fg-bg10 bg-fg-bg5 px-3 py-2">
                  <Text className="pyly-body pb-1">
                    <Pylymark source={storyPreamble} />
                  </Text>

                  <View className="gap-0.5">
                    {suggestions.map((suggestion, index) => (
                      <Pressable
                        key={`${index}-${suggestion.hint}`}
                        onPress={() => {
                          setSelectedSuggestionIndex(index);
                        }}
                      >
                        <View
                          className={
                            selectedSuggestionIndex === index
                              ? `gap-1 rounded-md bg-cyan/10 p-2`
                              : `gap-1 rounded-md p-2`
                          }
                        >
                          <View className="flex-row items-start gap-2">
                            <View
                              className={
                                selectedSuggestionIndex === index
                                  ? `mt-0.5 size-[16px] items-center justify-center rounded-full ` +
                                    `border-2 border-cyan`
                                  : `mt-0.5 size-[16px] items-center justify-center rounded-full ` +
                                    `border border-fg/35`
                              }
                            >
                              {selectedSuggestionIndex === index ? (
                                <View className="size-[8px] rounded-full bg-cyan" />
                              ) : null}
                            </View>
                            <View className="flex-1 gap-1">
                              <Text
                                className={
                                  `
                                    w-fit rounded bg-fg-bg10 px-2 py-0.5 font-sans text-[11px]
                                    font-semibold
                                  ` + `tracking-wide text-fg-dim uppercase`
                                }
                              >
                                {suggestion.strategyLabel}
                              </Text>
                              <Text className="pyly-body flex-1">
                                <Pylymark
                                  source={normalizePronunciationStoryEnding(
                                    suggestion.hint,
                                  )}
                                />
                              </Text>
                            </View>
                          </View>

                          {suggestion.explanation == null ? null : (
                            <Text className="pl-6 font-sans text-[13px] text-fg-dim">
                              <Pylymark source={suggestion.explanation} />
                            </Text>
                          )}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {hasSettledGeneration && !isGenerating ? (
                <RectButton
                  variant="bareDim"
                  onPress={() => {
                    void handleGenerate();
                  }}
                >
                  Generate more
                </RectButton>
              ) : null}
            </View>

            <AiPromptPreview
              sections={[
                {
                  title: `Fantasy`,
                  messages: fantasyPrompt.messages,
                },
                {
                  title: `Realistic`,
                  messages: realisticPrompt.messages,
                },
              ]}
            />
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}
