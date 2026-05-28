import { trpc } from "@/client/trpc";
import { buildSubLocationDescriptionPrompt } from "@/util/prompts";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AiPromptPreview } from "./AiPromptPreview";
import { PageSheetModal } from "./PageSheetModal";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";
import { memoize0 } from "@pinyinly/lib/collections";

export interface AiSubLocationDescriptionModalProps {
  label: string;
  location: string;
  locationNotes: string;
  sublocation: string;
  viewpoint: string;
  onApplyDescription: (description: string) => void;
  onDismiss: () => void;
}

type DescriptionSuggestion = {
  description: string;
  explanation?: string | null;
};

export function AiSubLocationDescriptionModal({
  label,
  location,
  locationNotes,
  sublocation,
  viewpoint,
  onApplyDescription,
  onDismiss,
}: AiSubLocationDescriptionModalProps) {
  const [suggestions, setSuggestions] = useState<
    DescriptionSuggestion[] | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation =
    trpc.ai.generateSubLocationDescriptions.useMutation();

  const requestInput = {
    label,
    location,
    locationNotes: locationNotes === `` ? undefined : locationNotes,
    sublocation,
    viewpoint: viewpoint === `` ? undefined : viewpoint,
    count: 4,
  };

  const subLocationPrompt = buildSubLocationDescriptionPrompt(requestInput);

  const handleGenerate = async () => {
    setError(null);

    try {
      const result = await generateMutation.mutateAsync(requestInput);
      setSuggestions(result.suggestions);
    } catch (err) {
      console.error(`AI sublocation description generation failed:`, err);
      setError(`Unable to generate descriptions right now.`);
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
              AI sublocation description
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
            <AiPromptPreview
              description="Prompt text generated from the same builder used by AI description generation."
              sections={[
                {
                  messages: subLocationPrompt.messages,
                },
              ]}
            />
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}
