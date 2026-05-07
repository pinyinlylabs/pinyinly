import { trpc } from "@/client/trpc";
import { AiMeaningHintModal } from "@/client/ui/AiMeaningHintModal";
import { RectButton } from "@/client/ui/RectButton";
import type { AppRouter } from "@/server/routers/_app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { TRPCLink } from "@trpc/client";
import { observable } from "@trpc/server/observable";
import { useState } from "react";
import { Text, View } from "react-native";

const mockSuggestions = [
  {
    hint: `A smiling woman holds a child while both stand in bright morning sunlight, making the whole scene feel ==good==.`,
    explanation: `Woman + child combine into a warm image that maps to "good".`,
    confidence: 0.89,
  },
  {
    hint: `A woman points to a child who just helped a friend, and everyone says this is what being ==good== looks like.`,
    explanation: `The two components are tied directly to the target meaning.`,
    confidence: 0.82,
  },
  {
    hint: `Picture woman and child together sharing food with a stranger; that clear image locks in the meaning ==good==.`,
    explanation: `Simple component story anchored to one meaning.`,
    confidence: 0.75,
  },
  {
    hint: `A woman and child clean up a messy room together, turning chaos into something ==good== and orderly.`,
    explanation: `Component pair forms an easy-to-replay meaning cue.`,
    confidence: 0.66,
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
                <Text className="font-sans text-[13px] text-fg-dim">
                  Last hint
                </Text>
                <Text className="font-sans text-[13px] text-fg">
                  {lastHint}
                </Text>
              </View>
            )}
          </View>

          {lastExplanation == null ? null : (
            <Text className="font-sans text-[12px] text-fg-dim">
              Explanation: {lastExplanation}
            </Text>
          )}

          {isOpen ? (
            <AiMeaningHintModal
              hanzi={`好`}
              meaning={{
                hanziWord: `好`,
                glosses: [`good`, `well`, `fine`],
              }}
              components={[
                { hanzi: `女`, meaning: `woman` },
                { hanzi: `子`, meaning: `child` },
              ]}
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
