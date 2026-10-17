import type { CharacterExampleSentence } from "@/data/model";
import { Text } from "@/client/ui/Text";
import { View } from "@/client/ui/View";

export function WikiExampleSentence({
  exampleSentence,
}: {
  exampleSentence: CharacterExampleSentence;
}) {
  return (
    <View className="gap-1">
      <Text className="font-sans text-base font-medium text-muted-fg uppercase">
        Example
      </Text>
      <View className="gap-0.5">
        <Text className="font-sans text-base leading-6 text-fg-loud">
          {exampleSentence.hanzi}
        </Text>
        <Text className="font-sans text-sm leading-5 text-muted-fg">
          {exampleSentence.pinyin}
        </Text>
        <Text className="font-sans text-sm leading-5 text-muted-fg">
          {exampleSentence.translation}
        </Text>
      </View>
    </View>
  );
}
