import { wikiMdxQuery } from "@/client/query";
import type { HanziText } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { View } from "react-native";
import { WikiMdxHanziMeaning } from "./WikiMdxHanziMeaning";
import { WikiTitledBox } from "./WikiTitledBox";

const collapsedMaxHeight = 320;

export function WikiAiExplanation({ hanzi }: { hanzi: HanziText }) {
  const { data: mdastRoot } = useQuery(wikiMdxQuery(hanzi));

  if (mdastRoot == null) {
    return null;
  }

  return (
    <WikiTitledBox
      title="AI explanation"
      contentTestID="wiki-ai-explanation-content"
      collapsedMaxHeight={collapsedMaxHeight}
    >
      <View className="p-4">
        <WikiMdxHanziMeaning hanzi={hanzi} />
      </View>
    </WikiTitledBox>
  );
}
