import { wikiPayloadQuery } from "@/client/query";
import type { HanziText } from "@/data/model";
import { useQuery } from "@tanstack/react-query";
import { View } from "@/client/ui/View";
import { MdastContent } from "./MdastContent";
import { WikiTitledBox } from "./WikiTitledBox";

const collapsedMaxHeight = 320;

export function WikiAiExplanation({ hanzi }: { hanzi: HanziText }) {
  const { data: wikiPayload } = useQuery(wikiPayloadQuery(hanzi));

  if (wikiPayload?.mdast == null) {
    return null;
  }

  return (
    <WikiTitledBox
      title="AI explanation"
      contentTestID="wiki-ai-explanation-content"
      collapsedMaxHeight={collapsedMaxHeight}
    >
      <View className="p-4">
        <MdastContent root={wikiPayload.mdast} />
      </View>
    </WikiTitledBox>
  );
}
