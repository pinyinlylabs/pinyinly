import { trpc } from "@/client/trpc";
import { buildPronunciationHintPrompt } from "@/util/prompts";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AiPromptPreview } from "./AiPromptPreview";
import { PageSheetModal } from "./PageSheetModal";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { TextInputMulti } from "./TextInputMulti";
import { memoize0 } from "@pinyinly/lib/collections";

export interface AiPronunciationHintModalProps {
  leadCharacter: { name: string; bio?: string; article?: string };
  location: { name: string; description?: string };
  cue: { word: string; meaning?: string };
  onApplyHint: (hint: { text: string; explanation?: string | null }) => void;
  onDismiss: () => void;
}

type HintSuggestion = {
  hint: string;
  explanation?: string | null;
};

export function AiPronunciationHintModal({
  leadCharacter,
  location,
  cue,
  onApplyHint,
  onDismiss,
}: AiPronunciationHintModalProps) {
  const creativeDirectionMaxLength = 500;
  const [suggestions, setSuggestions] = useState<HintSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creativeDirection, setCreativeDirection] = useState(``);
  const [hasSettledGeneration, setHasSettledGeneration] = useState(false);

  const generateMutation = trpc.ai.generatePronunciationHints.useMutation();

  const requestInput = {
    leadCharacter: {
      name: leadCharacter.name,
      ...(leadCharacter.article == null
        ? {}
        : { article: leadCharacter.article }),
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
    ...(creativeDirection.trim() === ``
      ? {}
      : { creativeDirection: creativeDirection.trim() }),
    count: 4,
  };

  const pronunciationPrompt = buildPronunciationHintPrompt(requestInput);

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
            <View className="w-[72px]" />
          </View>

          <ScrollView className="flex-1" contentContainerClassName="gap-4 p-4">
            <View className="gap-2">
              <Text className="pyly-body-subheading">Creative direction</Text>
              <Text className="font-sans text-[14px] text-fg-dim">
                Optional: steer tone, style, or scene direction like a creative
                director.
              </Text>
              <TextInputMulti
                value={creativeDirection}
                onChangeText={setCreativeDirection}
                placeholder="Example: surreal and playful, like a tiny heist comedy with one striking visual moment"
                maxLength={creativeDirectionMaxLength}
                autoResizeMinHeight={90}
              />
              <Text className="font-sans text-[12px] text-fg-dim">
                {creativeDirection.length}/{creativeDirectionMaxLength}
              </Text>
            </View>

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
                <View className="gap-3">
                  {suggestions.map((suggestion, index) => (
                    <View
                      key={`${index}-${suggestion.hint}`}
                      className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3"
                    >
                      <View className="flex-row items-center justify-end">
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
                  messages: pronunciationPrompt.messages,
                },
              ]}
            />
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}
