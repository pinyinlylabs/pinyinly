import { trpc } from "@/client/trpc";
import { buildMnemonicActorSpecPrompt } from "@/util/prompts/mnemonicActorSpec";
import type { MnemonicActorSpecType } from "@/util/prompts/mnemonicActorSpec";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AiPromptPreview } from "./AiPromptPreview";
import { PageSheetModal } from "./PageSheetModal";
import { Pylymark } from "./Pylymark";
import { RectButton } from "./RectButton";

export interface AiLeadCharacterDescriptionModalProps {
  identity: string;
  onApplyActor: (actor: MnemonicActorSpecType) => void;
  onDismiss: () => void;
}

export function AiLeadCharacterDescriptionModal({
  identity,
  onApplyActor,
  onDismiss,
}: AiLeadCharacterDescriptionModalProps) {
  const [actor, setActor] = useState<MnemonicActorSpecType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = trpc.ai.generateMnemonicActorSpec.useMutation();

  const actorPrompt = buildMnemonicActorSpecPrompt({
    actorName: identity,
  });

  const handleGenerate = async () => {
    setError(null);
    try {
      const result = await generateMutation.mutateAsync({
        identity,
      });
      setActor(result);
    } catch (err) {
      console.error(`AI mnemonic actor spec generation failed:`, err);
      setError(`Unable to generate actor spec right now.`);
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
              AI mnemonic actor
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
              description="Prompt text generated from the same builder used by AI actor spec generation."
              sections={[
                {
                  messages: actorPrompt.messages,
                },
              ]}
            />

            {error == null ? null : (
              <Text className="font-sans text-[14px] text-[crimson]">
                {error}
              </Text>
            )}

            <View className="gap-2">
              <Text className="pyly-body-subheading">Actor spec</Text>
              {isGenerating ? (
                <Text className="font-sans text-[14px] text-fg-dim">
                  Generating actor spec...
                </Text>
              ) : null}
              {actor == null ? (
                <Text className="font-sans text-[14px] text-fg-dim">
                  Press Generate to create a mnemonic actor spec.
                </Text>
              ) : (
                <View className="gap-3 rounded-lg border border-fg-bg10 bg-fg-bg5 p-3">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="pyly-body-subheading text-fg-loud">
                      {actor.nickname}
                    </Text>
                    <RectButton
                      variant="bare"
                      onPress={() => {
                        onApplyActor(actor);
                        dismiss();
                      }}
                    >
                      Use actor
                    </RectButton>
                  </View>
                  <Text className="pyly-body-caption text-fg-dim">
                    Identity: {actor.identity}
                  </Text>
                  <Text className="pyly-body">
                    <Pylymark source={actor.summary} />
                  </Text>
                  <Text className="font-sans text-[13px] text-fg-dim">
                    Anchor: {actor.identityAnchor}
                  </Text>
                  <Text className="font-sans text-[13px] text-fg-dim">
                    Obsession: {actor.obsession}
                  </Text>
                  <Text className="font-sans text-[13px] text-fg-dim">
                    Signature ability: {actor.signatureAbility}
                  </Text>
                  <Text className="font-sans text-[13px] text-fg-dim">
                    Weakness: {actor.weakness}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      )}
    </PageSheetModal>
  );
}
