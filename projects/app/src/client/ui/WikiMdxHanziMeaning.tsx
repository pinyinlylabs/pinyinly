import { getWikiMdxHanziMeaning } from "@/client/wiki";
import type { HanziText } from "@/data/model";
import { Text, View } from "react-native";

export function WikiMdxHanziMeaning({ hanzi }: { hanzi: HanziText }) {
  const MeaningMdx = getWikiMdxHanziMeaning(hanzi);
  // oxlint-disable-next-line react-hooks-js/static-components
  if (MeaningMdx == null) {
    return (
      <View className="px-4">
        <Text className="text-base text-fg-dim">
          This word hasn&apos;t been added to the dictionary yet. Bookmark it to
          start practicing!
        </Text>
      </View>
    );
  }
  // oxlint-disable-next-line react-hooks-js/static-components
  return <MeaningMdx />;
}
