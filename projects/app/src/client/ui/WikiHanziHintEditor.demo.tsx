import { useHanziWordHint } from "@/client/hooks/useHanziWordHint";
import { HanziWordHintProvider } from "@/client/ui/HanziWordHintProvider";
import { WikiHanziHintEditor } from "@/client/ui/WikiHanziHintEditor";
import type { HanziWord } from "@/data/model";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { DemoHanziWordKnob, useDemoHanziWordKnob } from "./demo/helpers";
import { Suspense } from "./Suspense";

/**
 * Demo for WikiHanziHintEditor showing:
 * 1. Basic usage with a hanzi word
 * 2. The "See more" functionality when there are more than 3 hints
 *
 * The demo pre-populates custom hints to show the "See more" feature.
 */
export default () => {
  const { hanziWord } = useDemoHanziWordKnob(`学:learn` as HanziWord);

  return (
    <View className="gap-4">
      <DemoHanziWordKnob hanziWords={[`学:learn`, `好:good`, `看:look`]} />

      <View className="h-[600] w-[400] overflow-hidden rounded-lg border border-fg/20">
        <HanziWordHintProvider>
          <Suspense fallback={<LoadingFallback />}>
            <DemoWithPrePopulatedHints hanziWord={hanziWord} />
          </Suspense>
        </HanziWordHintProvider>
      </View>
    </View>
  );
};

/**
 * Wrapper that pre-populates custom hints for demonstration.
 */
function DemoWithPrePopulatedHints({ hanziWord }: { hanziWord: HanziWord }) {
  const { addCustomHint } = useHanziWordHint();
  const initializedRef = useRef(false);

  // Pre-populate custom hints on mount (only once)
  useEffect(() => {
    if (initializedRef.current) {
      return;
    }
    console.log(`Pre-populating custom hints for demo`);
    initializedRef.current = true;

    addCustomHint(
      hanziWord,
      `Imagine a **child** reaching up with their hand`,
      `The hand (top) reaches for knowledge while the child (bottom) absorbs it`,
    );
    addCustomHint(
      hanziWord,
      `A student's **raised hand** in class`,
      `Eager to learn, always asking questions`,
    );
    addCustomHint(
      hanziWord,
      `Knowledge flows from **fingers** to **mind**`,
      `The hand gathers, the child grows`,
    );
    addCustomHint(
      hanziWord,
      `A child **practicing** with their hands`,
      `Learning by doing, hands-on experience`,
    );
  }, [hanziWord, addCustomHint]);

  return <WikiHanziHintEditor hanziWord={hanziWord} />;
}

function LoadingFallback() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-fg-dim">Loading...</Text>
    </View>
  );
}
