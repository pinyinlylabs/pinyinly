import { trpc } from "@/client/trpc";
import { AiPronunciationHintModal } from "@/client/ui/AiPronunciationHintModal";
import { RectButton } from "@/client/ui/RectButton";
import type { HanziText, PinyinUnit } from "@/data/model";
import type { AppRouter } from "@/server/routers/_app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { useState } from "react";
import { Text, View } from "react-native";

const mockSuggestions = [
  {
    hint: `A Hero meets an Owl on the cliff ledge, and their voices slide together into one sound.`,
    explanation: `Hero = h-, Owl = -ao, Slide = tone 3 movement.`,
    confidence: 0.86,
  },
  {
    hint: `On the cliff ledge, the Hero tosses a rope to the Owl and both glide down in a long slide.`,
    explanation: `Hero + Owl + Slide in the same scene.`,
    confidence: 0.8,
  },
  {
    hint: `The Hero whispers to the Owl as they slowly slide along the ledge at dusk.`,
    explanation: `Hero (initial), Owl (final), Slide (tone).`,
    confidence: 0.72,
  },
  {
    hint: `An Owl lands beside the Hero, and the ground slides under them on the cliff ledge.`,
    explanation: `All three sound cues appear in one place.`,
    confidence: 0.64,
  },
];

const mockAiLink: TRPCLink<AppRouter> =
  () =>
  ({ op }) => {
    return observable((observer) => {
      void op;
      observer.next({
        result: {
          data: {
            suggestions: mockSuggestions,
          },
        },
      });
      observer.complete();

      return () => {};
    });
  };

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [mockAiLink],
});

export default () => {
  const [isOpen, setIsOpen] = useState(true);
  const [lastHint, setLastHint] = useState<string | null>(null);
  const [lastExplanation, setLastExplanation] = useState<string | null>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <RectButton
              variant="filled"
              onPress={() => {
                setIsOpen(true);
              }}
            >
              Open modal
            </RectButton>
            {lastHint == null ? null : (
              <View className="gap-1">
                <Text className="text-[13px] text-fg-dim">Last hint</Text>
                <Text className="text-[13px] text-fg">{lastHint}</Text>
              </View>
            )}
          </View>

          {lastExplanation == null ? null : (
            <Text className="text-[12px] text-fg-dim">
              Explanation: {lastExplanation}
            </Text>
          )}

          {isOpen ? (
            <AiPronunciationHintModal
              hanzi={`好` as HanziText}
              pinyinUnit={`hao3` as PinyinUnit}
              gloss="good"
              initial={{
                soundId: `h`,
                name: `Hero`,
                description: `a helmeted hero`,
              }}
              final={{
                soundId: `ao`,
                name: `Owl`,
                description: `a wide-eyed owl`,
              }}
              tone={{
                soundId: `3`,
                name: `Slide`,
                description: `a slow sliding board`,
              }}
              toneNumber={3}
              finalToneScene={{ description: `a wind-swept cliff ledge` }}
              onApplyHint={({ text, explanation }) => {
                setLastHint(text);
                setLastExplanation(explanation ?? null);
              }}
              onDismiss={() => {
                setIsOpen(false);
              }}
            />
          ) : null}
        </View>
      </trpc.Provider>
    </QueryClientProvider>
  );
};
