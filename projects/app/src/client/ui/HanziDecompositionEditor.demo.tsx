import { DemoHanziKnob } from "@/client/ui/demo/components";
import { useDemoHanziKnob } from "@/client/ui/demo/utils";
import type { HanziText } from "@/data/model";
import { View } from "react-native";
import { HanziDecompositionEditor } from "./HanziDecompositionEditor";

export default () => {
  const { hanzi } = useDemoHanziKnob(`学` as HanziText);

  return (
    <View className="max-w-[520px] gap-4">
      <DemoHanziKnob hanzis={[`学`, `看`, `说`] as HanziText[]} />
      <HanziDecompositionEditor hanzi={hanzi} />
    </View>
  );
};
