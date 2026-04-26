import { getWikiMdxHanziMeaning } from "@/client/wiki";
import type { HanziText } from "@/data/model";
import { View } from "react-native";
import { WikiMdxHanziMeaning } from "./WikiMdxHanziMeaning";
import { WikiTitledBox } from "./WikiTitledBox";

const collapsedMaxHeight = 320;

export function WikiAiExplanation({ hanzi }: { hanzi: HanziText }) {
  const hasMeaningMdx = getWikiMdxHanziMeaning(hanzi) != null;

  if (!hasMeaningMdx) {
    return null;
  }

  return (
    <WikiTitledBox
      title="AI explanation"
      contentTestID="wiki-ai-explanation-content"
      expandableOverflow={{
        collapsedMaxHeight,
      }}
    >
      <View className="p-4">
        <WikiMdxHanziMeaning hanzi={hanzi} />
      </View>
    </WikiTitledBox>
  );
}
