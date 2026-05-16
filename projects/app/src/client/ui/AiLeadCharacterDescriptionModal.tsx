import { trpc } from "@/client/trpc";
import { buildLeadCharacterDescriptionPrompt } from "@/util/prompts";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AiPromptPreview } from "./AiPromptPreview";
import { PageSheetModal } from "./PageSheetModal";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";

export interface AiLeadCharacterDescriptionModalProps {
  characterName: string;
  sound: string;
  existingDescription?: string;
  onApplyDescription: (description: string) => void;
  onDismiss: () => void;
}

type DescriptionSuggestion = {
  description: string;
  explanation?: string | null;
};

export function AiLeadCharacterDescriptionModal({
  characterName,
  sound,
  existingDescription,
  onApplyDescription,
  onDismiss,
}: AiLeadCharacterDescriptionModalProps) {
  const [suggestions, setSuggestions] = useState<
    DescriptionSuggestion[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation =
    trpc.ai.generateLeadCharacterDescriptions.useMutation();

  const leadCharacterPrompt = buildLeadCharacterDescriptionPrompt({
    name: characterName,
    sound,
    existingDescription,
    count: 4,
  });

  const handleGenerate = async () => {
    setError(null);
    try {
      const result = await generateMutation.mutateAsync({
        name: characterName,
        sound,
        existingDescription,
        count: 4,
      });
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error(`AI lead character description generation failed:`, err);
      setError(`Unable to generate descriptions right now.`);
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
              AI character description
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
            <AiPromptPreview
              description="Prompt text generated from the same builder used by AI description generation."
              sections={[
                {
                  system: leadCharacterPrompt.system,
                  user: leadCharacterPrompt.user,
                },
              ]}
            />

            {error == null ? null : (
              <Text className="font-sans text-[14px] text-[crimson]">
                {error}
              </Text>
            )}

            <View className="gap-2">
              <Text className="pyly-body-subheading">Suggestions</Text>
              {isGenerating ? (
                <Text className="font-sans text-[14px] text-fg-dim">
                  Generating descriptions...
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
                      key={`${index}-${suggestion.description}`}
                      className="gap-2 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3"
                    >
                      <View className="flex-row items-center justify-end">
                        <RectButton
                          variant="bare"
                          onPress={() => {
                            onApplyDescription(suggestion.description);
                            dismiss();
                          }}
                        >
                          Use description
                        </RectButton>
                      </View>
                      <Text className="pyly-body">
                        <Pylymark source={suggestion.description} />
                      </Text>
                      {suggestion.explanation == null ? null : (
                        <Text className="font-sans text-[13px] text-fg-dim">
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
