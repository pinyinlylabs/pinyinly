import { DemoHanziWordKnob } from "@/client/ui/demo/components";
import { useDemoHanziWordKnob } from "@/client/ui/demo/utils";
import { WikiHanziHintEditor } from "@/client/ui/WikiHanziHintEditor";
import type { HanziWord } from "@/data/model";
import { Text, View } from "react-native";
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
        <Suspense fallback={<LoadingFallback />}>
          <WikiHanziHintEditor hanziWord={hanziWord} />
        </Suspense>
      </View>
    </View>
  );
};

function LoadingFallback() {
  return (
    <View className="flex-1 items-center justify-center p-4">
      <Text className="text-fg-dim">Loading...</Text>
    </View>
  );
}
